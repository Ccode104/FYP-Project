import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getVideoById,
  getVideoQuizQuestions,
  getVideosByCourseOffering,
} from '../../features/videos/api/videos';
import { apiFetch } from '../../services/api';
import './VideoPlayerPage.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  video_url: string;
  cloudinary_public_id?: string;
  duration: number;
  upload_timestamp: string;
  views?: number;
  uploaded_by_name?: string;
}

interface QuizQuestion {
  id: number;
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer: string;
  timestamp?: number;
}

interface PlaylistItem {
  id: number;
  title: string;
  duration?: number;
  quizCount?: number;
}

export default function VideoPlayerPage() {
  const { videoId, courseId } = useParams<{ videoId: string; courseId?: string }>();
  const navigate = useNavigate();

  const [video, setVideo] = useState<Video | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [instructorAvatar, setInstructorAvatar] = useState('');
  const [views, setViews] = useState(0);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'playlist' | 'notes'>('playlist');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);

  const getEmbedUrl = (v: Video | null) => {
    if (!v) return '';
    if (v.cloudinary_public_id) {
      const match = v.cloudinary_public_id.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    if (v.video_url) {
      const match = v.video_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
      return v.video_url;
    }
    return '';
  };

  const embedUrl = getEmbedUrl(video);

  useEffect(() => {
    if (!videoId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const videoData = (await getVideoById(Number(videoId))) as { video: Video };
        setVideo(videoData.video);
        setViews(videoData.video.views || 12400);

        const questionsData = await getVideoQuizQuestions(Number(videoId));
        setQuestions(Array.isArray(questionsData) ? questionsData : []);

        if (videoData.video.course_offering_id) {
          const cid = videoData.video.course_offering_id;
          try {
            const courseResponse = await apiFetch(`/api/student/courses/${cid}`);
            setCourseTitle(courseResponse.course_title || 'Computer Science 402');
            setInstructorName(courseResponse.instructor_name || 'Dr. Aris Thorne');
            setInstructorAvatar(courseResponse.instructor_avatar || '');
          } catch {
            setCourseTitle('Computer Science 402');
            setInstructorName('Dr. Aris Thorne');
          }

          const videosData = await getVideosByCourseOffering(cid);
          const videos = (videosData as any)?.videos || [];
          const playlistItems: PlaylistItem[] = videos.map((v: Video) => ({
            id: v.id,
            title: v.title,
            duration: v.duration,
          }));
          setPlaylist(playlistItems);
        }
      } catch (err) {
        console.error('Failed to load video:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [videoId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const currentQuestion = questions.find(
    q => q.timestamp && Math.abs((q.timestamp || 0) - currentTime) < 2
  );

  if (loading) {
    return (
      <div className="video-player-page-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="video-player-page-error">
        <h2>Video not found</h2>
        <button onClick={() => navigate(-1)} className="btn-primary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="video-player-page">
      <div className="video-player-layout">
        {/* Main Column */}
        <div className="video-player-main">
          {/* Video Container */}
          <div className="video-container">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="video-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                title={video.title}
              />
            ) : (
              <div className="video-placeholder">
                <span className="material-symbols-outlined">movie</span>
                <p>Video not available</p>
              </div>
            )}

            {/* Quiz Overlay - Appears when quiz timestamp is reached */}
            {showQuiz && currentQuestion && !quizAnswered && (
              <div className="quiz-overlay">
                <div className="quiz-card">
                  <div className="quiz-header">
                    <span className="quiz-badge">Knowledge Check</span>
                    <span className="quiz-timestamp">
                      Video paused at {formatTime(currentTime)}
                    </span>
                  </div>
                  <h3 className="quiz-question">{currentQuestion.question_text}</h3>
                  <div className="quiz-options">
                    {currentQuestion.options?.map((option, idx) => (
                      <button
                        key={idx}
                        className={`quiz-option ${selectedAnswer === idx ? 'selected' : ''}`}
                        onClick={() => setSelectedAnswer(idx)}
                      >
                        <span className="quiz-option-radio" />
                        <span className="quiz-option-text">{option}</span>
                      </button>
                    ))}
                  </div>
                  <div className="quiz-actions">
                    <button
                      className="quiz-submit"
                      disabled={selectedAnswer === null}
                      onClick={() => setQuizAnswered(true)}
                    >
                      Submit Answer
                    </button>
                    <button className="quiz-skip" onClick={() => setShowQuiz(false)}>
                      Skip for now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Info Section */}
          <div className="video-info">
            <div className="video-info-header">
              <div>
                <h1 className="video-title">{video.title}</h1>
                <div className="video-meta">
                  <span className="meta-item">
                    <span className="material-symbols-outlined">calendar_today</span>
                    {formatDate(video.upload_timestamp)}
                  </span>
                  <span className="meta-item">
                    <span className="material-symbols-outlined">school</span>
                    {courseTitle}
                  </span>
                  <span className="meta-item">
                    <span className="material-symbols-outlined">visibility</span>
                    {views.toLocaleString()} views
                  </span>
                </div>
              </div>
              <div className="video-actions">
                <button className="action-btn">
                  <span className="material-symbols-outlined">share</span>
                  Share
                </button>
                <button className="action-btn">
                  <span className="material-symbols-outlined">bookmark</span>
                  Save
                </button>
              </div>
            </div>

            <div className="video-instructor">
              {instructorAvatar && (
                <img src={instructorAvatar} alt={instructorName} className="instructor-avatar" />
              )}
              <div className="instructor-info">
                <h4 className="instructor-name">{instructorName}</h4>
                <p className="instructor-title">Instructor</p>
                {video.description && <p className="video-description">{video.description}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="video-player-sidebar">
          {/* Tabs */}
          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${activeTab === 'playlist' ? 'active' : ''}`}
              onClick={() => setActiveTab('playlist')}
            >
              <span className="material-symbols-outlined">playlist_play</span>
              Playlist
            </button>
            <button
              className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <span className="material-symbols-outlined">note_alt</span>
              Notes
            </button>
          </div>

          {/* Playlist Content */}
          <div className="sidebar-content">
            {activeTab === 'playlist' ? (
              <div className="playlist">
                {playlist.map((item, index) => (
                  <div
                    key={item.id}
                    className={`playlist-item ${item.id === Number(videoId) ? 'active' : ''}`}
                    onClick={() => navigate(`/videos/${item.id}`)}
                  >
                    <div className="playlist-thumb">
                      <img
                        src={`https://via.placeholder.com/112x63?text=${index + 1}`}
                        alt={item.title}
                      />
                      {item.id === Number(videoId) && (
                        <div className="playlist-play-overlay">
                          <span className="material-symbols-outlined">play_circle</span>
                        </div>
                      )}
                      <span className="playlist-duration">{formatDuration(item.duration)}</span>
                    </div>
                    <div className="playlist-info">
                      <span className="playlist-label">
                        {item.id === Number(videoId) ? 'Playing Now' : `Module ${index + 1}`}
                      </span>
                      <h5 className="playlist-title">{item.title}</h5>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notes-empty">
                <span className="material-symbols-outlined">edit_note</span>
                <h4>No notes yet</h4>
                <p>Capture key moments and thoughts while you watch.</p>
                <button className="notes-add-btn">Add Note</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
