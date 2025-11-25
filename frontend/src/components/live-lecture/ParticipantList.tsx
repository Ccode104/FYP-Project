import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ParticipantList.module.css';

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
  joinedAt: string;
}

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: number;
  onParticipantClick?: (participant: Participant) => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  onParticipantClick,
}) => {
  const getParticipantInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'U';
    }
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'teacher': return 'Teacher';
      case 'ta': return 'TA';
      default: return 'Student';
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'teacher': return styles.roleTeacher;
      case 'ta': return styles.roleTa;
      default: return styles.roleStudent;
    }
  };

  const handleParticipantClick = (participant: Participant) => {
    onParticipantClick?.(participant);
  };

  const getStatusIcon = (participant: Participant) => {
    if (participant.isHandRaised) {
      return (
        <div className={styles.handRaisedIndicator} title="Hand raised">
          <span style={{ fontSize: '0.75rem' }}>✋</span>
        </div>
      );
    }

    if (participant.isMuted) {
      return (
        <div className={`${styles.statusIcon} ${styles.muted}`} title="Muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        </div>
      );
    }

    if (participant.isVideoOff) {
      return (
        <div className={`${styles.statusIcon} ${styles.videoOff}`} title="Camera off">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
          </svg>
        </div>
      );
    }

    return (
      <div className={`${styles.statusIcon} ${styles.active}`} title="Active">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </div>
    );
  };

  return (
    <div className={styles.participantList}>
      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>
          Participants
          <span className={styles.participantCount}>
            {participants.length}
          </span>
        </h3>
      </div>

      <div className={styles.listContent}>
        <AnimatePresence>
          {participants.map((participant) => (
            <motion.div
              key={`participant-list-${participant.userId}-${participant.joinedAt}`}
              className={`${styles.participantItem} ${
                participant.userId === currentUserId ? styles.currentUser : ''
              }`}
              onClick={() => handleParticipantClick(participant)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={styles.participantAvatar}>
                <div
                  className={styles.avatarCircle}
                  style={{ backgroundColor: getRoleColor(participant.role) }}
                >
                  {getParticipantInitials(participant.userName)}
                </div>
                <div
                  className={`${styles.onlineIndicator} ${
                    participant.isOnline ? styles.online : styles.offline
                  }`}
                />
              </div>

              <div className={styles.participantInfo}>
                <div className={styles.participantName}>
                  {participant.userName || 'Unknown User'}
                  {participant.userId === currentUserId && (
                    <span className={styles.youLabel}>You</span>
                  )}
                </div>
                <div className={styles.participantRole}>
                  <span className={`${styles.roleBadge} ${getRoleBadgeClass(participant.role)}`}>
                    {getRoleLabel(participant.role)}
                  </span>
                </div>
              </div>

              <div className={styles.participantStatus}>
                {getStatusIcon(participant)}
              </div>

              {/* Speaking indicator overlay */}
              <AnimatePresence>
                {participant.isSpeaking && (
                  <motion.div
                    className={styles.speakingIndicator}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {participants.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center h-32 text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mb-2">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <p className="text-sm">No participants yet</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};