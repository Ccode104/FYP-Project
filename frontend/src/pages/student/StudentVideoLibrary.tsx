import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import './StudentVideoLibrary.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  video_url: string;
  duration: number | null;
  upload_timestamp: string;
  uploaded_by_name?: string;
}

interface CourseInfo {
  course_code: string;
  course_title: string;
}

export default function StudentVideoLibrary() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [videos, setVideos] = useState<Video[]>([]);
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lecture' | 'tutorial' | 'lab'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [progress, setProgress] = useState<Record<number, number>>({});

  useEffect(() => {
    async function loadVideos() {
      if (!courseId) return;

      try {
        // Get course info
        const courseData = await apiFetch(`/api/student/courses/${courseId}`);
        setCourseInfo(courseData);

        // Get videos for this course
        const videosData = await apiFetch(`/api/videos/course/${courseId}`);
        setVideos(videosData.videos || []);

        // Generate mock progress for demo (in real app, track from video_progress table)
        const mockProgress: Record<number, number> = {};
        (videosData.videos || []).forEach((v: Video, idx: number) => {
          mockProgress[v.id] = Math.floor(Math.random() * 101);
        });
        setProgress(mockProgress);
      } catch (err) {
        console.error('Failed to load videos:', err);
      } finally {
        setLoading(false);
      }
    }

    loadVideos();
  }, [courseId]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '00:00';
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

  const getVideoThumbnail = (index: number, type: string): string => {
    const thumbnails: Record<string, string[]> = {
      lecture: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBJmS2nRQzZgx4B0ke5okwaeEuo5awCUFk_a9sansec_LB9zTZYnt5dNUHSdATx5Bl1r73IxSDYLVQHMLWB0zyBgaZ7yZjGd5SocdyKHwJwDdNbiZpuBIBPSlvowtg-SoMa-Cs3ffwwIUaagWyp6QNK1aOMV-c1en4E-AJCqeqwL4ir1XD4Kx7KVqI0KHCRS0Pw2yorEtYtvSSqRXaOZl6vwyCLsz4EGlEWa4yWHCLQBpzpSgIjkzH3YHr6AOP_aM3JzNVCJIHneNg',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCi4q4W55TSFTIdgNwqcsEynGS-NMiRe4Gi11TamXNdnHkhC1VtFjOCphqnAvYd4Mgw6dD3w3mIQVt4VMPpbZEgmkVBVUYqZyfX9ofB8wS77-xkapznHAbBOxai4YH_IWcDMnbM6OCtePkmiS51CoQdLE3FiJ9R1zaHDBBGmV14SJMOVG-DL14xQ4oONPOftRq6_XE1aWCyf5l2Kg_qe536OPDCY8pgnYU7eTAQrwFd4HdA2DIFh2956dpMV7jyx7Y1jx8LNF_bfAQ',
      ],
      tutorial: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDYgh4Z-y6-afSdKG0YszlD8t9H_ftKBIhtAxHRhufXpH6igFnDkkelXLN7HrQ850wTmoGlwAcsv3jM9JwCdh4oWY-2WEdR6CrwwapQ5mBRE94BJW8_VTT-zQGlPWNIO3arTuwhZZAEVSF0WDD84I3-sEY7unH7eX1p_UFcVA9r-1vf0jkqNq5ixQeLWvV5qrNn4TSAkF2Nvw6bAJDKAO9_PmkRa4KGBKxbRr40biw75eWYGsTjNJhEo0_ueUFb_UTwcRyH6HyANc0',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDMvhxGkXSidWJKLJsv3aYgNzt3J-0wqqKrCC0dIWvHL8mKAlt1fBYO-sXhpobTSd7Cir43yEqRQJiL-En-84TcjmNqG1JXhXOZDwiZSBs0s2OCETLwWff-J0m4FFPeb8V-BUfvuAPagWszOmb269T5bV2MsoXUPp4DGK51lqj0ulItNgrxhucEmPwoE5puwWtvE9djOYMYJsQpU_fVZnW8Ta4a-xqN_GdH5cKdW8fi83IuXswECk2jG0Eev8QYIzRuv8hRvM8HHlw',
      ],
      lab: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA4lbJlxmO17a2ZlqD9IQjkXe8VM87s6gSuz8tVH1P6bPL5ZK14FPpmZ1soDswpRxNAMdpwTVRqXDcxMpMzEHAf6hJOL8xcG5THhQFQ3QYXSUPNC2TREwP8n8GSBqa4pi5nwGCGWQQKSNqJ6Q6L7msmyIqb2SxsDKMZaH-DYzcHfipTLdziyL0LjrcObRh2BWh2bpky1ly0-hT7G2fqeTYCV5-piVhchex2iz8FiSuPEkx_oE9vTJOQApbY7rqp9geeYuFVsaW-2xo',
      ],
    };

    const typeThumbs = thumbnails[type] || thumbnails.lecture;
    return typeThumbs[index % typeThumbs.length];
  };

  const getVideoType = (index: number): 'lecture' | 'tutorial' | 'lab' => {
    const types: ('lecture' | 'tutorial' | 'lab')[] = [
      'lecture',
      'lab',
      'lecture',
      'lecture',
      'tutorial',
    ];
    return types[index % types.length];
  };

  const getVideoTypeLabel = (type: string) => {
    switch (type) {
      case 'lecture':
        return 'Lecture';
      case 'tutorial':
        return 'Tutorial';
      case 'lab':
        return 'Lab Session';
      default:
        return 'Video';
    }
  };

  const getVideoTypeColor = (type: string) => {
    switch (type) {
      case 'lecture':
        return 'bg-indigo-600';
      case 'tutorial':
        return 'bg-amber-600';
      case 'lab':
        return 'bg-emerald-600';
      default:
        return 'bg-slate-600';
    }
  };

  const filteredVideos = videos
    .filter(video => {
      const index = videos.indexOf(video);
      const type = getVideoType(index);
      if (filter === 'all') return true;
      return type === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.upload_timestamp).getTime() - new Date(b.upload_timestamp).getTime();
      } else {
        return (b.duration || 0) - (a.duration || 0);
      }
    });

  const completedCount = Object.values(progress).filter(p => p === 100).length;
  const totalVideos = videos.length;
  const completionPercent = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

  if (loading) {
    return (
      <div className="student-video-library-loading">
        <div className="loading-spinner"></div>
        <p>Loading videos...</p>
      </div>
    );
  }

  return (
    <div className="student-video-library">
      {/* Breadcrumbs & Course Header */}
      <div className="svl-breadcrumbs">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <a
            className="hover:text-indigo-600 transition-colors"
            href="#"
            onClick={e => {
              e.preventDefault();
              navigate(`/courses/${courseId}/hub`);
            }}
          >
            Courses
          </a>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-indigo-600 font-medium">
            {courseInfo?.course_code}: {courseInfo?.course_title}
          </span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="svl-title">Video Library</h1>
            <p className="svl-subtitle">Recorded lectures and course materials</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full">
              {totalVideos} Videos
            </span>
            <span className="text-sm font-medium px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
              {completionPercent}% Completed
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="svl-filters">
        <div className="svl-filter-tabs">
          <button
            className={`svl-filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Content
          </button>
          <button
            className={`svl-filter-tab ${filter === 'lecture' ? 'active' : ''}`}
            onClick={() => setFilter('lecture')}
          >
            Lectures
          </button>
          <button
            className={`svl-filter-tab ${filter === 'tutorial' ? 'active' : ''}`}
            onClick={() => setFilter('tutorial')}
          >
            Tutorials
          </button>
          <button
            className={`svl-filter-tab ${filter === 'lab' ? 'active' : ''}`}
            onClick={() => setFilter('lab')}
          >
            Lab Sessions
          </button>
        </div>
        <div className="svl-controls">
          <div className="svl-select-wrapper">
            <span className="material-symbols-outlined svl-select-icon">sort</span>
            <select
              className="svl-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'newest' | 'oldest' | 'duration')}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="duration">Duration</option>
            </select>
            <span className="material-symbols-outlined svl-select-arrow">expand_more</span>
          </div>
          <button
            className={`svl-view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <span className="material-symbols-outlined">grid_view</span>
          </button>
          <button
            className={`svl-view-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <span className="material-symbols-outlined">list</span>
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className={`svl-video-grid ${viewMode}`}>
        {filteredVideos.length === 0 ? (
          <div className="svl-empty-state">
            <span className="material-symbols-outlined">videocam_off</span>
            <p>No videos found for this category.</p>
          </div>
        ) : (
          filteredVideos.map((video, idx) => {
            const type = getVideoType(idx);
            const thumbnail = getVideoThumbnail(idx, type);
            const videoProgress = progress[video.id] || 0;

            return (
              <div
                key={video.id}
                className="svl-video-card group"
                onClick={() => navigate(`/videos/${video.id}`)}
              >
                <div className="svl-video-thumbnail">
                  <img alt={video.title} src={thumbnail} />
                  <div className="svl-play-overlay">
                    <div className="svl-play-button">
                      <span className="material-symbols-outlined">play_arrow</span>
                    </div>
                  </div>
                  <div className="svl-duration">{formatDuration(video.duration)}</div>
                  <div className={`svl-type-badge ${getVideoTypeColor(type)}`}>
                    {getVideoTypeLabel(type)}
                  </div>
                </div>
                <div className="svl-video-info">
                  <h3 className="svl-video-title">{video.title}</h3>
                  {video.description && (
                    <p className="svl-video-description">{video.description}</p>
                  )}
                  <div className="svl-video-meta">
                    <span>{formatDate(video.upload_timestamp)}</span>
                  </div>
                  <div className="svl-progress-container">
                    <div className="svl-progress-label">
                      <span>Progress</span>
                      <span>{videoProgress}%</span>
                    </div>
                    <div className="svl-progress-bar">
                      <div className="svl-progress-fill" style={{ width: `${videoProgress}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More */}
      {filteredVideos.length > 0 && (
        <div className="svl-load-more">
          <button className="svl-view-all-btn">
            View All Content
            <span className="material-symbols-outlined">arrow_downward</span>
          </button>
        </div>
      )}
    </div>
  );
}
