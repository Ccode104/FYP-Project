import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { motion, AnimatePresence } from 'framer-motion';
import { joinLiveLecture, leaveLiveLecture, getLiveLectureParticipants } from '../../services/liveLectures';
import { VideoGrid } from './VideoGrid';
import { ParticipantList } from './ParticipantList';
import { ControlBar } from './ControlBar';
import { ChatPanel } from './ChatPanel';
import { RoomHeader } from './RoomHeader';

interface LiveLectureRoomProps {
  lectureId: number;
  userId: number;
  userName: string;
  userRole: string;
  lectureTitle?: string;
  lectureDescription?: string;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  userId: number;
  userName: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
  role?: 'student' | 'teacher' | 'ta';
}

interface Participant {
  id: number;
  userId: number;
  userName: string;
  role: 'student' | 'teacher' | 'ta';
  isOnline: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised?: boolean;
  isSpeaking?: boolean;
  isScreenSharing?: boolean;
  joinedAt: string;
}

interface ConnectionStats {
  quality: 'connecting' | 'excellent' | 'good' | 'poor' | 'disconnected';
  latency?: number;
  packetLoss?: number;
}

interface SocketData {
  id?: number;
  userId: number;
  userName?: string;
  name?: string;
  role?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isHandRaised?: boolean;
  isScreenSharing?: boolean;
  joinedAt?: string;
  message?: string;
  timestamp?: string;
  participantId?: number;
  reaction?: string;
  isSharing?: boolean;
}

interface ParticipantData extends SocketData {
  user_id?: number;
  name?: string;
  user_name?: string;
  role?: string;
  is_muted?: boolean;
  is_video_off?: boolean;
  is_hand_raised?: boolean;
  is_screen_sharing?: boolean;
  joined_at?: string;
}

const LiveLectureRoom: React.FC<LiveLectureRoomProps> = ({
  lectureId,
  userId,
  userName,
  userRole,
  lectureTitle,
  lectureDescription,
  onClose,
}) => {
  // Core state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({ quality: 'connecting' });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [lectureDuration, setLectureDuration] = useState('00:00');

  // UI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isPollsOpen, setIsPollsOpen] = useState(false);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<number | null>(null);

  // Media state
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenSharingUserId, setScreenSharingUserId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Permission state
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<{ [key: string]: Peer.Instance }>({});
  const streamRef = useRef<MediaStream | null>(null);
  const videoElementsRef = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date>(new Date());

  // Debug connection status
  useEffect(() => {
    const status = getConnectionStatus();
    console.log('Connection status changed:', {
      isConnected,
      connectionQuality: connectionStats.quality,
      status,
      timestamp: new Date().toISOString()
    });
  }, [isConnected, connectionStats.quality]);

  // Initialize socket connection and media
  useEffect(() => {
    initializeConnection();
    startDurationTimer();

    return () => {
      cleanup();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [lectureId, userId]);

  const startDurationTimer = () => {
    startTimeRef.current = new Date();
    durationIntervalRef.current = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      if (hours > 0) {
        setLectureDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setLectureDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);
  };

  const fetchCurrentParticipants = async () => {
    try {
      const response = await getLiveLectureParticipants(lectureId);
      const currentParticipants = response.participants || [];

      const formattedParticipants: Participant[] = currentParticipants.map((p: any) => ({
        id: p.id || p.user_id,
        userId: p.user_id || p.id,
        userName: p.name || p.user_name || `User ${p.user_id || p.id}`,
        role: p.role || 'student',
        isOnline: true,
        isMuted: p.is_muted !== undefined ? p.is_muted : true,
        isVideoOff: p.is_video_off !== undefined ? p.is_video_off : true,
        isHandRaised: p.is_hand_raised || false,
        isSpeaking: false,
        isScreenSharing: p.is_screen_sharing || false,
        joinedAt: p.joined_at || new Date().toISOString(),
      }));

      setParticipants(formattedParticipants);

      // Create peers for existing participants (excluding current user)
      formattedParticipants.forEach(participant => {
        if (participant.userId !== userId) {
          setTimeout(() => addPeer(participant.userId.toString()), 200);
        }
      });
    } catch (error) {
      console.error('Failed to fetch current participants:', error);
      setConnectionStats({ quality: 'poor' });
    }
  };

  const initializeConnection = async () => {
    try {
      console.log('Attempting to connect to backend...');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
      console.log('Backend URL:', backendUrl);

      const authToken = localStorage.getItem('auth:token');
      console.log('Auth token present:', !!authToken);

      if (!authToken) {
        console.error('No auth token found - user may not be logged in');
        setConnectionStats({ quality: 'disconnected' });
        return;
      }

      const socketConnection = io(backendUrl, {
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!socketConnection.connected) {
          console.error('Socket connection timeout - backend server may not be running');
          setConnectionStats({ quality: 'disconnected' });
        }
      }, 5000);

      socketConnection.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log('Socket connected successfully');
      });

      socketConnection.on('connect_error', (error) => {
        clearTimeout(connectionTimeout);
        console.error('Socket connection error:', error);
        setConnectionStats({ quality: 'disconnected' });
      });

      socketConnection.emit('join-live-lecture', { lectureId, userId, userType: userRole });

      console.log('Calling joinLiveLecture API...');
      await joinLiveLecture(lectureId);
      console.log('joinLiveLecture API call successful');

      console.log('Calling fetchCurrentParticipants API...');
      await fetchCurrentParticipants();
      console.log('fetchCurrentParticipants API call successful');

      console.log('Initializing media...');
      await initializeMedia();
      console.log('Media initialization successful');
      setupSocketListeners(socketConnection);

      setSocket(socketConnection);
      socketRef.current = socketConnection;

    } catch (error) {
      console.error('Failed to initialize connection:', error);
      setConnectionStats({ quality: 'disconnected' });
    }
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      stream.getAudioTracks().forEach(track => { track.enabled = false; });
      stream.getVideoTracks().forEach(track => { track.enabled = false; });

      streamRef.current = stream;
      setCameraPermission('granted');
      setMicrophonePermission('granted');
      setConnectionStats({ quality: 'excellent' });

      // Add stream to existing peer connections so remote participants can see our video
      Object.values(peersRef.current).forEach(peer => {
        if (!peer.destroyed && peer.connected) {
          try {
            peer.addStream(stream);
          } catch (error) {
            // Stream might already be added, or peer not ready - ignore
            console.log('Stream already added to peer or peer not ready');
          }
        }
      });

    } catch (error: any) {
      // Handle permission denied errors gracefully
      if (error.name === 'NotAllowedError') {
        // Check which permissions were denied
        try {
          await navigator.permissions.query({ name: 'camera' as PermissionName });
          setCameraPermission('denied');
        } catch {
          setCameraPermission('denied');
        }

        try {
          await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicrophonePermission('denied');
        } catch {
          setMicrophonePermission('denied');
        }

        setConnectionStats({ quality: 'poor' });
        return; // Don't try fallback for permission denied
      }

      // Try fallback for other errors
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        fallbackStream.getAudioTracks().forEach(track => { track.enabled = false; });
        fallbackStream.getVideoTracks().forEach(track => { track.enabled = false; });
        streamRef.current = fallbackStream;
        setCameraPermission('granted');
        setMicrophonePermission('granted');
        setConnectionStats({ quality: 'good' });

        // Add stream to existing peer connections
        Object.values(peersRef.current).forEach(peer => {
          if (!peer.destroyed && peer.connected) {
            try {
              peer.addStream(fallbackStream);
            } catch (error) {
              console.log('Stream already added to peer or peer not ready');
            }
          }
        });
      } catch (fallbackError: any) {
        if (fallbackError.name === 'NotAllowedError') {
          setCameraPermission('denied');
          setMicrophonePermission('denied');
        }
        setConnectionStats({ quality: 'poor' });
      }
    }
  };

  const setupSocketListeners = (socketConnection: Socket) => {
    socketConnection.on('connect', () => {
      console.log('Socket connected event fired');
      setIsConnected(true);
      setConnectionStats({ quality: 'excellent' });
    });

    socketConnection.on('disconnect', () => {
      console.log('Socket disconnected event fired');
      setIsConnected(false);
      setConnectionStats({ quality: 'disconnected' });
    });

    socketConnection.on('lecture-joined', handleLectureJoined);
    socketConnection.on('lecture-left', handleLectureLeft);
    socketConnection.on('lecture-ended', handleLectureEnded);
    socketConnection.on('participant-joined', handleParticipantJoined);
    socketConnection.on('participant-left', handleParticipantLeft);
    socketConnection.on('lecture-chat-message', handleChatMessage);
    socketConnection.on('lecture-muted', handleRemoteMute);
    socketConnection.on('lecture-unmuted', handleRemoteUnmute);
    socketConnection.on('reaction-received', handleReactionReceived);
    socketConnection.on('screen-share-update', handleScreenShareUpdate);
  };

  const handleLectureJoined = useCallback(() => {
    setIsConnected(true);
  }, []);

  const handleLectureLeft = useCallback(() => {
    setIsConnected(false);
  }, []);

  const handleLectureEnded = useCallback(() => {
    cleanup();
    onClose();
  }, [onClose]);

  const handleParticipantJoined = useCallback((data: any) => {
    const participantData: Participant = {
      id: data.id || data.userId,
      userId: data.userId,
      userName: data.userName || data.name || `User ${data.userId}`,
      role: data.role || 'student',
      isOnline: true,
      isMuted: data.isMuted !== undefined ? data.isMuted : true,
      isVideoOff: data.isVideoOff !== undefined ? data.isVideoOff : true,
      isHandRaised: data.isHandRaised || false,
      isSpeaking: false,
      isScreenSharing: data.isScreenSharing || false,
      joinedAt: data.joinedAt || new Date().toISOString(),
    };

    setParticipants(prev => {
      const filtered = prev.filter(p => p.userId !== data.userId);
      return [...filtered, participantData];
    });

    if (data.userId !== userId) {
      setTimeout(() => addPeer(data.userId.toString()), 100);
    }
  }, [userId]);

  const handleParticipantLeft = useCallback((data: any) => {
    setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    removePeer(data.userId.toString());
  }, []);

  const handleChatMessage = useCallback((data: any) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      userId: data.userId,
      userName: data.userName,
      message: data.message,
      timestamp: data.timestamp,
      role: data.role,
    }]);
  }, []);

  const handleRemoteMute = useCallback((data: any) => {
    if (data.participantId === userId) {
      setIsMuted(true);
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => { track.enabled = false; });
      }
    }
  }, [userId]);

  const handleRemoteUnmute = useCallback((data: any) => {
    if (data.participantId === userId) {
      setIsMuted(false);
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => { track.enabled = true; });
      }
    }
  }, [userId]);


  const handleReactionReceived = useCallback((data: any) => {
    // TODO: Implement reaction animations
    console.log('Reaction received:', data.reaction);
  }, []);

  const handleScreenShareUpdate = useCallback((data: any) => {
    setParticipants(prev => prev.map(p => 
      p.userId === data.userId ? { ...p, isScreenSharing: data.isSharing } : p
    ));
    if (data.isSharing) {
      setScreenSharingUserId(data.userId);
    } else if (screenSharingUserId === data.userId) {
      setScreenSharingUserId(null);
    }
  }, [screenSharingUserId]);

  const addPeer = useCallback((peerId: string) => {
    if (peersRef.current[peerId] && !peersRef.current[peerId].destroyed) {
      return;
    }

    if (peersRef.current[peerId] && peersRef.current[peerId].destroyed) {
      delete peersRef.current[peerId];
    }

    try {
      const peer = new Peer({
        initiator: userId < parseInt(peerId),
        trickle: false,
        stream: streamRef.current || undefined,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on('signal', (signal) => {
        if (socket && socket.connected) {
          socket.emit('webrtc-signal', {
            lectureId,
            signal,
            fromUserId: userId,
            toUserId: peerId,
          });
        }
      });

      peer.on('stream', (remoteStream) => {
        if (videoElementsRef.current[peerId]) {
          videoElementsRef.current[peerId]!.srcObject = remoteStream;
        }
      });

      peer.on('connect', () => {
        console.log(`Peer ${peerId} connected successfully`);
      });

      peer.on('error', (err) => {
        console.error(`Peer ${peerId} error:`, err);
        removePeer(peerId);
      });

      peer.on('close', () => {
        console.log(`Peer ${peerId} connection closed`);
        removePeer(peerId);
      });

      peersRef.current[peerId] = peer;
    } catch (error) {
      console.error(`Failed to create peer for ${peerId}:`, error);
    }
  }, [userId, socket, lectureId]);

  const removePeer = useCallback((peerId: string) => {
    if (peersRef.current[peerId]) {
      peersRef.current[peerId].destroy();
      delete peersRef.current[peerId];
    }
  }, []);

  // Control handlers
  const handleToggleMute = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      const newMutedState = !isMuted;
      audioTracks.forEach(track => { track.enabled = !newMutedState; });
      setIsMuted(newMutedState);

      socket?.emit('toggle-mute', { lectureId, userId, isMuted: newMutedState });
    }
  }, [isMuted, socket, lectureId, userId]);

  const handleToggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      const newVideoOffState = !isVideoOff;
      videoTracks.forEach(track => { track.enabled = !newVideoOffState; });
      setIsVideoOff(newVideoOffState);

      // Update local participant state immediately for better UX
      setParticipants(prev => prev.map(p =>
        p.userId === userId ? { ...p, isVideoOff: newVideoOffState } : p
      ));

      socket?.emit('toggle-video', { lectureId, userId, isVideoOff: newVideoOffState });
    }
  }, [isVideoOff, socket, lectureId, userId]);

  const handleToggleScreenShare = useCallback(async () => {
    const newSharingState = !isScreenSharing;
    setIsScreenSharing(newSharingState);
    setScreenSharingUserId(newSharingState ? userId : null);
    socket?.emit('screen-share-status', { lectureId, userId, isSharing: newSharingState });
  }, [isScreenSharing, socket, lectureId, userId]);

  const handleRaiseHand = useCallback(() => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    socket?.emit('raise-hand', { lectureId, userId, userName, isRaised: newState });
  }, [isHandRaised, socket, lectureId, userId, userName]);

  const handleToggleRecording = useCallback(() => {
    setIsRecording(!isRecording);
    socket?.emit('toggle-recording', { lectureId, userId, isRecording: !isRecording });
  }, [isRecording, socket, lectureId, userId]);

  const handleSendMessage = useCallback(() => {
    if (!socket || !newMessage.trim()) return;

    socket.emit('lecture-chat-message', {
      lectureId,
      message: newMessage.trim(),
      userId,
      userName,
      role: userRole,
    });

    setNewMessage('');
  }, [socket, newMessage, lectureId, userId, userName, userRole]);

  const handleLeaveLecture = useCallback(async () => {
    try {
      await leaveLiveLecture(lectureId);
      socket?.emit('leave-live-lecture', { lectureId, userId });
      cleanup();
      onClose();
    } catch (error) {
      console.error('Error leaving lecture:', error);
    }
  }, [socket, lectureId, userId, onClose]);

  const handleParticipantClick = useCallback((participant: Participant) => {
    setPinnedParticipantId(prev => prev === participant.userId ? null : participant.userId);
  }, []);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    Object.values(peersRef.current).forEach(peer => peer.destroy());
    peersRef.current = {};

    socket?.disconnect();
    setSocket(null);
  }, [socket]);

  const getConnectionStatus = (): 'connecting' | 'connected' | 'disconnected' => {
    // If socket is connected and we have good connection quality, show connected
    if (isConnected && (connectionStats.quality === 'excellent' || connectionStats.quality === 'good')) {
      return 'connected';
    }
    // If socket is connected but connection quality is poor, still show connected but with quality indicator
    if (isConnected) {
      return 'connected';
    }
    // If we're still trying to connect (socket not connected but quality is connecting), show connecting
    if (!isConnected && connectionStats.quality === 'connecting') {
      return 'connecting';
    }
    // Otherwise, show disconnected
    return 'disconnected';
  };

  return (
    <motion.div 
      className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Room Header */}
      <RoomHeader
        title={lectureTitle || 'Live Lecture'}
        description={lectureDescription}
        connectionStatus={getConnectionStatus()}
        participantCount={participants.reduce((acc, p, index, arr) => {
          // Count unique participants by checking if this userId appears earlier in the array
          const isDuplicate = arr.slice(0, index).some(prev => prev.userId === p.userId);
          return isDuplicate ? acc : acc + 1;
        }, 0)}
        isRecording={isRecording}
        duration={lectureDuration}
        onClose={onClose}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid - Takes most space */}
        <motion.div 
          className="flex-1 relative p-4"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <VideoGrid
            participants={participants}
            currentUserId={userId}
            videoElementsRef={videoElementsRef}
            streamRef={streamRef}
            onPinParticipant={setPinnedParticipantId}
            pinnedParticipantId={pinnedParticipantId}
            isScreenSharing={isScreenSharing}
            screenStream={null}
            screenSharingUserId={screenSharingUserId}
            onParticipantClick={handleParticipantClick}
          />
        </motion.div>

        {/* Right Side Panels */}
        <AnimatePresence>
          {isParticipantsOpen && (
            <motion.div 
              className="w-80 flex-shrink-0"
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="h-full p-4">
                <ParticipantList
                  participants={participants}
                  currentUserId={userId}
                  onParticipantClick={handleParticipantClick}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              className="w-80 flex-shrink-0"
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="h-full p-4">
                <ChatPanel
                  isOpen={true}
                  messages={chatMessages}
                  newMessage={newMessage}
                  onNewMessageChange={setNewMessage}
                  onSendMessage={handleSendMessage}
                  onClose={() => setIsChatOpen(false)}
                  currentUserId={userId}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Bar - Fixed at bottom */}
      <motion.div 
        className="flex-shrink-0"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <ControlBar
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isHandRaised={isHandRaised}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          connectionQuality={connectionStats.quality}
          cameraPermission={cameraPermission}
          microphonePermission={microphonePermission}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onRaiseHand={handleRaiseHand}
          onToggleRecording={handleToggleRecording}
          onLeave={handleLeaveLecture}
          onOpenChat={() => {
            setIsChatOpen(!isChatOpen);
            if (!isChatOpen) setIsParticipantsOpen(false);
          }}
          onOpenParticipants={() => {
            setIsParticipantsOpen(!isParticipantsOpen);
            if (!isParticipantsOpen) setIsChatOpen(false);
          }}
          onOpenPolls={() => setIsPollsOpen(!isPollsOpen)}
          userRole={userRole}
        />
      </motion.div>
    </motion.div>
  );
};

export default LiveLectureRoom;