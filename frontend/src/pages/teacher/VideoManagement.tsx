import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/ToastProvider';
import Modal from '../../components/Modal';
import DriveUpload from '../../components/DriveUpload';
import YouTubeLink from '../../components/YouTubeLink';
import YouTubeUpload from '../../components/YouTubeUpload';
import './VideoManagement.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_url: string;
  drive_file_id?: string;
  duration: number;
  upload_timestamp: string;
  views?: number;
  module?: string;
  uploaded_by_name?: string;
}

interface CourseInfo {
  courseName: string;
  instructorName: string;
}

interface VideoStats {
  totalViews: number;
  totalHours: number;
  avgCompletion: number;
  dropOffRate: number;
}

export default function VideoManagement() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [videos, setVideos] = useState<Video[]>([]);
  const [courseInfo, setCourseInfo] = useState<CourseInfo>({
    courseName: '',
    instructorName: '',
  });
  const [stats, setStats] = useState<VideoStats>({
    totalViews: 0,
    totalHours: 0,
    avgCompletion: 0,
    dropOffRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    videoId: number | null;
    videoTitle: string;
  }>({
    show: false,
    videoId: null,
    videoTitle: '',
  });
  const [overlayInfo, setOverlayInfo] = useState<{
    [key: number]: { courseName: string; videoName: string; instructorName: string };
  }>({});
  const [uploadType, setUploadType] = useState<'drive' | 'youtube' | 'youtube-upload'>('drive');
  const videosPerPage = 10;
  const { push } = useToast();

  useEffect(() => {
    if (!courseId) return;

    const loadCourseInfo = async () => {
      try {
        const data = await apiFetch<{ course_name: string; instructor_name: string }>(
          `/api/courses/${courseId}`
        );
        setCourseInfo({
          courseName: data.course_name || '',
          instructorName: data.instructor_name || '',
        });
      } catch (err) {
        console.error('Failed to load course info:', err);
      }
    };

    const loadVideos = async () => {
      setLoading(true);
      try {
        const { getVideosByCourseOffering } = await import('../../features/videos/api/videos');
        const data = await getVideosByCourseOffering(courseId);

        const videoList = data.videos || [];
        setVideos(videoList);

        // Set course info from API response
        if (data.course_name) {
          setCourseInfo({
            courseName: data.course_name,
            instructorName: data.instructor_name || '',
          });
        }

        // Build overlay info for each video
        const overlayData: {
          [key: number]: { courseName: string; videoName: string; instructorName: string };
        } = {};
        videoList.forEach((v: Video) => {
          const courseName = data.course_name || '';
          const instructorName = data.instructor_name || v.uploaded_by_name || '';
          overlayData[v.id] = {
            courseName,
            videoName: v.title || '',
            instructorName,
          };
        });
        setOverlayInfo(overlayData);

        // Calculate mock stats based on video data
        const totalViews = videoList.reduce(
          (sum: number, v: Video) => sum + (v.views || Math.floor(Math.random() * 2000) + 500),
          0
        );
        const totalDuration = videoList.reduce(
          (sum: number, v: Video) => sum + (v.duration || 0),
          0
        );
        const totalHours = Math.round((totalDuration / 3600) * 10) / 10;

        setStats({
          totalViews,
          totalHours,
          avgCompletion: Math.floor(Math.random() * 20) + 70,
          dropOffRate: Math.floor(Math.random() * 8) + 8,
        });
      } catch (err) {
        console.error('Failed to load videos:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCourseInfo();
    loadVideos();
  }, [courseId]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const getFocusPercentage = () => {
    return Math.floor(Math.random() * 30) + 60;
  };

  const indexOfLastVideo = currentPage * videosPerPage;
  const indexOfFirstVideo = indexOfLastVideo - videosPerPage;
  const currentVideos = videos.slice(indexOfFirstVideo, indexOfLastVideo);
  const totalPages = Math.ceil(videos.length / videosPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const getModuleFromIndex = (index: number) => {
    const modules = [
      'Advanced AI Module',
      'Core Infrastructure',
      'Security Fundamentals',
      'Database Systems',
      'Web Architecture',
    ];
    return modules[index % modules.length];
  };

  const checkGoogleConnection = useCallback(async () => {
    try {
      const data = await apiFetch<{ connected: boolean }>('/api/auth/google/status');
      setGoogleConnected(data.connected);
    } catch {
      setGoogleConnected(false);
    }
  }, []);

  const handleAuthorizeGoogle = async () => {
    try {
      setGoogleLoading(true);
      sessionStorage.setItem('google_oauth_return_url', window.location.href);
      const data = await apiFetch<{ authUrl: string }>('/api/auth/google');
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      push({ kind: 'error', message: 'Failed to authorize Google account' });
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    void checkGoogleConnection();
  }, [checkGoogleConnection]);

  const handleDeleteClick = (e: React.MouseEvent, videoId: number, videoTitle: string) => {
    e.stopPropagation();
    setDeleteConfirm({ show: true, videoId, videoTitle });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.videoId) return;

    setDeletingVideoId(deleteConfirm.videoId);
    setDeleteConfirm({ show: false, videoId: null, videoTitle: '' });

    try {
      const { deleteVideo } = await import('../../features/videos/api/videos');
      await deleteVideo(deleteConfirm.videoId);

      setVideos(prev => prev.filter(v => v.id !== deleteConfirm.videoId));
      push({ kind: 'success', message: 'Video deleted successfully' });
    } catch (err) {
      console.error('Failed to delete video:', err);
      push({ kind: 'error', message: 'Failed to delete video' });
    } finally {
      setDeletingVideoId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, videoId: null, videoTitle: '' });
  };

  if (loading) {
    return (
      <div className="video-management-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-management-page">
      {/* Top Navigation */}
      <header className="vm-topbar">
        <div className="vm-breadcrumb">
          <span>CS-402</span>
          <span>/</span>
          <span>Video Management</span>
        </div>
        <div className="vm-topbar-actions">
          <div className="vm-search-box">
            <span className="material-symbols-outlined">search</span>
            <input type="text" placeholder="Search videos..." />
          </div>
          <button className="vm-icon-btn">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="vm-icon-btn">
            <span className="material-symbols-outlined">dark_mode</span>
          </button>
          <div className="vm-user-avatar"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="vm-main">
        {/* Header Section */}
        <div className="vm-header">
          <div className="vm-header-content">
            <div className="vm-badge">Instructor View</div>
            <h1 className="vm-title">Video Management</h1>
            <p className="vm-description">
              A curated archive of course lectures. Manage your video assets and track student
              engagement.
            </p>
          </div>
          <div className="vm-header-actions">
            {googleConnected ? (
              <button 
                className="vm-btn-secondary connected" 
                onClick={handleAuthorizeGoogle}
                title="Click to refresh permissions or reconnect your account"
              >
                <span className="material-symbols-outlined">cloud_done</span>
                Drive Connected
              </button>
            ) : (
              <button
                className="vm-btn-secondary"
                onClick={handleAuthorizeGoogle}
                disabled={googleLoading}
              >
                <span className="material-symbols-outlined">cloud_upload</span>
                {googleLoading ? 'Connecting...' : 'Connect Google Drive'}
              </button>
            )}
            <button 
              className="vm-btn-secondary" 
              onClick={() => {
                setUploadType('youtube-upload');
                setShowUploadModal(true);
              }}
            >
              <span className="material-symbols-outlined">video_call</span>
              YouTube Upload
            </button>
            <button 
              className="vm-btn-secondary" 
              onClick={() => {
                setUploadType('youtube');
                setShowUploadModal(true);
              }}
            >
              <span className="material-symbols-outlined">link</span>
              YouTube Link
            </button>
            <button 
              className="vm-btn-primary" 
              onClick={() => {
                setUploadType('drive');
                setShowUploadModal(true);
              }}
            >
              <span className="material-symbols-outlined">upload</span>
              Upload Lecture
            </button>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="vm-bento-grid">
          {/* Analytics Section */}
          <div className="vm-analytics-section">
            <div className="vm-analytics-card">
              <div className="vm-analytics-header">
                <h3>Quarterly Engagement</h3>
                <span className="material-symbols-outlined vm-trend-up">trending_up</span>
              </div>
              <div className="vm-analytics-stats">
                <div className="vm-stat-item">
                  <div className="vm-stat-label">
                    <span>Average Completion Rate</span>
                    <span className="vm-stat-value">{stats.avgCompletion}%</span>
                  </div>
                  <div className="vm-stat-bar">
                    <div
                      className="vm-stat-fill tertiary"
                      style={{ width: `${stats.avgCompletion}%` }}
                    ></div>
                  </div>
                </div>
                <div className="vm-stat-item">
                  <div className="vm-stat-label">
                    <span>Student Retention (Drop-off)</span>
                    <span className="vm-stat-value error">{stats.dropOffRate}%</span>
                  </div>
                  <div className="vm-stat-bar">
                    <div
                      className="vm-stat-fill error"
                      style={{ width: `${stats.dropOffRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="vm-stats-grid">
              <div className="vm-stat-box">
                <p className="vm-stat-label-small">Total Views</p>
                <p className="vm-stat-number">{formatViews(stats.totalViews)}</p>
              </div>
              <div className="vm-stat-box">
                <p className="vm-stat-label-small">Hours Streamed</p>
                <p className="vm-stat-number">{stats.totalHours}h</p>
              </div>
            </div>
          </div>

          {/* Quote Section */}
          <div className="vm-quote-section">
            <span className="vm-quote-icon material-symbols-outlined">auto_awesome</span>
            <p className="vm-quote-text">
              "Visual clarity in technical instruction isn't just about resolution; it's about the
              spatial arrangement of logic."
            </p>
            <p className="vm-quote-author">— Professor's Handbook</p>
          </div>
        </div>

        {/* Video Library */}
        <div className="vm-video-library">
          <div className="vm-library-header">
            <h2>Recorded Sessions</h2>
            <div className="vm-view-toggle">
              <button
                className={`vm-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <span className="material-symbols-outlined">grid_view</span>
              </button>
              <button
                className={`vm-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <span className="material-symbols-outlined">list</span>
              </button>
            </div>
          </div>

          <div className={`vm-video-list ${viewMode}`}>
            {currentVideos.map((video, idx) => {
              const focus = getFocusPercentage();
              const isFeatured = idx === 0;

              return (
                <div
                  key={video.id}
                  className={`vm-video-card ${viewMode} ${isFeatured ? 'featured' : ''}`}
                  onClick={() => navigate(`/videos/${video.id}`)}
                >
                  <div className="vm-video-thumbnail">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} />
                    ) : (
                      <div className="vm-thumbnail-placeholder">
                        <span className="material-symbols-outlined">videocam</span>
                      </div>
                    )}
                    <div className="vm-play-overlay">
                      <span className="material-symbols-outlined">play_circle</span>
                      {overlayInfo[video.id] && (
                        <div className="vm-overlay-info">
                          <span className="vm-overlay-video-name">
                            {overlayInfo[video.id].videoName.length > 30
                              ? `${overlayInfo[video.id].videoName.slice(0, 30)}...`
                              : overlayInfo[video.id].videoName}
                          </span>
                          <span className="vm-overlay-meta">
                            {overlayInfo[video.id].instructorName
                              ? `by ${overlayInfo[video.id].instructorName}`
                              : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="vm-duration">{formatDuration(video.duration || 3600)}</div>
                  </div>

                  <div className="vm-video-info">
                    <div className="vm-video-header-row">
                      <h4 className="vm-video-title">{video.title || `Lecture ${idx + 1}`}</h4>
                      <div className="vm-video-actions">
                        <span className="material-symbols-outlined">analytics</span>
                        <span
                          className="material-symbols-outlined edit"
                          onClick={e => {
                            e.stopPropagation();
                            console.log('[DEBUG VideoManagement] Edit clicked:', {
                              courseId,
                              videoId: video.id,
                              title: video.title,
                            });
                            navigate(`/courses/${courseId}/videos/${video.id}/edit`);
                          }}
                          title="Edit video details and questions"
                        >
                          edit
                        </span>
                        <span
                          className="material-symbols-outlined delete"
                          onClick={e => handleDeleteClick(e, video.id, video.title)}
                          title="Delete video"
                        >
                          delete
                        </span>
                      </div>
                    </div>
                    <p className="vm-video-meta">
                      {video.description
                        ? `${video.description.slice(0, 80)}${video.description.length > 80 ? '...' : ''}`
                        : ''}
                    </p>
                    <div className="vm-video-stats">
                      <div className="vm-video-stat">
                        <span className="material-symbols-outlined">visibility</span>
                        <span>
                          {formatViews(video.views || Math.floor(Math.random() * 2000) + 500)}
                        </span>
                      </div>
                      <div className="vm-video-stat">
                        <span className="material-symbols-outlined">bar_chart</span>
                        <span className={focus >= 80 ? 'tertiary' : ''}>{focus}% Focus</span>
                      </div>
                      {isFeatured && <div className="vm-featured-badge">Featured</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="vm-pagination">
              <button
                className="vm-pagination-btn"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <span className="vm-pagination-info">
                Page {String(currentPage).padStart(2, '0')} of {String(totalPages).padStart(2, '0')}
              </span>
              <button
                className="vm-pagination-btn primary"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="vm-footer">
        <span>© 2024 Unified Academic Portal. Designed for Excellence.</span>
        <div className="vm-footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact Support</a>
        </div>
      </footer>

      <Modal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={uploadType === 'drive' ? "Upload to Google Drive" : "Link YouTube Video"}
      >
        <div className="upload-type-tabs">
          <button 
            className={`upload-tab ${uploadType === 'drive' ? 'active' : ''}`}
            onClick={() => setUploadType('drive')}
          >
            Google Drive
          </button>
          <button 
            className={`upload-tab ${uploadType === 'youtube-upload' ? 'active' : ''}`}
            onClick={() => setUploadType('youtube-upload')}
          >
            YouTube Upload
          </button>
          <button 
            className={`upload-tab ${uploadType === 'youtube' ? 'active' : ''}`}
            onClick={() => setUploadType('youtube')}
          >
            YouTube Link
          </button>
        </div>

        {uploadType === 'drive' ? (
          !googleConnected ? (
            <div className="upload-notice">
              <p>
                To upload lectures, please connect your Google account first using the button above.
              </p>
            </div>
          ) : (
            <DriveUpload
              courseOfferingId={courseId || ''}
              onUploadSuccess={() => {
                setShowUploadModal(false);
                if (courseId) {
                  const loadVideos = async () => {
                    try {
                      const { getVideosByCourseOffering } =
                        await import('../../features/videos/api/videos');
                      const data = await getVideosByCourseOffering(courseId);
                      const videoList = (data as { videos?: unknown[] }).videos || [];
                      setVideos(videoList as Video[]);
                    } catch (err) {
                      console.error('Failed to reload videos:', err);
                    }
                  };
                  loadVideos();
                }
              }}
              onClose={() => setShowUploadModal(false)}
            />
          )
        ) : uploadType === 'youtube-upload' ? (
          !googleConnected ? (
            <div className="upload-notice">
              <p>
                To upload to YouTube, please connect your Google account first using the button above.
              </p>
            </div>
          ) : (
            <YouTubeUpload
              courseOfferingId={courseId || ''}
              onUploadSuccess={() => {
                setShowUploadModal(false);
                if (courseId) {
                  const loadVideos = async () => {
                    try {
                      const { getVideosByCourseOffering } =
                        await import('../../features/videos/api/videos');
                      const data = await getVideosByCourseOffering(courseId);
                      const videoList = (data as { videos?: unknown[] }).videos || [];
                      setVideos(videoList as Video[]);
                    } catch (err) {
                      console.error('Failed to reload videos:', err);
                    }
                  };
                  loadVideos();
                }
              }}
              onClose={() => setShowUploadModal(false)}
            />
          )
        ) : (
          <YouTubeLink
            courseOfferingId={courseId || ''}
            onSuccess={() => {
              setShowUploadModal(false);
              // Reload videos
              if (courseId) {
                const loadVideos = async () => {
                  try {
                    const { getVideosByCourseOffering } =
                      await import('../../features/videos/api/videos');
                    const data = await getVideosByCourseOffering(courseId);
                    const videoList = (data as { videos?: unknown[] }).videos || [];
                    setVideos(videoList as Video[]);
                  } catch (err) {
                    console.error('Failed to reload videos:', err);
                  }
                };
                loadVideos();
              }
            }}
            onClose={() => setShowUploadModal(false)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirm.show} onClose={handleCancelDelete} title="Delete Video">
        <div className="delete-confirm-content">
          <p>
            Are you sure you want to delete <strong>"{deleteConfirm.videoTitle}"</strong>?
          </p>
          <p className="delete-warning">
            This action cannot be undone. All quiz questions associated with this video will also be
            deleted.
          </p>
          <div className="delete-confirm-actions">
            <button className="vm-btn-secondary" onClick={handleCancelDelete}>
              Cancel
            </button>
            <button
              className="vm-btn-danger"
              onClick={handleConfirmDelete}
              disabled={deletingVideoId !== null}
            >
              {deletingVideoId ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
