import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import './TeacherDashboard.css';

interface Assignment {
  id: number;
  title: string;
  description?: string;
  max_score: number;
  due_at?: string;
}

interface Rubric {
  id: number;
  criterion_name: string;
  max_score: number;
  description?: string;
}

export default function TAAssignmentDetails() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [assignmentData, rubricsData] = await Promise.all([
          apiFetch<Assignment>(`/api/assignments/${assignmentId}`),
          apiFetch<Rubric[]>(`/api/assignments/${assignmentId}/rubrics`).catch(() => []),
        ]);
        setAssignment(assignmentData);
        setRubrics(rubricsData);
      } catch (err) {
        console.error('Failed to load assignment details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [assignmentId]);

  if (loading) return <div className="teacher-dashboard"><div className="loading-spinner">Loading...</div></div>;
  if (!assignment) return <div className="teacher-dashboard">Assignment not found.</div>;

  return (
    <div className="teacher-dashboard ta-details-page">
      <section className="teacher-hero-section">
        <div className="teacher-hero-content">
          <div className="teacher-hero-text">
            <span className="teacher-role-badge">Assignment Overview</span>
            <h1 className="teacher-hero-title">{assignment.title}</h1>
            <p className="teacher-hero-subtitle">Review instructions and evaluation criteria before starting.</p>
          </div>
          <div className="teacher-hero-actions">
            <button 
              className="teacher-action-btn"
              onClick={() => navigate(`/dashboard/ta`)}
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back to Tasks
            </button>
          </div>
        </div>
      </section>

      <div className="teacher-bottom-section">
        <div className="teacher-activity-section">
          <h3 className="teacher-activity-title">Instructions for Evaluation</h3>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', lineHeight: '1.6' }}>
            {assignment.description || 'No specific instructions provided.'}
          </div>
          
          <h3 className="teacher-activity-title" style={{ marginTop: '32px' }}>Assessment Rubrics</h3>
          <div className="teacher-activity-list">
            {rubrics.length > 0 ? rubrics.map(r => (
              <div key={r.id} className="teacher-activity-item">
                <div className="teacher-activity-dot" data-color="primary"></div>
                <div className="teacher-activity-content">
                  <p className="teacher-activity-item-title">{r.criterion_name}</p>
                  <p className="teacher-activity-item-desc">{r.description || 'No description'}</p>
                </div>
                <div className="teacher-activity-time">Max: {r.max_score}</div>
              </div>
            )) : (
              <div className="teacher-empty-state">No rubrics defined.</div>
            )}
          </div>
        </div>

        <div className="teacher-insight-section">
          <div className="teacher-insight-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 40 }}>fact_check</span>
          </div>
          <h3 className="teacher-insight-title">Ready to Evaluate?</h3>
          <p className="teacher-insight-text">
            You are responsible for evaluating the submissions assigned to you. Grading should be fair and consistent according to the rubrics.
          </p>
          <button 
            className="teacher-insight-btn"
            onClick={() => navigate(`/courses/${courseId}/assignments/${assignmentId}/evaluate`)}
            style={{ background: 'white', color: '#00346f' }}
          >
            View Submissions
          </button>
        </div>
      </div>
    </div>
  );
}
