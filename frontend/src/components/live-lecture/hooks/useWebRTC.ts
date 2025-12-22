import { useRef, useEffect, useState, useCallback } from 'react';
import Peer from 'simple-peer';
import { io, Socket } from 'socket.io-client';

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStreams: { [userId: string]: MediaStream };
  peers: { [userId: string]: Peer.Instance };
  isConnected: boolean;
  joinRoom: (roomId: string, userId: string) => Promise<void>;
  leaveRoom: () => void;
  sendSignal: (signal: unknown, toUserId: string) => void;
}

export const useWebRTC = (roomId?: string): UseWebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [userId: string]: MediaStream }>({});
  const [peers, setPeers] = useState<{ [userId: string]: Peer.Instance }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [userId: string]: Peer.Instance }>({});


  const createPeer = useCallback((remoteUserId: string, initiator: boolean) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream: localStreamRef.current || undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          // Add TURN servers for production
        ]
      }
    });

    peer.on('signal', (signal) => {
      socket?.emit('webrtc-signal', {
        roomId,
        signal,
        fromUserId: socket.id,
        toUserId: remoteUserId,
      });
    });

    peer.on('stream', (remoteStream) => {
      setRemoteStreams(prev => ({
        ...prev,
        [remoteUserId]: remoteStream
      }));
    });

    peer.on('connect', () => {
      console.log(`Connected to peer: ${remoteUserId}`);
    });

    peer.on('error', (err) => {
      console.error(`Peer error with ${remoteUserId}:`, err);
      removePeer(remoteUserId);
    });

    peer.on('close', () => {
      console.log(`Peer connection closed: ${remoteUserId}`);
      removePeer(remoteUserId);
    });

    peersRef.current[remoteUserId] = peer;
    setPeers(prev => ({ ...prev, [remoteUserId]: peer }));

    return peer;
  }, [socket, roomId]);

  const removePeer = useCallback((userId: string) => {
    if (peersRef.current[userId]) {
      peersRef.current[userId].destroy();
      delete peersRef.current[userId];
      setPeers(prev => {
        const newPeers = { ...prev };
        delete newPeers[userId];
        return newPeers;
      });
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[userId];
        return newStreams;
      });
    }
  }, []);

  const joinRoom = useCallback(async (roomId: string, userId: string) => {
    const socketConnection = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000', {
      auth: { token: localStorage.getItem('auth:token') },
    });

    socketConnection.emit('join-live-lecture', { lectureId: roomId, userId });

    socketConnection.on('lecture-joined', () => {
      setIsConnected(true);
    });

    socketConnection.on('participant-joined', (data: unknown) => {
      if (data.userId !== userId) {
        createPeer(data.userId, true);
      }
    });

    socketConnection.on('participant-left', (data: unknown) => {
      removePeer(data.userId);
    });

    socketConnection.on('webrtc-signal', (data: unknown) => {
      const peer = peersRef.current[data.fromUserId];
      if (peer && !peer.destroyed) {
        peer.signal(data.signal);
      } else if (data.toUserId === userId) {
        // Create peer for incoming connection
        const newPeer = createPeer(data.fromUserId, false);
        newPeer.signal(data.signal);
      }
    });

    setSocket(socketConnection);
  }, [createPeer, removePeer]);

  const leaveRoom = useCallback(() => {
    Object.values(peersRef.current).forEach(peer => peer.destroy());
    peersRef.current = {};
    setPeers({});
    setRemoteStreams({});

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    socket?.disconnect();
    setSocket(null);
    setIsConnected(false);
  }, [socket]);

  const sendSignal = useCallback((signal: unknown, toUserId: string) => {
    socket?.emit('webrtc-signal', {
      roomId,
      signal,
      fromUserId: socket?.id,
      toUserId,
    });
  }, [socket, roomId]);

  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return {
    localStream,
    remoteStreams,
    peers,
    isConnected,
    joinRoom,
    leaveRoom,
    sendSignal,
  };
};
