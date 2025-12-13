import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InteractiveVideoPlayer from './InteractiveVideoPlayer';
import { useToast } from './ToastProvider';
import './VideoPlayerPage.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  video_url: string;
  duration?: number;
  course_offering_id: number;
}


export default function VideoPlayerPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { push } = useToast();

  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    loadVideoData();
  }, [videoId]);

  const loadVideoData = async () => {
    if (!videoId) return;

    try {
      // Get user role
      const { apiFetch } = await import('../services/api');
      const userResponse = await apiFetch('/api/auth/me');
      setUserRole(userResponse.role || 'student');

      // Load video details
      const videoResponse = await apiFetch(`/api/videos/${videoId}`);
      setVideo(videoResponse.video);

    } catch (error: unknown) {
      console.error('Error loading video data:', error);
      push({ kind: 'error', message: 'Failed to load video' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handleVideoComplete = (score: number, maxScore: number) => {
    // Handle video completion - could show completion modal or navigate away
    console.log(`Video completed with score: ${score}/${maxScore}`);
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
    <div className="video-player-page">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="back-button"
        aria-label="Go back"
      >
        ← Back
      </button>

      {/* Video Details Section */}
      <div className="video-details-section">
        <h1 className="video-title">{video.title}</h1>
        {video.description && (
          <div className="video-description">
            <p>{video.description}</p>
          </div>
        )}
        {video.duration && (
          <div className="video-meta">
            <span className="duration">Duration: {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
          </div>
        )}
      </div>

      {/* Video Player */}
      <div className="video-player-container">
        <InteractiveVideoPlayer
          video={video}
          userRole={userRole}
          onComplete={handleVideoComplete}
        />
      </div>

    </div>
  );
}
