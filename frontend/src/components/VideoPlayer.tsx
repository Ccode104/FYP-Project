import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastProvider';
import './VideoPlayer.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  video_url: string;
  duration?: number;
  uploaded_by_name?: string;
  upload_timestamp?: string;
}

interface PlaylistItem {
  id: number;
  title: string;
  duration?: number;
  hasQuiz?: boolean;
  quizCount?: number;
  isLocked?: boolean;
}

interface VideoPlayerProps {
  video: Video;
  playlist?: PlaylistItem[];
  courseTitle?: string;
  instructorName?: string;
  instructorAvatar?: string;
  views?: number;
}

export default function VideoPlayer({
  video,
  playlist = [],
  courseTitle = 'Computer Science 402',
  instructorName = 'Dr. Aris Thorne',
  instructorAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOUPmp0Y-YBT4kVQpeHCJgs57ryDy7czGaeW_c0CXG3WH92RpzAEI68mG_QBBEhUJICAMI_ZYn3dqyou6ru3AKMOiytm2oEDWpb0rh_14x08vAR1tu1cGTFcYujd0x5ZA8TK7Sseq8mSF2YO0BTKxdR88I1HDXZqaRXb45YsjpLfz2eBVwNiPTi_Rd8L48-RxuSrO1C6CcXkY1tsDxeIbIEdFOXXSAAPnN8hN1hovnoIhU393RyF7N4xdnIHvce5UBRDFQ1HioJ30',
  views = 12400
}: VideoPlayerProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { push } = useToast();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [showQuizOverlay, setShowQuizOverlay] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'playlist' | 'notes'>('playlist');
  const [progress, setProgress] = useState(28);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSkipNext = () => {
    const currentIndex = playlist.findIndex(item => item.id === video.id);
    if (currentIndex < playlist.length - 1) {
      const nextVideo = playlist[currentIndex + 1];
      if (!nextVideo.isLocked) {
        navigate(`/videos/${nextVideo.id}`);
      } else {
        push({ kind: 'error', message: 'Next video is locked' });
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * (video.duration || 0);
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleFullscreen = () => {
    const container = videoRef.current?.parentElement?.parentElement;
    if (!document.fullscreenElement) {
      container?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleQuizSubmit = () => {
    if (selectedAnswer !== null) {
      push({ kind: 'success', message: 'Answer submitted successfully!' });
      setShowQuizOverlay(false);
      setSelectedAnswer(null);
      handlePlayPause();
    } else {
      push({ kind: 'error', message: 'Please select an answer' });
    }
  };

  const handleQuizSkip = () => {
    setShowQuizOverlay(false);
    setSelectedAnswer(null);
    handlePlayPause();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, []);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, currentTime]);

  const progressPercentage = video.duration ? (currentTime / video.duration) * 100 : 0;

  return (
    <div className="video-player-content">
      <main className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Video Player Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Main Player Container */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group">
              <video
                ref={videoRef}
                src={video.video_url}
                className="w-full h-full object-cover"
                onClick={handlePlayPause}
              />

              {/* Quiz Overlay */}
              {showQuizOverlay && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
                  <div className="max-w-md w-full bg-white rounded-xl p-8 shadow-2xl border border-indigo-100">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                        Knowledge Check
                      </span>
                      <span className="text-slate-400 text-xs">
                        Video paused at {formatTime(currentTime)}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold mb-6 text-slate-800">
                      Which of the following best describes the principle of "Neural Plasticity" discussed in this segment?
                    </h3>

                    <div className="space-y-3">
                      {[
                        "The brain's inability to change after childhood.",
                        "The brain's ability to reorganize itself by forming new neural connections.",
                        "A static network of fixed biological structures."
                      ].map((option, index) => (
                        <button
                          key={index}
                          className={`w-full text-left p-4 rounded-lg border transition-all group flex items-center gap-3 ${
                            selectedAnswer === index
                              ? 'border-2 border-indigo-500 bg-indigo-50'
                              : 'border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50'
                          }`}
                          onClick={() => setSelectedAnswer(index)}
                        >
                          <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            selectedAnswer === index
                              ? 'border-indigo-500'
                              : 'border-slate-300 group-hover:border-indigo-500'
                          }`}>
                            {selectedAnswer === index && (
                              <span className="h-2.5 w-2.5 bg-indigo-500 rounded-full"></span>
                            )}
                          </span>
                          <span className={`text-sm font-medium ${
                            selectedAnswer === index ? 'text-indigo-700' : ''
                          }`}>
                            {option}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-8 flex gap-3">
                      <button
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors"
                        onClick={handleQuizSubmit}
                      >
                        Submit Answer
                      </button>
                      <button
                        className="px-4 text-slate-500 hover:text-slate-700 text-sm font-medium"
                        onClick={handleQuizSkip}
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Player Controls */}
              <div
                className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0'
                }`}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => isPlaying && setShowControls(false)}
              >
                {/* Progress Bar */}
                <div
                  className="relative w-full h-1.5 bg-white/20 rounded-full mb-6 cursor-pointer overflow-hidden"
                  onClick={handleProgressClick}
                >
                  <div
                    className="absolute left-0 top-0 h-full bg-indigo-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-white rounded-full shadow-lg"
                    style={{ left: `calc(${progressPercentage}% - 8px)` }}
                  ></div>
                  {/* Quiz Markers */}
                  <div className="absolute left-[40%] top-0 h-full w-1 bg-yellow-400" title="Quiz point"></div>
                  <div className="absolute left-[85%] top-0 h-full w-1 bg-yellow-400" title="Quiz point"></div>
                </div>

                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-6">
                    <button
                      className="hover:text-indigo-400 transition-colors"
                      onClick={handlePlayPause}
                    >
                      <span
                        className="material-symbols-outlined text-3xl"
                        style={{ fontVariationSettings: isPlaying ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {isPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                    <button
                      className="hover:text-indigo-400 transition-colors"
                      onClick={handleSkipNext}
                    >
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        skip_next
                      </span>
                    </button>
                    <div className="flex items-center gap-3 group/volume">
                      <span className="material-symbols-outlined text-2xl">volume_up</span>
                      <div className="w-20 h-1 bg-white/20 rounded-full">
                        <div
                          className="h-full bg-white rounded-full transition-all"
                          style={{ width: `${volume * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-mono">
                      {formatTime(currentTime)} / {formatTime(video.duration || 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <button className="flex items-center gap-1 text-sm font-bold hover:text-indigo-400 transition-colors">
                      <span>1080p</span>
                      <span className="material-symbols-outlined text-lg">settings</span>
                    </button>
                    <button className="hover:text-indigo-400 transition-colors">
                      <span className="material-symbols-outlined text-2xl">closed_caption</span>
                    </button>
                    <button
                      className="hover:text-indigo-400 transition-colors"
                      onClick={handleFullscreen}
                    >
                      <span className="material-symbols-outlined text-2xl">fullscreen</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Info Section */}
            <div className="bg-white rounded-xl p-8 border border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">
                    {video.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-lg">calendar_today</span>
                      {video.upload_timestamp ? new Date(video.upload_timestamp).toLocaleDateString() : 'Oct 12, 2023'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-lg">school</span>
                      {courseTitle}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-lg">visibility</span>
                      {views.toLocaleString()} views
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors">
                    <span className="material-symbols-outlined text-lg">share</span>
                    Share
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors">
                    <span className="material-symbols-outlined text-lg">bookmark</span>
                    Save
                  </button>
                </div>
              </div>

              {video.description && (
                <div className="mt-8 pt-8 border-t border-slate-100 flex items-start gap-4">
                  <img
                    alt="Instructor avatar"
                    className="h-12 w-12 rounded-full object-cover"
                    src={instructorAvatar}
                  />
                  <div>
                    <h4 className="font-bold text-slate-900">{instructorName}</h4>
                    <p className="text-sm text-slate-500 mb-4">Head of Neuro-Informatics Department</p>
                    <p className="text-slate-600 leading-relaxed max-w-2xl">
                      {video.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden sticky top-24">
              {/* Sidebar Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  className={`flex-1 py-4 text-sm font-bold border-b-2 flex items-center justify-center gap-2 ${
                    activeTab === 'playlist'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  onClick={() => setActiveTab('playlist')}
                >
                  <span className="material-symbols-outlined text-lg">playlist_play</span>
                  Playlist
                </button>
                <button
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${
                    activeTab === 'notes'
                      ? 'border-indigo-600 text-indigo-600 border-b-2'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  onClick={() => setActiveTab('notes')}
                >
                  <span className="material-symbols-outlined text-lg">note_alt</span>
                  Notes
                </button>
              </div>

              {/* Playlist Content */}
              {activeTab === 'playlist' && (
                <div className="p-4 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {playlist.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`group flex gap-4 p-3 rounded-xl transition-colors cursor-pointer border ${
                        item.id === video.id
                          ? 'bg-indigo-50 border-indigo-100'
                          : 'hover:bg-slate-50 border-transparent'
                      }`}
                      onClick={() => !item.isLocked && navigate(`/videos/${item.id}`)}
                    >
                      <div className="relative w-28 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                        <img
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          src={`https://picsum.photos/seed/video${item.id}/112/64.jpg`}
                          alt={item.title}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span
                            className="material-symbols-outlined text-white"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {item.isLocked ? 'lock' : 'play_circle'}
                          </span>
                        </div>
                        {item.duration && (
                          <span className="absolute bottom-1 right-1 bg-black/70 text-[10px] text-white px-1 rounded font-bold">
                            {formatTime(item.duration)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        {item.id === video.id && (
                          <h5 className="text-xs font-bold text-indigo-600 uppercase tracking-tighter mb-1">
                            Playing Now
                          </h5>
                        )}
                        <h4 className={`text-sm font-bold truncate leading-tight ${
                          item.id === video.id
                            ? 'text-slate-800'
                            : 'text-slate-700 group-hover:text-indigo-600 transition-colors'
                        }`}>
                          {idx + 1}. {item.title}
                        </h4>
                        <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          {item.isLocked ? (
                            <>
                              <span className="material-symbols-outlined text-[14px]">lock</span>
                              Locked
                            </>
                          ) : item.hasQuiz ? (
                            <>
                              <span className="material-symbols-outlined text-[14px]">quiz</span>
                              {item.quizCount || 1} {item.quizCount === 1 ? 'Quiz' : 'Quizzes'}
                            </>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes Empty State */}
              {activeTab === 'notes' && (
                <div className="p-8 text-center">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-400">edit_note</span>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1">No notes yet</h4>
                  <p className="text-sm text-slate-500 mb-6">
                    Capture key moments and thoughts while you watch.
                  </p>
                  <button className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                    Add Initial Note
                  </button>
                </div>
              )}
            </div>

            {/* Course Progress Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-900">Course Completion</h4>
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                  {progress}% Done
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full mb-6">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                You're doing great! Complete 2 more lectures this week to stay on track for your certification goal.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
