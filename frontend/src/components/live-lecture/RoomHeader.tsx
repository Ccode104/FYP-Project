import React from 'react';
import { motion } from 'framer-motion';
import styles from './RoomHeader.module.css';

interface RoomHeaderProps {
  title: string;
  description?: string;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  participantCount?: number;
  isRecording?: boolean;
  duration?: string;
  onClose: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  title,
  description,
  connectionStatus,
  participantCount = 0,
  isRecording = false,
  duration,
  onClose,
}) => {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10b981';
      case 'connecting': return '#f59e0b';
      case 'disconnected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        );
      case 'connecting':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6"/>
          </svg>
        );
      case 'disconnected':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <motion.header 
      className={styles.header}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className={styles.headerLeft}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>{title}</h1>
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>

        <div className={styles.statusIndicator}>
          <motion.div
            className={styles.statusDot}
            style={{ backgroundColor: getStatusColor() }}
            animate={{
              scale: connectionStatus === 'connected' ? [1, 1.2, 1] : 1,
              opacity: connectionStatus === 'connected' ? [1, 0.7, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: connectionStatus === 'connected' ? Infinity : 0,
            }}
          />
          <span className={styles.statusText}>
            {getStatusIcon()}
            {getStatusText()}
          </span>
        </div>
      </div>

      <div className={styles.headerRight}>
        {/* Recording Status */}
        {isRecording && (
          <motion.div
            className={styles.recordingBadge}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.recordingDot} />
            <span>REC</span>
            {duration && <span>• {duration}</span>}
          </motion.div>
        )}

        {/* Lecture Stats */}
        {(participantCount > 0 || duration) && (
          <div className={styles.lectureStats}>
            {participantCount > 0 && (
              <div className={styles.statItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <span className={styles.participantCount}>{participantCount}</span>
              </div>
            )}
            {duration && (
              <div className={styles.statItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
                <span>{duration}</span>
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <motion.button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Leave lecture"
          title="Leave lecture"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </motion.button>
      </div>
    </motion.header>
  );
};