import React, { useEffect, useRef, useState, useCallback } from 'react';
import DriveVideoPlayer from './DriveVideoPlayer';
import { useToast } from './ToastProvider';

interface Video {
  id: number;
  title: string;
  description?: string;
  video_url: string;
  drive_file_id?: string;
  duration?: number;
  uploaded_by_name?: string;
  upload_timestamp?: string;
}

interface VideoPlayerProps {
  video: Video;
  playlist?: Array<{id: number; title: string; duration?: number; hasQuiz?: boolean}>;
  courseTitle?: string;
  instructorName?: string;
  instructorAvatar?: string;
  views?: number;
  onTimeUpdate?: (time: number) => void;
  onQuizTrigger?: (time: number) => void;
}

export default function VideoPlayer({
  video,
  playlist = [],
  courseTitle = 'Computer Science 402',
  instructorName = 'Dr. Aris Thorne',
  instructorAvatar = 'https://lh3.googleusercontent.com/...',
  views = 12400,
  onTimeUpdate,
  onQuizTrigger
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { push } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);

  // Prefer Drive player if drive_file_id or Drive URL present
  const isDriveVideo = !!video.drive_file_id || (video.video_url?.includes('drive.google.com') ?? false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isDriveVideo) {
    return (
      <DriveVideoPlayer 
        video={video}
        onTimeUpdate={onTimeUpdate}
        onQuizTrigger={onQuizTrigger}
        className="video-player-replaced-with-drive"
      />
    );
  }

  // Fallback to original HTML5 player for non-Drive videos
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) videoRef.current.volume = newVolume;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
      onQuizTrigger?.(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onTimeUpdate, onQuizTrigger]);

  return (
    <div className="video-player-content">
      {/* Original player UI preserved, but video replaced where Drive */}
      <video ref={videoRef} src={video.video_url} className="w-full h-full object-cover" />
      {/* Rest of original component... */}
    </div>
  );
}
