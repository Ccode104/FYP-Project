import React from 'react';
import styles from './ControlBar.module.css';

interface ControlBarProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'disconnected';
  cameraPermission?: 'granted' | 'denied' | 'prompt';
  microphonePermission?: 'granted' | 'denied' | 'prompt';
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onRaiseHand: () => void;
  onToggleRecording: () => void;
  onLeave: () => void;
  onOpenChat: () => void;
  onOpenParticipants: () => void;
  onOpenPolls: () => void;
  onOpenSettings?: () => void;
  userRole?: 'student' | 'teacher' | 'ta';
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isMuted,
  isVideoOff,
  isHandRaised,
  isScreenSharing,
  isRecording,
  connectionQuality = 'excellent',
  cameraPermission = 'prompt',
  microphonePermission = 'prompt',
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onRaiseHand,
  onToggleRecording,
  onLeave,
  onOpenChat,
  onOpenParticipants,
  onOpenPolls,
  onOpenSettings,
  userRole = 'student',
}) => {
  return (
    <div className={styles['control-bar-container']}>
      {/* Primary Controls */}
      <div className={styles['control-group']}>
        <button className={`${styles['control-btn']} ${isMuted ? styles['active-danger'] : ''} ${microphonePermission === 'denied' ? styles['permission-denied'] : ''}`} onClick={onToggleMute}>
          <span className={styles['control-icon']}>
            {microphonePermission === 'denied' ? '🎤❌' : (isMuted ? '🔇' : '🎤')}
          </span>
          <span className={styles['control-label']}>
            {microphonePermission === 'denied' ? 'Mic Blocked' : (isMuted ? 'Unmute' : 'Mute')}
          </span>
          {microphonePermission === 'denied' && <span className={styles['permission-warning']}>⚠️</span>}
        </button>

        <button className={`${styles['control-btn']} ${isVideoOff ? styles['active-danger'] : ''} ${cameraPermission === 'denied' ? styles['permission-denied'] : ''}`} onClick={onToggleVideo}>
          <span className={styles['control-icon']}>
            {cameraPermission === 'denied' ? '📹❌' : (isVideoOff ? '📹❌' : '📹')}
          </span>
          <span className={styles['control-label']}>
            {cameraPermission === 'denied' ? 'Camera Blocked' : (isVideoOff ? 'Start Video' : 'Stop Video')}
          </span>
          {cameraPermission === 'denied' && <span className={styles['permission-warning']}>⚠️</span>}
        </button>

        <button className={styles['control-btn']} onClick={onToggleScreenShare}>
          <span className={styles['control-icon']}>🖥️</span>
          <span className={styles['control-label']}>Share</span>
        </button>
      </div>

      <div className={styles['control-divider']}></div>

      {/* Secondary Controls */}
      <div className={styles['control-group']}>
        <button className={styles['control-btn']} onClick={onRaiseHand}>
          <span className={styles['control-icon']}>✋</span>
          <span className={styles['control-label']}>Raise Hand</span>
        </button>

        <button className={styles['control-btn']} onClick={onToggleRecording}>
          <span className={styles['control-icon']}>⏺️</span>
          <span className={styles['control-label']}>Record</span>
        </button>

        <button className={styles['control-btn']} onClick={onOpenPolls}>
          <span className={styles['control-icon']}>📊</span>
          <span className={styles['control-label']}>Poll</span>
        </button>

        <button className={styles['control-btn']} onClick={onOpenChat}>
          <span className={styles['control-icon']}>💬</span>
          <span className={styles['control-label']}>Chat</span>
        </button>

        <button className={styles['control-btn']} onClick={onOpenParticipants}>
          <span className={styles['control-icon']}>👥</span>
          <span className={styles['control-label']}>Participants</span>
        </button>
      </div>

      <div className={styles['control-divider']}></div>

      {/* Leave Button */}
      <div className={styles['control-group']}>
        <button className={`${styles['control-btn']} ${styles['leave-btn']}`} onClick={onLeave}>
          <span className={styles['control-icon']}>📞</span>
          <span className={styles['control-label']}>Leave</span>
        </button>
      </div>
    </div>
  );
};
