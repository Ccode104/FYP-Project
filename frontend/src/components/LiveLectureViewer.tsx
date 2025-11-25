import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { joinLiveLecture, leaveLiveLecture } from '../services/liveLectures';
import Whiteboard from './Whiteboard';
import './LiveLectureViewer.css';

interface LiveLectureViewerProps {
  lectureId: number;
  userId: number;
  userName: string;
  userRole: string;
  lectureTitle?: string;
  lectureDescription?: string;
  onClose: () => void;
}

interface ChatMessage {
  userId: number;
  userName: string;
  message: string;
  timestamp: string;
}

interface Participant {
  userId: number;
  userName: string;
  role: string;
  isHandRaised?: boolean;
  isSharingScreen?: boolean;
}

interface Reaction {
  id: string;
  userId: number;
  emoji: string;
}

interface WebRTCData {
  fromUserId: number;
  toUserId: number;
  offer?: unknown;
  answer?: unknown;
  candidate?: unknown;
}

const LiveLectureViewer: React.FC<LiveLectureViewerProps> = ({
  lectureId,
  userId,
  userName,
  userRole,
  lectureTitle,
  onClose,
}) => {
  // Connection State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  
  // Media State
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Peers & Participants
  const [peers, setPeers] = useState<{ [key: string]: Peer.Instance }>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [mainVideoPeerId, setMainVideoPeerId] = useState<string | null>(null);
  
  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [key: string]: Peer.Instance }>({});
  const videoElementsRef = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Initialize Socket & Media
  useEffect(() => {
    const socketConnection = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000', {
      auth: { token: localStorage.getItem('auth:token') },
    });

    setSocket(socketConnection);

    socketConnection.emit('join-live-lecture', {
      lectureId,
      userId,
      userType: userRole,
    });

    joinLiveLecture(lectureId).catch(console.error);

    // Socket Event Listeners
    socketConnection.on('lecture-joined', () => {
      setConnectionStatus('Connected');
      initializeMedia();
    });

    socketConnection.on('participant-joined', (data) => {
      setParticipants(prev => {
        if (prev.find(p => p.userId === data.userId)) return prev;
        return [...prev, { ...data, isHandRaised: false }];
      });
      
      if (data.userId !== userId) {
        const shouldInitiate = userId < data.userId;
        addPeer(data.userId.toString(), shouldInitiate, streamRef.current);
      }
    });

    socketConnection.on('participant-left', (data) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
      removePeer(data.userId.toString());
      if (mainVideoPeerId === data.userId.toString()) {
        setMainVideoPeerId(null);
      }
    });

    // WebRTC Signaling
    socketConnection.on('webrtc-offer', handleWebRTCOffer);
    socketConnection.on('webrtc-answer', handleWebRTCAnswer);
    socketConnection.on('webrtc-ice-candidate', handleWebRTCIceCandidate);

    // Features
    socketConnection.on('lecture-chat-message', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    socketConnection.on('hand-raised-update', (data) => {
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId ? { ...p, isHandRaised: data.isRaised } : p
      ));
    });

    socketConnection.on('reaction-received', (data) => {
      const reactionId = Date.now().toString() + Math.random();
      setReactions(prev => [...prev, { id: reactionId, userId: data.userId, emoji: data.reaction }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== reactionId));
      }, 2000);
    });

    socketConnection.on('screen-share-update', (data) => {
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId ? { ...p, isSharingScreen: data.isSharing } : p
      ));
      if (data.isSharing) {
        setMainVideoPeerId(data.userId.toString());
      }
    });

    return () => {
      socketConnection.disconnect();
      cleanupMedia();
    };
  }, [lectureId, userId, userRole]);

  // Media Initialization
  const initializeMedia = async () => {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = userStream;
      
      // Default to muted/video off
      userStream.getAudioTracks().forEach(track => track.enabled = false);
      userStream.getVideoTracks().forEach(track => track.enabled = false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = userStream;
      }
    } catch (error) {
      console.error('Error accessing media:', error);
      alert('Could not access camera/microphone. You can still join as a viewer.');
    }
  };

  // Peer Connection Logic
  const createPeer = (peerId: string, initiator: boolean, stream: MediaStream | null) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream: stream || undefined,
    });

    peer.on('signal', (signal) => {
      if (!socket) return;
      const type = signal.type === 'offer' ? 'webrtc-offer' : 
                   signal.type === 'answer' ? 'webrtc-answer' : 'webrtc-ice-candidate';
      
      const payload = signal.type === 'offer' ? { offer: signal } :
                      signal.type === 'answer' ? { answer: signal } : { candidate: signal };

      socket.emit(type, {
        lectureId,
        fromUserId: userId,
        toUserId: peerId,
        ...payload
      });
    });

    peer.on('stream', (remoteStream) => {
      if (videoElementsRef.current[peerId]) {
        videoElementsRef.current[peerId]!.srcObject = remoteStream;
      }
      if (mainVideoPeerId === peerId && mainVideoRef.current) {
        mainVideoRef.current.srcObject = remoteStream;
      }
    });

    return peer;
  };

  const addPeer = (peerId: string, initiator: boolean, stream: MediaStream | null) => {
    if (peersRef.current[peerId]) return;
    const peer = createPeer(peerId, initiator, stream);
    peersRef.current[peerId] = peer;
    setPeers(prev => ({ ...prev, [peerId]: peer }));
  };

  const removePeer = (peerId: string) => {
    if (peersRef.current[peerId]) {
      peersRef.current[peerId].destroy();
      delete peersRef.current[peerId];
      setPeers(prev => {
        const newPeers = { ...prev };
        delete newPeers[peerId];
        return newPeers;
      });
    }
  };

  // WebRTC Handlers
  const handleWebRTCOffer = (data: WebRTCData) => {
    if (data.toUserId !== userId) return;
    const peer = createPeer(data.fromUserId.toString(), false, streamRef.current);
    peersRef.current[data.fromUserId] = peer;
    setPeers(prev => ({ ...prev, [data.fromUserId]: peer }));
    if (data.offer) peer.signal(data.offer as any);
  };

  const handleWebRTCAnswer = (data: WebRTCData) => {
    if (data.toUserId !== userId) return;
    const peer = peersRef.current[data.fromUserId];
    if (peer && data.answer) peer.signal(data.answer as any);
  };

  const handleWebRTCIceCandidate = (data: WebRTCData) => {
    if (data.toUserId !== userId) return;
    const peer = peersRef.current[data.fromUserId];
    if (peer && data.candidate) peer.signal(data.candidate as any);
  };

  // Feature Handlers
  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop sharing
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const videoTrack = userStream.getVideoTracks()[0];
      
      // Replace track in all peers
      Object.values(peersRef.current).forEach(peer => {
        const oldTrack = streamRef.current?.getVideoTracks()[0];
        if (oldTrack) peer.replaceTrack(oldTrack, videoTrack, streamRef.current!);
      });

      streamRef.current = userStream;
      if (videoRef.current) videoRef.current.srcObject = userStream;
      
      setIsScreenSharing(false);
      socket?.emit('screen-share-status', { lectureId, userId, isSharing: false });
    } else {
      // Start sharing
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];

        screenTrack.onended = () => toggleScreenShare(); // Handle "Stop Sharing" from browser UI

        Object.values(peersRef.current).forEach(peer => {
          const oldTrack = streamRef.current?.getVideoTracks()[0];
          if (oldTrack) peer.replaceTrack(oldTrack, screenTrack, streamRef.current!);
        });

        streamRef.current = displayStream;
        if (videoRef.current) videoRef.current.srcObject = displayStream;

        setIsScreenSharing(true);
        socket?.emit('screen-share-status', { lectureId, userId, isSharing: true });
      } catch (err) {
        console.error('Error sharing screen:', err);
      }
    }
  };

  const toggleHandRaise = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    socket?.emit('raise-hand', { lectureId, userId, userName, isRaised: newState });
  };

  const sendReaction = (emoji: string) => {
    socket?.emit('send-reaction', { lectureId, userId, reaction: emoji });
    setShowReactions(false);
    
    // Show local reaction
    const reactionId = Date.now().toString();
    setReactions(prev => [...prev, { id: reactionId, userId, emoji }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reactionId));
    }, 2000);
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    socket?.emit('lecture-chat-message', { lectureId, message: newMessage, userId, userName });
    setNewMessage('');
  };

  const handleLeave = async () => {
    await leaveLiveLecture(lectureId);
    socket?.emit('leave-live-lecture', { lectureId, userId });
    cleanupMedia();
    onClose();
  };

  const cleanupMedia = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    Object.values(peersRef.current).forEach(peer => peer.destroy());
  };

  return (
    <div className="live-lecture-viewer">
      {/* Header */}
      <div className="meet-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h3 className="meet-title">{lectureTitle || 'Live Lecture'}</h3>
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            REC
          </div>
        </div>
        <div className="connection-status">{connectionStatus}</div>
      </div>

      {/* Main Content */}
      <div className="meet-main">
        <div className={`video-grid ${isChatOpen ? 'with-sidebar' : ''}`}>
          {/* Main Video (Spotlight) */}
          {mainVideoPeerId && (
            <div className="video-tile main">
              <video ref={mainVideoRef} autoPlay playsInline />
              <div className="participant-label">
                {participants.find(p => p.userId.toString() === mainVideoPeerId)?.userName}
              </div>
            </div>
          )}

          {/* Self Video */}
          <div className={`video-tile ${mainVideoPeerId ? 'grid-item' : 'main'}`}>
            <video ref={videoRef} autoPlay muted playsInline />
            <div className="participant-label">
              {userName} (You)
              {isMuted && <span className="audio-indicator">🔇</span>}
            </div>
            {isHandRaised && (
              <div className="hand-raised-badge">✋ Raised</div>
            )}
          </div>

          {/* Other Participants */}
          {Object.keys(peers).filter(id => id !== mainVideoPeerId).map(peerId => {
            const participant = participants.find(p => p.userId.toString() === peerId);
            return (
              <div key={peerId} className="video-tile grid-item" onClick={() => setMainVideoPeerId(peerId)}>
                <video
                  autoPlay
                  playsInline
                  ref={el => {
                    videoElementsRef.current[peerId] = el;
                    if (el && peers[peerId]?.streams?.[0]) {
                      el.srcObject = peers[peerId].streams[0];
                    }
                  }}
                />
                <div className="participant-label">
                  {participant?.userName || `User ${peerId}`}
                </div>
                {participant?.isHandRaised && (
                  <div className="hand-raised-badge">✋ Raised</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className={`meet-sidebar ${isChatOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>In-call messages</h3>
            <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
          <div className="sidebar-content">
            {chatMessages.map((msg, i) => (
              <div key={i} className="chat-message">
                <div className="message-header">
                  <span className="message-sender">{msg.userName}</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="message-content">{msg.message}</div>
              </div>
            ))}
          </div>
          <div className="chat-input-area">
            <input
              className="chat-input"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              placeholder="Send a message..."
            />
            <button onClick={sendMessage} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>➤</button>
          </div>
        </div>
      </div>

      {/* Whiteboard Overlay */}
      {isWhiteboardOpen && (
        <Whiteboard
          socket={socket}
          lectureId={lectureId}
          isReadOnly={false}
          onClose={() => setIsWhiteboardOpen(false)}
        />
      )}

      {/* Reactions Overlay */}
      {reactions.map(reaction => (
        <div key={reaction.id} className="reaction-floater" style={{ left: `${Math.random() * 80 + 10}%` }}>
          {reaction.emoji}
        </div>
      ))}

      {/* Controls Bar */}
      <div className="meet-controls">
        <div className="controls-left">
          <div className="time-display">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="controls-center">
          <button className={`control-btn ${isMuted ? 'muted' : ''}`} onClick={toggleMute} title="Toggle Microphone">
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button className={`control-btn ${isVideoOff ? 'video-off' : ''}`} onClick={toggleVideo} title="Toggle Camera">
            {isVideoOff ? '📷' : '📹'}
          </button>
          <button className={`control-btn ${isHandRaised ? 'active' : ''}`} onClick={toggleHandRaise} title="Raise Hand">
            ✋
          </button>
          <button className={`control-btn ${isScreenSharing ? 'active' : ''}`} onClick={toggleScreenShare} title="Share Screen">
            🖥️
          </button>
          <button className="control-btn" onClick={() => setShowReactions(!showReactions)} title="Reactions">
            😊
          </button>
          <button className={`control-btn ${isWhiteboardOpen ? 'active' : ''}`} onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)} title="Whiteboard">
            ✏️
          </button>
          <button className="control-btn danger" onClick={handleLeave} title="Leave Call">
            📞
          </button>
        </div>

        <div className="controls-right">
          <button className={`control-btn ${isChatOpen ? 'active' : ''}`} onClick={() => setIsChatOpen(!isChatOpen)} title="Chat">
            💬
          </button>
        </div>
      </div>

      {/* Reaction Picker */}
      {showReactions && (
        <div className="reaction-bar">
          {['👍', '❤️', '👏', '😂', '😮', '🎉'].map(emoji => (
            <button key={emoji} className="reaction-btn" onClick={() => sendReaction(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveLectureViewer;