import VideoPlayer from './VideoPlayer';

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

interface InteractiveVideoPlayerProps {
  video: Video;
  userRole?: 'student' | 'teacher' | 'ta' | 'admin' | string;
  onComplete?: (score: number, maxScore: number) => void;
}

export default function InteractiveVideoPlayer({
  video,
}: InteractiveVideoPlayerProps) {
  return <VideoPlayer video={video} />;
}
