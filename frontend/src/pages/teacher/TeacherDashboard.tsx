import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./TeacherDashboard.css";
import { useEffect, useState } from "react";
import {
  createCourse,
  createOffering,
  listCourses,
  listMyOfferings,
} from "../../services/courses";
import { useToast } from "../../components/ToastProvider";

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
  const { push } = useToast();

  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");

  const [offerCourseId, setOfferCourseId] = useState("");
  const [term, setTerm] = useState("W25");
  const [section, setSection] = useState("A");

  const [courses, setCourses] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseSearch, setCourseSearch] = useState("");
  const [showAllCourses, setShowAllCourses] = useState(false);

  const makeCourse = async () => {
    try {
      const res = await createCourse({
        code: courseCode,
        title: courseTitle,
        description: courseDesc,
      });
      push({ kind: "success", message: `Course ${res.code || ""} created` });
      setOfferCourseId(String(res.id));
      const list = await listCourses();
      setCourses(list);
      setCourseCode("");
      setCourseTitle("");
      setCourseDesc("");
    } catch (e: any) {
      push({ kind: "error", message: e?.message || "Create course failed" });
    }
  };

  const makeOffering = async () => {
    try {
      const res = await createOffering({
        course_id: Number(offerCourseId),
        term,
        section,
        faculty_id: Number(user?.id),
      });
      push({ kind: "success", message: `Offering #${res.id} created` });
      const mine = await listMyOfferings();
      setOfferings(mine);
      navigate(`/courses/${res.id}`);
    } catch (e: any) {
      push({ kind: "error", message: e?.message || "Create offering failed" });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setCourses(await listCourses());
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
        <h3 className="section-title h3">Quick Actions</h3>
        <div className="grid grid-2-cols">
          <div className="card action-card">
            <div className="card-header">
              <div className="card-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 6V18M6 12H18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className="card-title">Create Course</h3>
            </div>
            <div className="form">
              <label className="field">
                <span className="label">Course Code</span>
                <input
                  className="input"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="e.g., CS101"
                />
              </label>
              <label className="field">
                <span className="label">Course Title</span>
                <input
                  className="input"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g., Intro to CS"
                />
              </label>
              <label className="field">
                <span className="label">Description</span>
                <input
                  className="input"
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Short description"
                />
              </label>
              <button className="btn btn-primary btn-full" onClick={makeCourse}>
                Create Course
              </button>
            </div>
          </div>

          <div className="card action-card">
            <div className="card-header">
              <div className="card-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className="card-title">Create Offering</h3>
            </div>
            <div className="form">
              <label className="field">
                <span className="label">Select Course</span>
                <select
                  className="input select"
                  value={offerCourseId}
                  onChange={(e) => setOfferCourseId(e.target.value)}
                >
                  <option value="">-- Select a course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title} (ID: {c.id})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="label">Term</span>
                <input
                  className="input"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="e.g., W25"
                />
              </label>
              <label className="field">
                <span className="label">Section</span>
                <input
                  className="input"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="A"
                />
              </label>
              <button
                className="btn btn-primary btn-full"
                onClick={makeOffering}
                disabled={!offerCourseId}
              >
                Create Offering
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="section-container">
        <div className="section-header">
          <h3 className="section-title h3">Overview</h3>
          <span className="courses-count text-sm font-medium text-secondary">
            {courses.length} courses • {offerings.length} offerings
          </span>
        </div>

        <div className="grid grid-2-cols">
          <div className="card list-card">
            <div className="card-header-mini">
              <h4 className="card-subtitle">All Courses</h4>
              <span className="badge">{courses.length}</span>
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : courses.length === 0 ? (
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
                      d="M12 6.25278V19.2528M12 6.25278C10.8321 5.47686 9.24649 5 7.5 5C5.75351 5 4.16789 5.47686 3 6.25278V19.2528C4.16789 18.4769 5.75351 18 7.5 18C9.24649 18 10.8321 18.4769 12 19.2528M12 6.25278C13.1679 5.47686 14.7535 5 16.5 5C18.2465 5 19.8321 5.47686 21 6.25278V19.2528C19.8321 18.4769 18.2465 18 16.5 18C14.7535 18 13.1679 18.4769 12 19.2528"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                title="No courses yet"
                description="Create a course to get started"
              />
            ) : (
              <>
                <div className="search-box">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="search-input"
                  />
                </div>
                <div className="scrollable-list">
                  <ul className="list list-modern">
                    {courses
                      .filter(
                        (c) =>
                          c.code
                            .toLowerCase()
                            .includes(courseSearch.toLowerCase()) ||
                          c.title
                            .toLowerCase()
                            .includes(courseSearch.toLowerCase())
                      )
                      .slice(0, showAllCourses ? undefined : 5)
                      .map((c) => (
                        <li key={c.id} className="list-item">
                          <div className="list-item-content">
                            <span className="list-item-title">{c.code}</span>
                            <span className="list-item-subtitle">
                              {c.title}
                            </span>
                          </div>
                          <span className="list-item-badge">ID: {c.id}</span>
                        </li>
                      ))}
                  </ul>
                </div>
                {courses.filter(
                  (c) =>
                    c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
                    c.title.toLowerCase().includes(courseSearch.toLowerCase())
                ).length > 5 && (
                  <button
                    className="btn btn-ghost btn-full view-more-btn"
                    onClick={() => setShowAllCourses(!showAllCourses)}
                  >
                    {showAllCourses
                      ? "Show Less"
                      : `View All (${courses.length})`}
                  </button>
                )}
              </>
            )}
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
    </div>
  );
}
