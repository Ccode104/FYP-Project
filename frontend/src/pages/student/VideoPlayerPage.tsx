import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';
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
  const [isInteractiveMode, setIsInteractiveMode] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const [lastQuizTimestamp, setLastQuizTimestamp] = useState<number | null>(null);
  const [activeOverlayQuiz, setActiveOverlayQuiz] = useState<QuizQuestion | null>(null);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const sectionsRef = useRef<Record<number, HTMLDivElement | null>>({});
  const quizRef = useRef<Record<number, HTMLDivElement | null>>({});

  // Extract YouTube ID from URL or public_id
  const getYouTubeId = (v: Video | null) => {
    if (!v) return null;
    const sources = [v.video_url, v.embed_url, v.cloudinary_public_id];
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    
    for (const src of sources) {
      if (!src) continue;
      const match = src.match(regExp);
      if (match && match[2].length === 11) {
        return match[2];
      }
      // If it's just the 11-char ID
      if (src.length === 11 && !src.includes('/') && !src.includes('.')) {
        return src;
      }
    }
    return null;
  };

  const youtubeId = useMemo(() => getYouTubeId(video), [video]);
  
  const embedUrl = useMemo(() => {
    if (!video) return '';
    if (video.embed_url) return video.embed_url;
    const fileId = video.drive_file_id || video.cloudinary_public_id;
    if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
    return video.video_url || '';
  }, [video]);

  const youtubeOpts = useMemo(() => ({
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      origin: window.location.origin, // Important for postMessage errors
    },
  }), []);

  useEffect(() => {
    if (!videoId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const videoData = (await getVideoById(Number(videoId))) as { video: Video };
        setVideo(videoData.video);
        setViews(videoData.video.views || 0);
        
        // Use uploaded_by_name as initial instructor name
        setInstructorName(videoData.video.uploaded_by_name || '');

        const questionsResponse = await getVideoQuizQuestions(Number(videoId));
        const questions =
          (
            questionsResponse as {
              questions: Array<{ id: number; question_text: string; [key: string]: unknown }>;
            }
          ).questions || [];
        setQuestions(questions);
        console.log('Video quiz questions loaded:', questions.map(q => ({ id: q.id, timestamp: q.timestamp })));

        // Load sections
        const sectionsData = await getVideoSections(Number(videoId));
        setSections(sectionsData.sections || []);

        if (videoData.video.course_offering_id) {
          const cid = videoData.video.course_offering_id;
          try {
            const courseResponse = await apiFetch(`/api/student/courses/${cid}`);
            setCourseTitle(courseResponse.course_title || '');
            if (courseResponse.instructor_name) {
              setInstructorName(courseResponse.instructor_name);
            }
            setInstructorAvatar(courseResponse.instructor_avatar || '');
          } catch {
            setCourseTitle('');
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

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [videoId]);

  // Effect to handle time updates and quiz triggers
  useEffect(() => {
    console.log('Effect re-run:', { hasPlayer: !!player, isPlaying, isInteractiveMode, questionsCount: questions.length });
    if (player && isPlaying) {
      console.log('Video playing, starting time update interval');
      timeUpdateInterval.current = setInterval(() => {
        try {
          const time = player.getCurrentTime();
          setCurrentTime(time);

          if (isInteractiveMode && !showQuiz) {
            // Find the closest quiz question
            const quizToTrigger = questions.find(q => {
              const qTime = Number(q.timestamp);
              // Log every 2 seconds to avoid spamming, but show proximity
              if (Math.round(time) % 2 === 0 && Math.abs(qTime - time) < 10) {
                console.log(`Checking quiz trigger: Time=${time.toFixed(1)}, QuestionTime=${qTime}, Diff=${Math.abs(qTime - time).toFixed(1)}`);
              }
              return (
                qTime && 
                Math.abs(qTime - time) < 1.0 && 
                q.id !== lastQuizTimestamp
              );
            });

            if (quizToTrigger && !quizAnswered) {
              console.log('!!! TRIGGERING QUIZ OVERLAY !!!', quizToTrigger.id);
              
              if (typeof player.pauseVideo === 'function') {
                player.pauseVideo();
                setIsPlaying(false);
                setActiveOverlayQuiz(quizToTrigger);
                setShowQuiz(true);
                setLastQuizTimestamp(quizToTrigger.id);
                
                const idx = questions.findIndex(q => q.id === quizToTrigger.id);
                if (idx !== -1) setCurrentQuizIndex(idx);
              }
            }
          }

          // Auto-sync currentQuizIndex based on time if not in overlay mode
          if (!showQuiz && questions.length > 0) {
            let latestPassedIdx = -1;
            for (let i = 0; i < questions.length; i++) {
              const qTime = Number(questions[i].timestamp);
              if (qTime && qTime <= time) {
                latestPassedIdx = i;
              } else if (qTime && qTime > time) {
                break;
              }
            }
            if (latestPassedIdx !== -1 && latestPassedIdx !== currentQuizIndex) {
              setCurrentQuizIndex(latestPassedIdx);
            }
          }
        } catch (err) {
          console.error('Error in time update interval:', err);
        }
      }, 250);
    } else {
      console.log('Video paused or player not ready, clearing interval');
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    }

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [player, isPlaying, isInteractiveMode, questions, lastQuizTimestamp, quizAnswered]);

  const onPlayerReady = (event: any) => {
    setPlayer(event.target);
  };

  const onPlayerStateChange = (event: any) => {
    console.log('YouTube Player State Change:', event.data);
    // 1 = playing, 2 = paused, 3 = buffering
    if (event.data === 1) setIsPlaying(true);
    else if (event.data === 2) setIsPlaying(false);
  };

  const handleSectionClick = (startTime: number) => {
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(startTime, true);
      player.playVideo();
    } else {
      console.warn('Seeking is only supported for YouTube videos in the current version.');
      alert('Seeking and auto-pause are currently only available for YouTube-hosted videos. Google Drive videos do not support external control.');
    }
  };

  const handleQuizSubmit = () => {
    if (!activeOverlayQuiz || selectedAnswer === null) return;
    
    const questionId = activeOverlayQuiz.id;
    
    // Sync with sidebar state
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: selectedAnswer
    }));
    setSubmittedAnswers(prev => ({
      ...prev,
      [questionId]: true
    }));
    
    setQuizAnswered(true);

    // After a delay to show feedback, resume video
    setTimeout(() => {
      setShowQuiz(false);
      setActiveOverlayQuiz(null);
      setQuizAnswered(false);
      setSelectedAnswer(null);
      if (player) {
        player.playVideo();
        setIsPlaying(true);
      }
    }, 2500); // Slightly longer to let them read feedback
  };

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

  // Auto-scroll logic (localized to container)
  useEffect(() => {
    if (currentSection && activeTab === 'sections') {
      const el = sectionsRef.current[currentSection.id];
      if (el) {
        const container = el.parentElement;
        if (container) {
          container.scrollTo({
            top: el.offsetTop - container.offsetTop - 20,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentSection, activeTab]);

  useEffect(() => {
    if (activeTab === 'quiz' && questions[currentQuizIndex]) {
      const el = quizRef.current[questions[currentQuizIndex].id];
      if (el) {
        const container = el.parentElement;
        if (container) {
          container.scrollTo({
            top: el.offsetTop - container.offsetTop - 20,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentQuizIndex, activeTab]);

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
          {/* Interactive Mode Toggle - Moved above video */}
          <div className="video-player-controls-top">
            {!youtubeId && (
              <div className="unsupported-warning" title="Interactive features (seeking/auto-pause) are limited for non-YouTube videos.">
                <span className="material-symbols-outlined">warning</span>
                Limited Mode
              </div>
            )}
            <label className="interactive-toggle">
              <input 
                type="checkbox" 
                checked={isInteractiveMode} 
                onChange={(e) => setIsInteractiveMode(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Interactive Mode</span>
            </label>
          </div>

          {/* Video Container */}
          <div className="video-container">
            {youtubeId ? (
              <YouTube
                videoId={youtubeId}
                className="video-iframe"
                containerClassName="youtube-container"
                opts={youtubeOpts}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
              />
            ) : embedUrl ? (
              <iframe
                src={embedUrl}
                className="video-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                title={video.title}
                onLoad={() => console.log('Iframe loaded:', embedUrl)}
                onError={e => console.error('Iframe error:', e)}
              />
            ) : (
              <div className="video-placeholder">
                <span className="material-symbols-outlined">movie</span>
                <p>Video not available</p>
              </div>
            )}

            {/* Quiz Overlay - Appears when quiz timestamp is reached */}
            {showQuiz && activeOverlayQuiz && !quizAnswered && (
              <div className="quiz-overlay">
                <div className="quiz-card">
                  <div className="quiz-header">
                    <span className="quiz-badge">Knowledge Check</span>
                    <span className="quiz-timestamp">
                      Video paused at {formatTime(currentTime)}
                    </span>
                  </div>
                  <h3 className="quiz-question">{activeOverlayQuiz.question_text}</h3>
                  <div className="quiz-options">
                    {activeOverlayQuiz.options?.map((option, idx) => {
                      const isCorrect = activeOverlayQuiz.correct_answer === option || 
                                      activeOverlayQuiz.correct_answer === String.fromCharCode(65 + idx);
                      const isSelected = selectedAnswer === idx;
                      
                      let optionClass = '';
                      if (quizAnswered) {
                        if (isCorrect) optionClass = 'correct';
                        else if (isSelected) optionClass = 'incorrect';
                      } else if (isSelected) {
                        optionClass = 'selected';
                      }

                      return (
                        <button
                          key={idx}
                          className={`quiz-option ${optionClass}`}
                          onClick={() => !quizAnswered && setSelectedAnswer(idx)}
                          disabled={quizAnswered}
                        >
                          <span className="quiz-option-radio" />
                          <span className="quiz-option-text">{option}</span>
                          {quizAnswered && isCorrect && (
                            <span className="material-symbols-outlined quiz-feedback-icon correct">check_circle</span>
                          )}
                          {quizAnswered && isSelected && !isCorrect && (
                            <span className="material-symbols-outlined quiz-feedback-icon incorrect">cancel</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {quizAnswered && (
                    <div className={`quiz-feedback-msg ${
                      (activeOverlayQuiz.options?.[selectedAnswer!] === activeOverlayQuiz.correct_answer || 
                       String.fromCharCode(65 + selectedAnswer!) === activeOverlayQuiz.correct_answer)
                      ? 'correct' : 'incorrect'
                    }`}>
                      { (activeOverlayQuiz.options?.[selectedAnswer!] === activeOverlayQuiz.correct_answer || 
                         String.fromCharCode(65 + selectedAnswer!) === activeOverlayQuiz.correct_answer)
                        ? '✨ Correct! Well done.' 
                        : `❌ Incorrect. The correct answer was ${activeOverlayQuiz.correct_answer}.`
                      }
                    </div>
                  )}

                  <div className="quiz-actions">
                    {!quizAnswered ? (
                      <>
                        <button
                          className="quiz-submit"
                          disabled={selectedAnswer === null}
                          onClick={handleQuizSubmit}
                        >
                          Submit Answer
                        </button>
                        <button className="quiz-skip" onClick={() => { setShowQuiz(false); setActiveOverlayQuiz(null); }}>
                          Skip for now
                        </button>
                      </>
                    ) : (
                      <div className="quiz-auto-resume">
                        Resuming video in a moment...
                      </div>
                    )}
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
                    <div 
                      key={section.id} 
                      ref={el => sectionsRef.current[section.id] = el}
                      className={`section-item ${currentSection === section ? 'active' : ''}`}
                      onClick={() => handleSectionClick(section.start_time)}
                    >
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
                          <div 
                            key={question.id} 
                            ref={el => quizRef.current[question.id] = el}
                            className={`quiz-section-item ${currentQuizIndex === questions.findIndex(q => q.id === question.id) ? 'active' : ''}`}
                          >
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
                {courseTitle && (
                  <span className="meta-item">
                    <span className="material-symbols-outlined">school</span>
                    {courseTitle}
                  </span>
                )}
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

          {instructorName && (
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
          )}
        </div>
      </div>
    </div>
  );
}
