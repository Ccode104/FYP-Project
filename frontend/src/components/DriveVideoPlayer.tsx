import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '../components/ToastProvider'; // Adjust path as needed

interface Video {
  id: number;
  title: string;
  video_url: string;
  drive_file_id?: string;
  duration?: number;
}

interface DriveVideoPlayerProps {
  video: Video;
  onTimeUpdate?: (time: number) => void;
  onQuizTrigger?: (time: number) => void;
  className?: string;
}

const DriveVideoPlayer: React.FC<DriveVideoPlayerProps> = ({
  video,
  onTimeUpdate,
  onQuizTrigger,
  className = '',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { push } = useToast();
  const [playerState, setPlayerState] = useState({ currentTime: 0, duration: 0, isPlaying: false });
  const [showControls, setShowControls] = useState(true);

  // Parse Drive file ID from video_url or use drive_file_id
  const getDriveFileId = () => {
    if (!video) return null;
    if (video.drive_file_id) return video.drive_file_id;
    if (!video.video_url) return null;
    const match = video.video_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const fileId = getDriveFileId();
  const embedUrl = fileId
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : video?.video_url || '';

  const sendCommand = useCallback((command: string) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          event: 'command',
          func: command,
          args: '',
        },
        '*'
      );
    }
  }, []);

  const handlePlayPause = () => {
    sendCommand(playerState.isPlaying ? 'pauseVideo' : 'playVideo');
  };

  const handleSeek = (time: number) => {
    sendCommand(`seekTo:${time}`);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security (Drive domains)
      if (!event.origin.includes('drive.google.com') && !event.origin.includes('googleusercontent'))
        return;

      try {
        let data;
        if (typeof event.data === 'string') {
          data = JSON.parse(event.data);
        } else if (event.data && typeof event.data === 'object') {
          data = event.data;
        } else {
          return;
        }

        if (!data) return;

        if (data.event === 'onStateChange') {
          const playerState = data.data;
          if (playerState === 1) setPlayerState(prev => ({ ...prev, isPlaying: true }));
          if (playerState === 2) setPlayerState(prev => ({ ...prev, isPlaying: false }));
        } else if (data.event === 'onReady') {
          // Mute first to avoid autoplay issues, then get info
          sendCommand('mute');
          sendCommand('getDuration');
          sendCommand('getCurrentTime');
        } else if (data.event === 'infoDelivery') {
          if (data.info.duration !== undefined) {
            setPlayerState(prev => ({ ...prev, duration: data.info.duration }));
          }
          if (data.info.currentTime !== undefined) {
            const currentTime = data.info.currentTime;
            setPlayerState(prev => ({ ...prev, currentTime }));
            onTimeUpdate?.(currentTime);
            onQuizTrigger?.(currentTime);
          }
        }
      } catch (e) {
        console.warn('Drive player message parse error:', e, event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onTimeUpdate, onQuizTrigger, sendCommand]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = playerState.duration
    ? (playerState.currentTime / playerState.duration) * 100
    : 0;

  if (!fileId && !video?.video_url) {
    return (
      <div className="aspect-video bg-gray-900 flex items-center justify-center text-white rounded-xl">
        No video available
      </div>
    );
  }

  return (
    <div
      className={`drive-player-container relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group ${className}`}
    >
      <iframe
        ref={iframeRef}
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        className="w-full h-full"
        title={video.title}
        loading="lazy"
      />

      {/* Overlay Controls */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <div
          className="relative w-full h-1.5 bg-white/20 rounded-full mb-6 cursor-pointer overflow-hidden pointer-events-auto"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percentage = (e.clientX - rect.left) / rect.width;
            const newTime = percentage * playerState.duration;
            handleSeek(newTime);
          }}
        >
          <div
            className="absolute left-0 top-0 h-full bg-indigo-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-white pointer-events-auto">
          <button onClick={handlePlayPause} className="hover:text-indigo-400 p-2">
            <span
              className={`material-symbols-outlined text-3xl ${playerState.isPlaying ? 'pause' : 'play_arrow'}`}
            />
          </button>
          <span className="text-sm font-mono">
            {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DriveVideoPlayer;
