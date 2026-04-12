import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './TeacherDashboard.css';
import { useEffect, useState } from 'react';
import { listMyOfferings } from '../../features/courses/api/courses';
import {
  getPendingRequests,
  respondToRequest,
  type AccessRequest,
} from '../../features/quiz-permissions/api/quizPermissions';

function LoadingSkeleton() {
  return (
    <div className="teacher-skeleton-card">
      <div className="teacher-skeleton-image shimmer"></div>
      <div className="teacher-skeleton-content">
        <div className="teacher-skeleton-title shimmer"></div>
        <div className="teacher-skeleton-text shimmer"></div>
        <div className="teacher-skeleton-text shimmer" style={{ width: '60%' }}></div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="teacher-empty-state">
      <div className="teacher-empty-icon">{icon}</div>
      <h4 className="teacher-empty-title">{title}</h4>
      <p className="teacher-empty-description">{description}</p>
    </div>
  );
}

interface CourseOffering {
  id: number;
  course_code: string;
  course_title: string;
  term: string;
  section?: string;
  student_count?: number;
  next_session?: string;
}

interface Activity {
  id: number;
  type: 'assignment' | 'quiz' | 'grade';
  title: string;
  description: string;
  timestamp: string;
  color: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizRequests, setQuizRequests] = useState<AccessRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([
    {
      id: 1,
      type: 'assignment',
      title: 'Assignment Uploaded',
      description: 'Final Project phase 1 for OS',
      timestamp: '10:45 AM',
      color: 'primary',
    },
    {
      id: 2,
      type: 'quiz',
      title: 'Quiz Completed',
      description: 'Lecture 5 review by 42 students',
      timestamp: 'Yesterday',
      color: 'tertiary',
    },
  ]);

  const loadQuizRequests = async () => {
    try {
      setLoadingRequests(true);
      const data = await getPendingRequests();
      setQuizRequests(data.requests);
    } catch (error) {
      console.error('Failed to load quiz requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleRespondToRequest = async (
    requestId: number,
    action: 'approve' | 'reject',
    message?: string
  ) => {
    try {
      await respondToRequest(requestId, action, message);
      loadQuizRequests();
      alert(`Request ${action}d successfully!`);
    } catch (error: unknown) {
      console.error('Failed to respond to request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process request';
      alert(errorMessage);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await listMyOfferings();
        const offeringsWithMeta: CourseOffering[] = (data || []).map((o: CourseOffering) => ({
          ...o,
          student_count: Math.floor(Math.random() * 50) + 50,
          next_session: Math.random() > 0.5 ? 'Lab Session @ 2PM' : 'Lecture @ 10AM',
        }));
        setOfferings(offeringsWithMeta);
        loadQuizRequests();
      } catch (e) {
        console.error('Failed to load data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    if (timestamp === 'Today') return 'Today';
    if (timestamp === 'Yesterday') return 'Yesterday';
    return timestamp;
  };

  return (
    <div className="teacher-dashboard">
      {/* Hero Header Section */}
      <section className="teacher-hero-section">
        <div className="teacher-hero-content">
          <div className="teacher-hero-text">
            <span className="teacher-role-badge">Teacher</span>
            <h1 className="teacher-hero-title">
              Welcome back, {user?.name?.split(' ')[0] || 'Professor'}!
            </h1>
            <p className="teacher-hero-subtitle">Manage your courses and create new offerings.</p>
          </div>
          <div className="teacher-hero-actions">
            <button className="teacher-action-btn" onClick={() => navigate('/profile')}>
              <span className="material-symbols-outlined">person</span>
              <span>Profile</span>
            </button>
            <button className="teacher-action-btn" onClick={() => navigate('/planner/teacher')}>
              <span className="material-symbols-outlined">event_note</span>
              <span>Planner</span>
            </button>
            <button
              className="teacher-action-btn teacher-action-btn-notification"
              onClick={() => navigate('/staff/review-queue')}
            >
              <span className="material-symbols-outlined">rate_review</span>
              <span>Review Queue</span>
              <span className="teacher-notification-badge">
                <span className="teacher-notification-ping"></span>
                <span className="teacher-notification-count">5</span>
              </span>
            </button>
            <button
              className="teacher-action-btn teacher-action-btn-suspended"
              onClick={() => navigate('/teacher/suspended-quizzes')}
            >
              <span className="material-symbols-outlined">report</span>
              <span>Suspended Quizzes</span>
            </button>
            <button
              className="teacher-action-btn teacher-action-btn-proctoring"
              onClick={() => navigate('/teacher/proctoring-dashboard')}
            >
              <span className="material-symbols-outlined">monitoring</span>
              <span>Proctoring Analytics</span>
            </button>
          </div>
        </div>
      </section>

      {/* My Offerings Section */}
      <section className="teacher-offerings-section">
        <div className="teacher-section-header">
          <h2 className="teacher-section-title">My Course Offerings</h2>
          <button className="teacher-view-all-btn" onClick={() => navigate('/courses')}>
            <span>View All Courses</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        <div className="teacher-offerings-grid">
          {loading ? (
            <>
              <LoadingSkeleton />
              <LoadingSkeleton />
            </>
          ) : offerings.length === 0 ? (
            <div className="teacher-full-width-empty">
              <EmptyState
                icon={
                  <span className="material-symbols-outlined" style={{ fontSize: 48 }}>
                    school
                  </span>
                }
                title="No offerings yet"
                description="Create an offering from existing courses"
              />
            </div>
          ) : (
            offerings.slice(0, 2).map(offering => (
              <div key={offering.id} className="teacher-course-card">
                <div className="teacher-course-image">
                  <img
                    src={`https://picsum.photos/seed/${offering.id}/400/300`}
                    alt={offering.course_title}
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        'https://picsum.photos/400/300?grayscale';
                    }}
                  />
                  <div className="teacher-course-image-overlay">
                    <span className="teacher-course-status">ACTIVE OFFERING</span>
                  </div>
                </div>
                <div className="teacher-course-content">
                  <div className="teacher-course-info">
                    <h3 className="teacher-course-title">
                      {offering.course_code} — {offering.course_title}
                    </h3>
                    <p className="teacher-course-meta">
                      {offering.term} {offering.section ? `- Section ${offering.section}` : ''} •
                      Offering #{offering.id}
                    </p>
                  </div>
                  <div className="teacher-course-stats">
                    <div className="teacher-course-stat">
                      <span className="material-symbols-outlined">groups</span>
                      <span>{offering.student_count || 0} Students</span>
                    </div>
                    <div className="teacher-course-stat">
                      <span className="material-symbols-outlined">schedule</span>
                      <span>Next: {offering.next_session || 'TBD'}</span>
                    </div>
                  </div>
                  <div className="teacher-course-actions">
                    <button
                      className="teacher-course-btn teacher-course-btn-primary"
                      onClick={() =>
                        navigate(`/courses/${offering.id}/hub`, {
                          state: { courseTitle: offering.course_title },
                        })
                      }
                    >
                      Manage
                    </button>
                    <button
                      className="teacher-course-btn teacher-course-btn-outline"
                      onClick={() =>
                        navigate(`/courses/${offering.id}/hub`, {
                          state: { courseTitle: offering.course_title },
                        })
                      }
                    >
                      Course Hub
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Quiz Access Requests Section */}
      <section className="teacher-requests-section">
        <div className="teacher-requests-card">
          <div className="teacher-requests-header">
            <h2 className="teacher-requests-title">Quiz Access Requests</h2>
            <span className="teacher-requests-badge">{quizRequests.length} Pending</span>
          </div>
          <div className="teacher-requests-table-container">
            <table className="teacher-requests-table">
              <thead>
                <tr>
                  <th>TA Name</th>
                  <th>Quiz Title</th>
                  <th>Course</th>
                  <th>Request Type</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingRequests ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                      Loading requests...
                    </td>
                  </tr>
                ) : quizRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={<span>📋</span>}
                        title="No pending requests"
                        description="No TA quiz access requests at this time"
                      />
                    </td>
                  </tr>
                ) : (
                  quizRequests.slice(0, 3).map(request => (
                    <tr key={request.id}>
                      <td>
                        <div className="teacher-request-user">
                          <div className="teacher-request-avatar">
                            {request.ta_name?.charAt(0).toUpperCase() || 'T'}
                          </div>
                          <span className="teacher-request-name">{request.ta_name}</span>
                        </div>
                      </td>
                      <td className="teacher-request-quiz">{request.quiz_title}</td>
                      <td>
                        <span className="teacher-request-course-badge">{request.course_code}</span>
                      </td>
                      <td>
                        <span className="teacher-request-type">Grading Access</span>
                      </td>
                      <td className="teacher-request-date">
                        {request.requested_at
                          ? new Date(request.requested_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>
                      <td>
                        <div className="teacher-request-actions">
                          <button
                            className="teacher-request-action teacher-request-approve"
                            onClick={() => handleRespondToRequest(request.id, 'approve')}
                          >
                            <span className="material-symbols-outlined">check</span>
                          </button>
                          <button
                            className="teacher-request-action teacher-request-reject"
                            onClick={() => {
                              const message = prompt('Optional rejection message:');
                              handleRespondToRequest(request.id, 'reject', message || undefined);
                            }}
                          >
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Bottom Section Grid */}
      <section className="teacher-bottom-section">
        <div className="teacher-activity-section">
          <h4 className="teacher-activity-title">Recent Academic Activity</h4>
          <div className="teacher-activity-list">
            {recentActivity.map(activity => (
              <div key={activity.id} className="teacher-activity-item">
                <div className="teacher-activity-dot" data-color={activity.color}></div>
                <div className="teacher-activity-content">
                  <p className="teacher-activity-item-title">{activity.title}</p>
                  <p className="teacher-activity-item-desc">{activity.description}</p>
                </div>
                <span className="teacher-activity-time">{formatTimestamp(activity.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="teacher-insight-section">
          <div className="teacher-insight-icon">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 40, fontVariationSettings: 'FILL 1' }}
            >
              lightbulb
            </span>
          </div>
          <h4 className="teacher-insight-title">Curriculum Insight</h4>
          <p className="teacher-insight-text">
            Based on recent quiz performance in 'Data Structures', 40% of students struggled with
            'Heaps'. Consider scheduling a review session.
          </p>
          <button className="teacher-insight-btn">Create Focus Session</button>
        </div>
      </section>
    </div>
  );
}
