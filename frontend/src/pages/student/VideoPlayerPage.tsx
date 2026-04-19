import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getVideoById,
  getVideoQuizQuestions,
  getVideosByCourseOffering,
  getVideoSections,
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

interface VideoSection {
  id: number;
  start_time: number;
  end_time: number;
  title: string;
  summary?: string;
}

interface QuizQuestion {
  id: number;
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer: string;
  timestamp?: number;
  section_id?: number;
  section?: VideoSection;
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
  const [sections, setSections] = useState<VideoSection[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [instructorAvatar, setInstructorAvatar] = useState('');
  const [views, setViews] = useState(0);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'playlist' | 'sections' | 'notes' | 'quiz'>(
    'playlist'
  );
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});

  const getEmbedUrl = (v: Video | null) => {
    if (!v) return '';
    // Use embed_url from backend if available
    if (v.embed_url) {
      console.log('Using backend embed_url:', v.embed_url);
      return v.embed_url;
    }
    // Fallback to drive_file_id or cloudinary_public_id
    const fileId = v.drive_file_id || v.cloudinary_public_id || v.cloudiary_public_id;
    if (fileId) {
      const embed = `https://drive.google.com/file/d/${fileId}/preview`;
      console.log('Generated embed URL:', embed);
      return embed;
    }
    if (v.video_url) {
      console.log('Using video_url directly:', v.video_url);
      return v.video_url;
    }
    console.log('No valid embed URL found for video:', v);
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

        const questionsResponse = await getVideoQuizQuestions(Number(videoId));
        const questions =
          (
            questionsResponse as {
              questions: Array<{ id: number; question_text: string; [key: string]: unknown }>;
            }
          ).questions || [];
        setQuestions(questions);
        console.log('Video quiz questions loaded:', questions);

        // Load sections
        const sectionsData = await getVideoSections(Number(videoId));
        setSections(sectionsData.sections || []);

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

  const currentSection = sections.find(
    s => currentTime >= s.start_time && currentTime <= s.end_time
  );

  const currentQuestion = questions.find(q => q.section_id === currentSection?.id);

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
        {/* Main Column - only video container */}
        <div className="video-player-main">
          {/* Video Container */}
          <div className="video-container">
            {embedUrl ? (
              <>
                <iframe
                  src={embedUrl}
                  className="video-iframe"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  title={video.title}
                  onLoad={() => console.log('Iframe loaded:', embedUrl)}
                  onError={e => console.error('Iframe error:', e)}
                />
              </>
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
              className={`tab-btn ${activeTab === 'sections' ? 'active' : ''}`}
              onClick={() => setActiveTab('sections')}
            >
              <span className="material-symbols-outlined">menu_book</span>
              Sections
            </button>
            <button
              className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <span className="material-symbols-outlined">note_alt</span>
              Notes
            </button>
            <button
              className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              <span className="material-symbols-outlined">quiz</span>
              Quiz
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
            ) : activeTab === 'sections' ? (
              <div className="sections">
                {sections.map((section, index) => {
                  const sectionQuiz = questions.find(q => q.section_id === section.id);
                  return (
                    <div key={section.id} className="section-item">
                      <div className="section-time">
                        {formatTime(section.start_time)} - {formatTime(section.end_time)}
                      </div>
                      <h5 className="section-title">
                        <span className="section-index">
                          ({(index + 1).toString().padStart(2, '0')})
                        </span>{' '}
                        {section.title}
                        {sectionQuiz && (
                          <span className="section-quiz-badge" title="Quiz available">
                            <span className="material-symbols-outlined">quiz</span>
                          </span>
                        )}
                      </h5>
                      <div className="section-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: currentSection === section ? '100%' : '0%' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : activeTab === 'quiz' ? (
              <div className="quiz-carousel">
                {questions.length > 1 && (
                  <button
                    className="quiz-arrow quiz-arrow-left"
                    onClick={() =>
                      setCurrentQuizIndex(prev => (prev > 0 ? prev - 1 : questions.length - 1))
                    }
                    disabled={questions.length <= 1}
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                )}

                <div className="quiz-carousel-content">
                  {questions.length > 0 ? (
                    <>
                      <div className="quiz-carousel-counter">
                        Question {currentQuizIndex + 1} of {questions.length}
                        {submittedAnswers[questions[currentQuizIndex].id] && (
                          <span className="quiz-submitted-badge">Submitted</span>
                        )}
                      </div>
                      {(() => {
                        const question = questions[currentQuizIndex];
                        const section = sections.find(s => s.id === question.section_id);
                        const isSubmitted = submittedAnswers[question.id];
                        const selectedOption = selectedAnswers[question.id];

                        return (
                          <div key={question.id} className="quiz-section-item">
                            <div className="quiz-section-header">
                              <span className="quiz-section-index">Q{currentQuizIndex + 1}</span>
                              {section && (
                                <span className="quiz-section-ref">Section {section.title}</span>
                              )}
                            </div>
                            <p className="quiz-section-question">{question.question_text}</p>
                            <div className="quiz-section-options">
                              {question.options?.map((option, optIdx) => {
                                const optionLetter = String.fromCharCode(65 + optIdx);
                                const isCorrect =
                                  question.correct_answer === option ||
                                  question.correct_answer === optionLetter;
                                const isSelected = selectedOption === optIdx;
                                const wasWrong = isSubmitted && isSelected && !isCorrect;

                                return (
                                  <button
                                    key={optIdx}
                                    className={`quiz-section-option ${isSelected ? 'selected' : ''} ${isCorrect && isSubmitted ? 'correct' : ''} ${wasWrong ? 'incorrect' : ''}`}
                                    onClick={() => {
                                      if (!isSubmitted) {
                                        setSelectedAnswers(prev => ({
                                          ...prev,
                                          [question.id]: optIdx,
                                        }));
                                      }
                                    }}
                                    disabled={isSubmitted}
                                  >
                                    <span className="quiz-option-letter">{optionLetter}</span>
                                    <span>{option}</span>
                                    {isSubmitted && isCorrect && (
                                      <span className="material-symbols-outlined">
                                        check_circle
                                      </span>
                                    )}
                                    {isSubmitted && wasWrong && (
                                      <span className="material-symbols-outlined">cancel</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            {!isSubmitted && (
                              <button
                                className="quiz-submit-btn"
                                onClick={() => {
                                  if (selectedAnswers[question.id] !== undefined) {
                                    setSubmittedAnswers(prev => ({ ...prev, [question.id]: true }));
                                  }
                                }}
                                disabled={selectedAnswers[question.id] === undefined}
                              >
                                Submit Answer
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="quiz-empty">
                      <span className="material-symbols-outlined">quiz</span>
                      <h4>No quiz questions</h4>
                      <p>This video doesn't have any quiz questions.</p>
                    </div>
                  )}
                </div>

                {questions.length > 1 && (
                  <button
                    className="quiz-arrow quiz-arrow-right"
                    onClick={() =>
                      setCurrentQuizIndex(prev => (prev < questions.length - 1 ? prev + 1 : 0))
                    }
                    disabled={questions.length <= 1}
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                )}
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
    </div>
  );
}
