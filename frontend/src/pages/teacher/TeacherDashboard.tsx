import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./TeacherDashboard.css";
import { useEffect, useState } from "react";
import { listMyOfferings } from "../../services/courses";
import { getPendingRequests, respondToRequest, type AccessRequest } from "../../services/quizPermissions";

function LoadingSkeleton() {
  return (
    <div className="card skeleton-card shimmer">
      <div className="skeleton-title shimmer" />
      <div className="skeleton-line shimmer" />
      <div className="skeleton-line shimmer" />
      <div className="skeleton-line shimmer" />
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
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h4 className="empty-state-title h4">{title}</h4>
      <p className="empty-state-description text-base leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  interface CourseOffering {
    id: number;
    course_code: string;
    course_title: string;
    term: string;
    section?: string;
  }

  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizRequests, setQuizRequests] = useState<AccessRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

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

  const handleRespondToRequest = async (requestId: number, action: 'approve' | 'reject', message?: string) => {
    try {
      await respondToRequest(requestId, action, message);
      // Reload requests
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
        setOfferings(await listMyOfferings());
        loadQuizRequests();
      } catch (e) {
        console.error("Failed to load data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container container-wide dashboard-page teacher-theme">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title h2 text-primary">
            Welcome back, {user?.name}!
          </h1>
          <p className="dashboard-subtitle text-lg text-secondary leading-relaxed">
            Manage your courses and create new offerings
          </p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/profile')}>
            👤 Profile
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/teacher/suspended-quizzes')}>
            🚫 Suspended Quizzes
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/teacher/proctoring-dashboard')}>
            📊 Proctoring Analytics
          </button>
        </div>
      </div>

      <div className="section-container">
        <div className="section-header">
          <h3 className="section-title h3">My Offerings</h3>
          <span className="courses-count text-sm font-medium text-secondary">
            {offerings.length} offerings
          </span>
        </div>

        <div className="card list-card">
            <div className="card-header-mini">
              <h4 className="card-subtitle">My Offerings</h4>
              <span className="badge">{offerings.length}</span>
            </div>
            {loading ? (
              <LoadingSkeleton />
            ) : offerings.length === 0 ? (
              <EmptyState
                icon={
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19 11H13L11 13L9 11H3M21 20H3C2.44772 20 2 19.5523 2 19V5C2 4.44772 2.44772 4 3 4H21C21.5523 4 22 4.44772 22 5V19C22 19.5523 21.5523 20 21 20Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                title="No offerings yet"
                description="Create an offering from existing courses"
              />
            ) : (
              <ul className="list list-modern">
                {offerings.map((o) => (
                  <li
                    key={o.id}
                    className="list-item list-item-clickable"
                    onClick={() => navigate(`/courses/${o.id}`, { state: { courseTitle: o.course_title } })}
                  >
                    <div className="list-item-content">
                      <span className="list-item-title">
                        {o.course_code} — {o.course_title}
                      </span>
                      <span className="list-item-subtitle">
                        {o.term}
                        {o.section ? "-" + o.section : ""} • Offering #{o.id}
                      </span>
                    </div>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/courses/${o.id}`, { state: { courseTitle: o.course_title } });
                      }}
                    >
                      Manage
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

      {/* Quiz Access Requests */}
      <div className="section-container">
        <div className="section-header">
          <h3 className="section-title h3">Quiz Access Requests</h3>
          <span className="courses-count text-sm font-medium text-secondary">
            {quizRequests.length} pending
          </span>
        </div>

        <div className="card list-card">
          <div className="card-header-mini">
            <h4 className="card-subtitle">Pending TA Requests</h4>
            <button className="btn btn-sm btn-secondary" onClick={loadQuizRequests}>
              🔄 Refresh
            </button>
          </div>
          {loadingRequests ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p>Loading requests...</p>
            </div>
          ) : quizRequests.length === 0 ? (
            <EmptyState
              icon={<span>📋</span>}
              title="No pending requests"
              description="No TA quiz access requests at this time"
            />
          ) : (
            <ul className="list list-modern">
              {quizRequests.map((request) => (
                <li key={request.id} className="list-item">
                  <div className="list-item-content">
                    <span className="list-item-title">
                      {request.ta_name} → {request.quiz_title}
                    </span>
                    <span className="list-item-subtitle">
                      {request.course_code} — {request.course_title} • Request: {request.request_type} access
                    </span>
                  </div>
                  <div className="list-item-meta">
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Requested: {new Date(request.requested_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      TA: {request.ta_email}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleRespondToRequest(request.id, 'approve')}
                    >
                      ✅ Approve
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        const message = prompt('Optional rejection message:');
                        handleRespondToRequest(request.id, 'reject', message || undefined);
                      }}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
