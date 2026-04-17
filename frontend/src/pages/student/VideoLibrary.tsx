import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideosByCourseOffering } from '../../features/videos/api/videos';
import './VideoLibrary.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_url: string;
  duration: number;
  upload_timestamp: string;
}

export default function VideoLibrary() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!courseId) return;

    const loadVideos = async () => {
      setLoading(true);
      try {
        const data = (await getVideosByCourseOffering(courseId)) as { videos?: Video[] };
        const videoList = data.videos || [];
        setVideos(videoList);
      } catch (err) {
        console.error('Failed to load videos:', err);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [courseId]);

  const filteredVideos = videos.filter(
    video =>
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="video-library-loading">
        <div className="loading-spinner">Loading videos...</div>
      </div>
    );
  }

  return (
    <div className="video-library">
      <header className="video-library-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="page-title">Videos</h1>
      </header>

      <div className="video-library-content">
        <div className="search-container">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredVideos.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">movie</span>
            <p>No videos available for this course.</p>
          </div>
        ) : (
          <div className="video-grid">
            {filteredVideos.map(video => (
              <div
                key={video.id}
                className="video-card"
                onClick={() => navigate(`/videos/${video.id}`)}
              >
                <div className="video-thumbnail">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} />
                  ) : (
                    <div className="video-thumbnail-placeholder">
                      <span className="material-symbols-outlined">movie</span>
                    </div>
                  )}
                  <span className="video-duration">{formatDuration(video.duration)}</span>
                </div>
                <div className="video-info">
                  <h3 className="video-title">{video.title}</h3>
                  {video.description && <p className="video-description">{video.description}</p>}
                  <span className="video-date">{formatDate(video.upload_timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
