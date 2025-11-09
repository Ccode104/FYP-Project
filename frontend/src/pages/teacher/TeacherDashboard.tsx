import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./TeacherDashboard.css";
import { useEffect, useState } from "react";
import { listMyOfferings } from "../../services/courses";

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

  const [offerings, setOfferings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setOfferings(await listMyOfferings());
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
                    onClick={() => navigate(`/courses/${o.id}`)}
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
                        navigate(`/courses/${o.id}`);
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
    </div>
  );
}
