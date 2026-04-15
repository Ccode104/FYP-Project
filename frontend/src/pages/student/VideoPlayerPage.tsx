import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../../components/VideoPlayer';
import { useToast } from '../../components/ToastProvider';
import { getVideosByCourseOffering } from '../../features/videos/api/videos';

interface Video {
  id: number;
  title: string;
  description?: string;
  video_url: string;
  duration?: number;
  course_offering_id: number;
  upload_timestamp?: string;
  uploaded_by_name?: string;
}

interface PlaylistItem {
  id: number;
  title: string;
  duration?: number;
  hasQuiz?: boolean;
  quizCount?: number;
  isLocked?: boolean;
}

export default function VideoPlayerPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { push } = useToast();

  const [video, setVideo] = useState<Video | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [instructorAvatar, setInstructorAvatar] = useState('');
  const [views, setViews] = useState(0);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVideoData();
  }, [videoId]);

  const loadVideoData = async () => {
    if (!videoId) return;

    try {
      const { apiFetch } = await import('../../services/api');
      
      // Get video data
      const videoResponse = await apiFetch(`/api/videos/${videoId}`);
      const videoData = videoResponse.video;
      setVideo(videoData);
      setViews(videoData.views || 12400);

      // Get course info
      if (videoData.course_offering_id) {
        const courseId = videoData.course_offering_id;
        try {
          const courseResponse = await apiFetch(`/api/student/courses/${courseId}`);
          setCourseTitle(courseResponse.course_title || 'Computer Science 402');
          setInstructorName(courseResponse.instructor_name || 'Dr. Aris Thorne');
          setInstructorAvatar(courseResponse.instructor_avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOUPmp0Y-YBT4kVQpeHCJgs57ryDy7czGaeW_c0CXG3WH92RpzAEI68mG_QBBEhUJICAMI_ZYn3dqyou6ru3AKMOiytm2oEDWpb0rh_14x08vAR1tu1cGTFcYujd0x5ZA8TK7Sseq8mSF2YO0BTKxdR88I1HDXZqaRXb45YsjpLfz2eBVwNiPTi_Rd8L48-RxuSrO1C6CcXkY1tsDxeIbIEdFOXXSAAPnN8hN1hovnoIhU393RyF7N4xdnIHvce5UBRDFQ1HioJ30');
        } catch {
          // Mock data fallback
          setCourseTitle('Computer Science 402');
          setInstructorName('Dr. Aris Thorne');
          setInstructorAvatar('https://lh3.googleusercontent.com/aida-public/AB6AXuAOUPmp0Y-YBT4kVQpeHCJgs57ryDy7czGaeW_c0CXG3WH92RpzAEI68mG_QBBEhUJICAMI_ZYn3dqyou6ru3AKMOiytm2oEDWpb0rh_14x08vAR1tu1cGTFcYujd0x5ZA8TK7Sseq8mSF2YO0BTKxdR88I1HDXZqaRXb45YsjpLfz2eBVwNiPTi_Rd8L48-RxuSrO1C6CcXkY1tsDxeIbIEdFOXXSAAPnN8hN1hovnoIhU393RyF7N4xdnIHvce5UBRDFQ1HioJ30');
        }
        
        // Get playlist data
        const videosData = await getVideosByCourseOffering(courseId);
        const videos = (videosData as any)?.videos || [];
        
        // Transform videos to playlist items with mock quiz data
        const playlistItems: PlaylistItem[] = videos.map((v: Video, index: number) => ({
          id: v.id,
          title: v.title,
          duration: v.duration,
          hasQuiz: Math.random() > 0.3, // 70% chance of having quiz
          quizCount: Math.floor(Math.random() * 3) + 1, // 1-3 quizzes
          isLocked: index > videos.indexOf(v) + 1 // Lock videos after current one
        }));
        
        setPlaylist(playlistItems);
      }
    } catch (error: unknown) {
      console.error('Error loading video data:', error);
      push({ kind: 'error', message: 'Failed to load video' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="video-player-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading video...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="video-player-page-error">
        <h2>Video not found</h2>
        <button onClick={handleBack} className="btn btn-primary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <VideoPlayer 
      video={video}
      playlist={playlist}
      courseTitle={courseTitle}
      instructorName={instructorName}
      instructorAvatar={instructorAvatar}
      views={views}
    />
  );
}
