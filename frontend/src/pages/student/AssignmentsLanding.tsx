import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './AssignmentsLanding.css';

type CourseMeta = {
  course_code?: string;
  course_title?: string;
  faculty_name?: string;
};

export default function AssignmentsLanding() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState<'active' | 'completed' | 'archived'>('active');

  const viewLabels = {
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!courseId) return;
      setLoading(true);
      setError(null);

      try {
        const [c] = await Promise.all([
          apiFetch<CourseMeta>(`/api/student/courses/${courseId}`),
        ]);
        if (!cancelled) {
          setCourse(c);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assignments');
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) {
    return (
      <div className="assignments-page">
        <div className="assignments-content">
          <div className="loading-state text-center py-20">Loading assignments...</div>
        </div>
      </div>
    );
  }

  
  return (
      <div className="assignments-content">
        {error && (
          <div className="error-message">
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        )}

        {/* Page Header */}
        <div className="page-header">
          <div className="page-title">
            <h2>Assignment Portfolio</h2>
            <p>Track your progress and upcoming deadlines across all enrolled courses.</p>
          </div>
          <div className="view-tabs">
            {(['active', 'completed', 'archived'] as const).map(view => (
              <button
                key={view}
                className={`view-tab ${selectedView === view ? 'active' : ''}`}
                onClick={() => setSelectedView(view)}
              >
                {viewLabels[view] || view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

          {/* Bento Grid Stats - Following HTML design exactly */}
          <div className="assignments-stats">
            <div className="assignments-progress-card">
              <div className="assignments-progress-content">
                <p className="assignments-progress-label">Overall Progress</p>
                <h3 className="assignments-progress-value">84%</h3>
                <div className="assignments-progress-bar">
                  <div className="assignments-progress-bar-fill" style={{ width: '84%' }} />
                </div>
                <p className="assignments-progress-text">12 of 14 assignments submitted this term</p>
              </div>
              <span className="material-symbols-outlined assignments-progress-icon">auto_graph</span>
            </div>
            <div className="assignments-stat-card">
              <div className="assignments-stat-icon timer">
                <span className="material-symbols-outlined">timer</span>
              </div>
              <div>
                <h4 className="assignments-stat-value">03</h4>
                <p className="assignments-stat-label">Pending Due Soon</p>
              </div>
            </div>
            <div className="assignments-stat-card">
              <div className="assignments-stat-icon verified">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <div>
                <h4 className="assignments-stat-value">A-</h4>
                <p className="assignments-stat-label">Average Grade</p>
              </div>
            </div>
          </div>

          {/* Filters and Search - Following HTML design exactly */}
          <div className="assignments-filters">
            <div className="assignments-search">
              <span className="material-symbols-outlined">search</span>
              <input 
                className="assignments-search-input" 
                placeholder="Search by assignment name or professor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="assignments-filter-controls">
              <select className="assignments-filter-select">
                <option>All Types</option>
                <option>Code / Git</option>
                <option>PDF / Essay</option>
                <option>Quiz / Exam</option>
              </select>
              <button className="assignments-filter-button">
                <span className="material-symbols-outlined">filter_list</span>
                Sort
              </button>
            </div>
          </div>

          {/* Assignment List - Following HTML design exactly */}
          <div className="assignment-list">
            {/* Assignment Card 1 (Pending) */}
            <div className="assignments-card">
              <div className="assignments-icon">
                <span className="material-symbols-outlined text-3xl">terminal</span>
              </div>
              <div className="assignments-content">
                <div className="assignments-meta">
                  <span className="assignments-badge pending">Due in 2 days</span>
                  <span className="assignments-course">• CS 302: Operating Systems</span>
                </div>
                <h4 className="assignments-title">Implementing Multi-threaded File Systems</h4>
                <p className="assignments-description">Implement a kernel-level file system driver using C++ with support for concurrent read/write locks.</p>
              </div>
              <div className="assignments-actions">
                <div className="assignments-deadline">
                  <p className="assignments-deadline-label">Deadline</p>
                  <p className="assignments-deadline-value">Oct 24, 11:59 PM</p>
                </div>
                <button className="assignments-button">Submit Now</button>
              </div>
            </div>
            {/* Assignment Card 2 (Completed) */}
            <div className="assignments-card completed">
              <div className="assignments-icon">
                <span className="material-symbols-outlined text-3xl">description</span>
              </div>
              <div className="assignments-content">
                <div className="assignments-meta">
                  <span className="assignments-badge completed">Completed</span>
                  <span className="assignments-course">• LIT 210: Modern Poetry</span>
                </div>
                <h4 className="assignments-title completed">The Evolution of Free Verse</h4>
                <div className="assignments-file">
                  <span className="material-symbols-outlined text-sm">attachment</span>
                  essay_v3_final.pdf
                </div>
              </div>
              <div className="assignments-actions">
                <div className="assignments-score">
                  <p className="assignments-score-label">Score</p>
                  <p className="assignments-score-value">96/100</p>
                </div>
                <button className="assignments-button secondary">View Feedback</button>
              </div>
            </div>
            {/* Assignment Card 3 (Pending) */}
            <div className="assignments-card">
              <div className="assignments-icon">
                <span className="material-symbols-outlined text-3xl">quiz</span>
              </div>
              <div className="assignments-content">
                <div className="assignments-meta">
                  <span className="assignments-badge pending">Due in 5 days</span>
                  <span className="assignments-course">• BIO 104: Genetics</span>
                </div>
                <h4 className="assignments-title">Midterm Review Quiz</h4>
                <p className="assignments-description">Review of modules 1-6 focusing on Mendelian inheritance and CRISPR technologies.</p>
              </div>
              <div className="assignments-actions">
                <div className="assignments-deadline">
                  <p className="assignments-deadline-label">Deadline</p>
                  <p className="assignments-deadline-value">Oct 27, 02:00 PM</p>
                </div>
                <button className="assignments-button quiz">Start Quiz</button>
              </div>
            </div>
          </div>

          {/* Up Next Section - Following HTML design exactly */}
          <div className="assignments-resources">
            <div>
              <h3 className="assignments-section-title">
                <span className="material-symbols-outlined">auto_stories</span>
                Recommended Resources
              </h3>
              <div className="assignments-resource-grid">
                <div className="assignments-resource-card">
                  <img 
                    alt="Resource" 
                    className="assignments-resource-image" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7XLbUBh_R4l0-Wjj7qa3gxfhwS60yXXT8BeYWn21TmZkNvEFLghUexYDYjb8zbRuN4wl01fQdneNe3ZYM9Cone_lrKeOU665vmEGb3U0PWKPcVk6SOLIT0V_CfOFdTH-Yl5PktT2orsG82sOV_Pvg5IBqKC3nt_Wt8ossEfBhiolEiyWlIwl8Kc6a61XAMG0B7ZWnsMbkDUSVrPlBjlDF_AcFuspZnh3TbEE5pEVtPd5S2HXvG98fkJK4tbnAwG73rrrPjjUhrSI"
                    data-alt="Close up of a person typing on a mechanical keyboard in a dimly lit room with blue ambient neon light"
                  />
                  <div className="assignments-resource-content">
                    <h5 className="assignments-resource-title">Git Workflow Guide</h5>
                    <p className="assignments-resource-description">For your OS Assignment</p>
                    <a className="assignments-resource-link" href="#">Read Now →</a>
                  </div>
                </div>
                <div className="assignments-resource-card">
                  <img 
                    alt="Resource" 
                    className="assignments-resource-image" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5FZzZxh3vv48VN8D6hI0tkPdSkTRbQxXd0k44ZcPnNOwCEVXmrLw7Fb_KYftwg9UtWg9iTmL5j_Z9DxSZ325vNIfzRH5UiwDRDLgo-awdQSV35dXDfyPUXm1BJ_oVb5Adn1BajYHq3QI6xkgmpCFjvs6-0Qm2LpCnIZRt9NI6mXIL6ngtJSv1xPmHRoOCoDTgqdDeWpyzSKgtWD3Ljl25imde_4tr5vyQUdz0ayURuj-M4g30fU2ISxfe1JhoM-V3ZiNV9zze4LY"
                    data-alt="Students studying in a modern bright library with large windows and books in background"
                  />
                  <div className="assignments-resource-content">
                    <h5 className="assignments-resource-title">Genetics Flashcards</h5>
                    <p className="assignments-resource-description">240 terms to master</p>
                    <a className="assignments-resource-link" href="#">Open Deck →</a>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="assignments-section-title">
                <span className="material-symbols-outlined">event</span>
                Timeline
              </h3>
              <div className="assignments-timeline">
                <div className="assignments-timeline-item">
                  <div className="assignments-timeline-dot indigo"></div>
                  <p className="assignments-timeline-date">TOMORROW</p>
                  <h6 className="assignments-timeline-title">Office Hours: Dr. Chen</h6>
                  <p className="assignments-timeline-description">2:00 PM - 3:30 PM (Zoom)</p>
                </div>
                <div className="assignments-timeline-item">
                  <div className="assignments-timeline-dot slate"></div>
                  <p className="assignments-timeline-date">OCT 24</p>
                  <h6 className="assignments-timeline-title">Lab Submission Deadline</h6>
                  <p className="assignments-timeline-description">11:59 PM (Canvas)</p>
                </div>
                <div className="assignments-timeline-item">
                  <div className="assignments-timeline-dot slate"></div>
                  <p className="assignments-timeline-date">OCT 27</p>
                  <h6 className="assignments-timeline-title">Bio Genetics Quiz</h6>
                  <p className="assignments-timeline-description">Starts at 12:00 PM</p>
                </div>
              </div>
            </div>
          </div>
      </div>
  );
}

