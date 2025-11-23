import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { joinLiveLecture, leaveLiveLecture } from '../services/liveLectures';
import './LiveLectureViewer.css';
import './LiveLectureViewer.css';

interface LiveLectureViewerProps {
  lectureId: number;
  userId: number;
  userName: string;
  userRole: string;
  onClose: () => void;
}

interface ChatMessage {
  userId: number;
  userName: string;
  message: string;
  timestamp: string;
}

const LiveLectureViewer: React.FC<LiveLectureViewerProps> = ({
  lectureId,
  userId,
  userName,
  userRole,
  onClose,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState<{ [key: string]: Peer.Instance }>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socketConnection = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000', {
      auth: {
        token: localStorage.getItem('auth:token'),
      },
    });

    setSocket(socketConnection);

    // Join the lecture room
    socketConnection.emit('join-live-lecture', {
      lectureId,
      userId,
      userType: userRole,
    });

    // Join lecture via API
    joinLiveLecture(lectureId).catch(console.error);

    // Socket event listeners
    socketConnection.on('lecture-joined', (data) => {
      console.log('Joined lecture:', data);
      setIsConnected(true);
      initializeMedia();
    });

    socketConnection.on('lecture-left', (data) => {
      console.log('Left lecture:', data);
      setIsConnected(false);
    });

    socketConnection.on('lecture-started', (data) => {
      console.log('Lecture started:', data);
    });

    socketConnection.on('lecture-ended', (data) => {
      console.log('Lecture ended:', data);
      handleLeaveLecture();
    });

    socketConnection.on('lecture-chat-message', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    socketConnection.on('lecture-muted', (data) => {
      if (data.participantId === userId) {
        setIsMuted(true);
        if (streamRef.current) {
          streamRef.current.getAudioTracks().forEach(track => {
            track.enabled = false;
          });
        }
      }
    });

    socketConnection.on('lecture-unmuted', (data) => {
      if (data.participantId === userId) {
        setIsMuted(false);
        if (streamRef.current) {
          streamRef.current.getAudioTracks().forEach(track => {
            track.enabled = true;
          });
        }
      }
    });

    // WebRTC signaling
    socketConnection.on('webrtc-offer', handleWebRTCOffer);
    socketConnection.on('webrtc-answer', handleWebRTCAnswer);
    socketConnection.on('webrtc-ice-candidate', handleWebRTCIceCandidate);

    return () => {
      socketConnection.disconnect();
      cleanupMedia();
    };
  }, [lectureId, userId, userRole]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // For students, we might not need to broadcast immediately
      // Teachers will handle broadcasting
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const handleWebRTCOffer = (data: any) => {
    // Handle incoming WebRTC offer
    console.log('Received WebRTC offer:', data);
  };

  const handleWebRTCAnswer = (data: any) => {
    // Handle incoming WebRTC answer
    console.log('Received WebRTC answer:', data);
  };

  const handleWebRTCIceCandidate = (data: any) => {
    // Handle incoming ICE candidate
    console.log('Received WebRTC ICE candidate:', data);
  };

  const handleSendMessage = () => {
    if (!socket || !newMessage.trim()) return;

    socket.emit('lecture-chat-message', {
      lectureId,
      message: newMessage,
      userId,
      userName,
    });

    setNewMessage('');
  };

  const handleToggleMute = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!audioTracks[0]?.enabled);
    }
  };

  const handleToggleVideo = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!videoTracks[0]?.enabled);
    }
  };

  const handleLeaveLecture = async () => {
    try {
      await leaveLiveLecture(lectureId);
      if (socket) {
        socket.emit('leave-live-lecture', { lectureId, userId });
      }
      cleanupMedia();
      onClose();
    } catch (error) {
      console.error('Error leaving lecture:', error);
    }
  };

  const cleanupMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clean up peers
    Object.values(peers).forEach(peer => peer.destroy());
    setPeers({});
  };

  return (
    <div className="live-lecture-viewer">
      <div className="lecture-header">
        <h2>Live Lecture</h2>
        <button onClick={handleLeaveLecture} className="leave-button">
          Leave Lecture
        </button>
      </div>

      <div className="lecture-content">
        <div className="video-section">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="local-video"
          />
          <div className="video-controls">
            <button onClick={handleToggleMute} className={isMuted ? 'muted' : ''}>
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button onClick={handleToggleVideo} className={isVideoOff ? 'video-off' : ''}>
              {isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
            </button>
          </div>
        </div>

        <div className="chat-section">
          <div className="chat-messages">
            {chatMessages.map((msg, index) => (
              <div key={index} className="chat-message">
                <strong>{msg.userName}:</strong> {msg.message}
                <span className="timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LiveLectureViewer;