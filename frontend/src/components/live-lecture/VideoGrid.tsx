import React, { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './VideoGrid.css';

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

interface VideoGridProps {
  participants: Participant[];
  currentUserId: number;
  videoElementsRef: React.MutableRefObject<{ [key: string]: HTMLVideoElement | null }>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  onPinParticipant?: (userId: number | null) => void;
  pinnedParticipantId?: number | null;
  isScreenSharing?: boolean;
  screenStream?: MediaStream | null;
  screenSharingUserId?: number | null;
  onParticipantClick?: (participant: Participant) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  participants,
  currentUserId,
  videoElementsRef,
  streamRef,
  onPinParticipant,
  pinnedParticipantId,
  isScreenSharing = false,
  screenStream,
  screenSharingUserId,
  onParticipantClick,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const pinnedVideoRef = useRef<HTMLVideoElement>(null);


  // Update pinned video when participant changes
  useEffect(() => {
    if (pinnedVideoRef.current && pinnedParticipantId !== undefined) {
      if (pinnedParticipantId === null || pinnedParticipantId === currentUserId) {
        // Show local video
        if (streamRef.current) {
          pinnedVideoRef.current.srcObject = streamRef.current;
        }
      } else {
        // Show remote participant's video
        const videoEl = videoElementsRef.current[pinnedParticipantId.toString()];
        if (videoEl && videoEl.srcObject) {
          pinnedVideoRef.current.srcObject = videoEl.srcObject;
        } else {
          // Clear if no stream available
          pinnedVideoRef.current.srcObject = null;
        }
      }
    }
  }, [pinnedParticipantId, currentUserId]);

  // Assign stream to local video elements when stream becomes available
  useEffect(() => {
    const assignStreamToLocalVideos = () => {
      if (streamRef.current) {
        // Assign to local video element if it exists
        if (localVideoRef.current && localVideoRef.current.srcObject !== streamRef.current) {
          localVideoRef.current.srcObject = streamRef.current;
        }
        // Assign to pinned video if showing local video
        if (pinnedVideoRef.current &&
            (pinnedParticipantId === null || pinnedParticipantId === currentUserId) &&
            pinnedVideoRef.current.srcObject !== streamRef.current) {
          pinnedVideoRef.current.srcObject = streamRef.current;
        }
      }
    };

    // Assign immediately if stream exists
    assignStreamToLocalVideos();
  }, [pinnedParticipantId, currentUserId]); // Stable dependencies

  // Deduplicate participants and ensure proper naming
  const uniqueParticipants = useMemo(() => {
    // First, deduplicate by userId
    const deduplicated = participants.reduce((acc: Participant[], participant) => {
      const existingIndex = acc.findIndex(p => p.userId === participant.userId || p.id === participant.id);
      if (existingIndex === -1) {
        acc.push(participant);
      } else {
        // Keep the one with more complete data (prefer actual name over fallback)
        const existing = acc[existingIndex];
        if (!existing.userName || existing.userName.startsWith('User ')) {
          acc[existingIndex] = participant;
        }
      }
      return acc;
    }, []);

    // Add current user if not already present and we have video or other participants
    const hasCurrentUserVideo = streamRef.current?.getVideoTracks().some(track => track.enabled) || false;
    const hasOtherParticipants = deduplicated.length > 0;
    const includeCurrentUser = hasCurrentUserVideo || hasOtherParticipants;

    const currentUserExists = deduplicated.some(p => p.userId === currentUserId);

    if (includeCurrentUser && !currentUserExists) {
      // Find current user in original participants array to get their real name
      const currentUserFromParticipants = participants.find(p => p.userId === currentUserId);

      const currentUserParticipant: Participant = {
        id: currentUserId,
        userId: currentUserId,
        userName: currentUserFromParticipants?.userName || 'You',
        role: currentUserFromParticipants?.role || 'student',
        isOnline: true,
        isMuted: !streamRef.current?.getAudioTracks().some(track => track.enabled) || false,
        isVideoOff: !hasCurrentUserVideo,
        isHandRaised: currentUserFromParticipants?.isHandRaised || false,
        isSpeaking: false,
        joinedAt: currentUserFromParticipants?.joinedAt || new Date().toISOString(),
      };

      deduplicated.unshift(currentUserParticipant); // Add current user first
    }

    return deduplicated;
  }, [participants, currentUserId]);

  // Get pinned participant
  const pinnedParticipant = useMemo(() => {
    if (pinnedParticipantId === null) return null;
    return uniqueParticipants.find(p => p.userId === pinnedParticipantId) || null;
  }, [uniqueParticipants, pinnedParticipantId]);

  const getParticipantInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'teacher': return '#ef4444';
      case 'ta': return '#10b981';
      default: return '#3b82f6';
    }
  };

  const hasVideo = (participant: Participant, isLocal: boolean) => {
    if (isLocal) {
      // For local participant, check actual video track enabled state
      return !!streamRef.current?.getVideoTracks().some(track => track.enabled);
    } else {
      // For remote participants, check if participant has video enabled AND stream has arrived
      if (participant.isVideoOff) return false;
      return !!videoElementsRef.current[participant.userId.toString()]?.srcObject ||
              !!videoElementsRef.current[participant.userId.toString()];
    }
  };

  const handleParticipantClick = (participant: Participant) => {
    if (onParticipantClick) {
      onParticipantClick(participant);
    }
    if (onPinParticipant) {
      onPinParticipant(pinnedParticipantId === participant.userId ? null : participant.userId);
    }
  };

  const renderParticipantTile = (participant: Participant, isLarge: boolean = false) => {
    const isLocal = participant.userId === currentUserId;
    const isPinned = participant.userId === pinnedParticipantId;
    return (
      <motion.div
        key={`participant-${participant.userId}-${participant.joinedAt}`}
        className={`video-tile ${isLarge ? 'video-tile-large' : ''} ${isPinned ? 'video-tile-pinned' : ''}`}
        onClick={() => handleParticipantClick(participant)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: isLarge ? 1.02 : 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="video-content">
          {hasVideo(participant, isLocal) ? (
            <video
              ref={(el) => {
                if (isLocal) {
                  // Store the element ref
                  if (isLarge) {
                    // pinnedVideoRef.current = el;
                  } else {
                    // localVideoRef.current = el;
                  }
                  // Assign stream if available and not already assigned
                  if (el && streamRef.current && el.srcObject !== streamRef.current) {
                    el.srcObject = streamRef.current;
                  }
                } else {
                  // For remote participants, store ref for WebRTC stream assignment
                  videoElementsRef.current[participant.userId.toString()] = el;
                  // If stream already arrived, assign it (only if not already assigned)
                  const existingStream = videoElementsRef.current[participant.userId.toString()]?.srcObject;
                  if (el && existingStream && el.srcObject !== existingStream) {
                    el.srcObject = existingStream;
                  }
                }
              }}
              autoPlay
              playsInline
              muted={isLocal}
              className="video-element"
            />
          ) : (
            <div className="avatar-container">
              <div className="avatar" style={{ background: `linear-gradient(135deg, ${getRoleColor(participant.role)}, ${getRoleColor(participant.role)}dd)` }}>
                {getParticipantInitials(participant.userName)}
              </div>
              <div className="avatar-name">{participant.userName}</div>
            </div>
          )}
        </div>

        <div className="participant-info">
          <div className="info-row">
            <div className="participant-details">
              <div className="role-indicator" style={{ backgroundColor: getRoleColor(participant.role) }}></div>
              <span className="participant-name">
                {participant.userName || 'Unknown User'}
                {participant.userId === currentUserId && ' (You)'}
              </span>
            </div>

            <div className="participant-controls">
              {participant.isMuted && (
                <motion.div
                  className="control-icon muted"
                  title="Muted"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <svg className="icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                </motion.div>
              )}

              {participant.isHandRaised && (
                <motion.div
                  className="control-icon hand-raised"
                  animate={{ rotate: [-10, 10, -10] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  title="Hand raised"
                >
                  ✋
                </motion.div>
              )}

              {participant.isScreenSharing && (
                <motion.div
                  className="control-icon screen-share"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  title="Screen sharing"
                >
                  <svg className="icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
                  </svg>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <motion.button
          className={`pin-button ${isPinned ? 'pinned' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onPinParticipant?.(participant.userId === pinnedParticipantId ? null : participant.userId);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={isPinned ? 'Unpin participant' : 'Pin participant'}
        >
          <svg className="icon" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,3.89 18.1,3 17,3Z" />
          </svg>
        </motion.button>

        <AnimatePresence>
          {participant.isSpeaking && (
            <motion.div
              className="speaking-indicator"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        <div className="quality-indicators">
          <div className="quality-dot hd" title="HD Quality"></div>
          <div className="quality-dot audio" title="Audio"></div>
        </div>
      </motion.div>
    );
  };

  // Screen sharing layout
  if (isScreenSharing && screenStream && screenSharingUserId) {
    const sharer = uniqueParticipants.find(p => p.userId === screenSharingUserId);
    const isLocalSharer = screenSharingUserId === currentUserId;

    return (
      <motion.div 
        className="h-full bg-black rounded-xl overflow-hidden relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <video
          autoPlay
          playsInline
          className="w-full h-full object-contain"
          ref={(el) => {
            // Screen sharing video - assign screenStream
            if (el && screenStream) {
              el.srcObject = screenStream;
            }
          }}
        />
        
        {/* Screen sharing overlay */}
        <div className="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Screen Share</span>
          </div>
        </div>

        {/* Sharer's video tile */}
        {sharer && (
          <div className="absolute top-4 left-4 w-48 h-32 bg-gray-800 rounded-xl overflow-hidden border-2 border-white shadow-2xl">
            {hasVideo(sharer, isLocalSharer) ? (
              <video
                ref={(el) => {
                  if (isLocalSharer) {
                    // Local screen share - stream assigned by useEffect
                  } else {
                    // Remote screen share - store ref for WebRTC
                    videoElementsRef.current[screenSharingUserId.toString()] = el;
                    if (el && videoElementsRef.current[screenSharingUserId.toString()]?.srcObject) {
                      el.srcObject = videoElementsRef.current[screenSharingUserId.toString()]!.srcObject;
                    }
                  }
                }}
                autoPlay
                playsInline
                muted={isLocalSharer}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                <div className="text-center">
                  <div 
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: getRoleColor(sharer.role) }}
                  >
                    {getParticipantInitials(sharer.userName)}
                  </div>
                  <div className="text-sm font-medium text-white">{sharer.userName}</div>
                </div>
              </div>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-white text-xs font-medium truncate">{sharer.userName}</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Empty state
  if (uniqueParticipants.length === 0) {
    return (
      <motion.div 
        className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center text-white max-w-md">
          <motion.div 
            className="text-6xl md:text-8xl mb-4"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            🎥
          </motion.div>
          <h3 className="text-xl md:text-2xl font-semibold mb-3">Waiting for participants</h3>
          <p className="text-gray-400 text-base md:text-lg">The lecture will begin once participants join</p>
        </div>
      </motion.div>
    );
  }

  // Pinned layout
  if (pinnedParticipant) {
    return (
      <motion.div 
        className="h-full flex items-center justify-center p-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-full h-full max-w-5xl max-h-96">
          {renderParticipantTile(pinnedParticipant, true)}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="video-grid-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="video-grid">
        <AnimatePresence>
          {uniqueParticipants.map((participant, index) => (
            <motion.div
              key={`grid-${participant.userId}-${participant.joinedAt}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                duration: 0.3,
                delay: index * 0.1,
                ease: "easeOut"
              }}
              className="grid-item"
            >
              {renderParticipantTile(participant, false)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};