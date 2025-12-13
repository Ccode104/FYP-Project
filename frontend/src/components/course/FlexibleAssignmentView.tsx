import { useState, useEffect } from 'react';

interface AssignmentComponent {
  id: string;
  type: 'code' | 'document' | 'presentation' | 'assessment' | 'other';
  subtype: string;
  title: string;
  description: string;
  points: number;
  estimated_time_hours?: number;
}

interface SubmissionRequirement {
  component_id: string;
  submission_type: 'file_upload' | 'text' | 'link' | 'code';
  accepted_formats?: string[];
  max_file_size_mb?: number;
  required: boolean;
  description?: string;
}

interface AssignmentConfig {
  assignment_type: 'simple' | 'mixed' | 'practice';
  components: AssignmentComponent[];
  workflow?: {
    phases: string[];
    dependencies: Record<string, string[]>;
  };
  settings: {
    allow_group_work: boolean;
    peer_review_required: boolean;
    auto_grading_enabled: boolean;
    plagiarism_check: boolean;
    is_practice?: boolean;
  };
}

interface GradingConfig {
  grading_type: 'simple' | 'component_based' | 'auto_graded' | 'manual';
  use_rubric: boolean;
  rubric_id?: string;
  allow_partial_credit: boolean;
  grade_visibility: 'immediate' | 'after_due_date' | 'never';
  peer_review_weight?: number;
  auto_grading_weight?: number;
}

interface FlexibleAssignment {
  id: number;
  title: string;
  description: string;
  assignment_config: AssignmentConfig;
  submission_requirements: SubmissionRequirement[];
  grading_config: GradingConfig;
  total_points: number;
  is_graded: boolean;
  due_at: string;
  course_code: string;
  course_name: string;
}

interface ComponentSubmission {
  component_id: string;
  submission_type: 'file' | 'text' | 'link' | 'code';
  content?: string;
  file_path?: string;
  metadata?: Record<string, string | number | boolean>;
}

interface Props {
  assignmentId: number;
  onClose: () => void;
}

export default function FlexibleAssignmentView({ assignmentId, onClose }: Props) {
  const [assignment, setAssignment] = useState<FlexibleAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [componentSubmissions, setComponentSubmissions] = useState<ComponentSubmission[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAssignment();
  }, [assignmentId]);

  const loadAssignment = async () => {
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`);
      if (response.ok) {
        const data = await response.json();
        setAssignment(data);
      }
    } catch (error) {
      console.error('Failed to load assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComponentSubmission = (componentId: string, submission: ComponentSubmission) => {
    setComponentSubmissions(prev => {
      const existing = prev.findIndex(s => s.component_id === componentId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = submission;
        return updated;
      } else {
        return [...prev, submission];
      }
    });
  };

  const submitAssignment = async () => {
    if (!assignment || componentSubmissions.length === 0) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/submit-components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ components: componentSubmissions })
      });

      if (response.ok) {
        alert('Assignment submitted successfully!');
        onClose();
      } else {
        alert('Failed to submit assignment');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Error submitting assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComponentInput = (component: AssignmentComponent, requirement: SubmissionRequirement) => {
    const currentSubmission = componentSubmissions.find(s => s.component_id === component.id);

    switch (requirement.submission_type) {
      case 'file_upload':
        return (
          <div key={component.id} className="component-input">
            <h4>{component.title} ({component.points} pts)</h4>
            <p>{component.description}</p>
            <input
              type="file"
              accept={requirement.accepted_formats?.join(',')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleComponentSubmission(component.id, {
                    component_id: component.id,
                    submission_type: 'file',
                    file_path: file.name,
                    metadata: { size: file.size, type: file.type }
                  });
                }
              }}
            />
            {requirement.accepted_formats && (
              <small>Accepted formats: {requirement.accepted_formats.join(', ')}</small>
            )}
          </div>
        );

      case 'text':
        return (
          <div key={component.id} className="component-input">
            <h4>{component.title} ({component.points} pts)</h4>
            <p>{component.description}</p>
            <textarea
              value={currentSubmission?.content || ''}
              onChange={(e) => handleComponentSubmission(component.id, {
                component_id: component.id,
                submission_type: 'text',
                content: e.target.value
              })}
              placeholder="Enter your response here..."
              rows={6}
            />
          </div>
        );

      case 'link':
        return (
          <div key={component.id} className="component-input">
            <h4>{component.title} ({component.points} pts)</h4>
            <p>{component.description}</p>
            <input
              type="url"
              value={currentSubmission?.content || ''}
              onChange={(e) => handleComponentSubmission(component.id, {
                component_id: component.id,
                submission_type: 'link',
                content: e.target.value
              })}
              placeholder="https://..."
            />
          </div>
        );

      case 'code':
        return (
          <div key={component.id} className="component-input">
            <h4>{component.title} ({component.points} pts)</h4>
            <p>{component.description}</p>
            <div className="code-editor-placeholder">
              <p>Code Editor Integration</p>
              <small>Language: {component.subtype || 'Any'}</small>
              <button onClick={() => alert('Code editor would open here')}>
                Open Code Editor
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div key={component.id} className="component-input">
            <h4>{component.title} ({component.points} pts)</h4>
            <p>{component.description}</p>
            <p>Unsupported submission type: {requirement.submission_type}</p>
          </div>
        );
    }
  };

  if (loading) return <div className="loading">Loading assignment...</div>;
  if (!assignment) return <div className="error">Assignment not found</div>;

  const { assignment_config, submission_requirements } = assignment;
  const totalSubmitted = componentSubmissions.length;
  const totalRequired = submission_requirements.filter(r => r.required).length;

  return (
    <div className="flexible-assignment-view">
      <div className="assignment-header">
        <button onClick={onClose} className="close-btn">×</button>
        <h2>{assignment.title}</h2>
        <div className="assignment-meta">
          <span className="course">{assignment.course_code} - {assignment.course_name}</span>
          <span className="points">{assignment.total_points} points total</span>
          <span className="due">Due: {new Date(assignment.due_at).toLocaleDateString()}</span>
        </div>
        <p className="description">{assignment.description}</p>
      </div>

      <div className="assignment-config">
        <div className="config-summary">
          <h3>Assignment Structure</h3>
          <div className="assignment-type">
            Type: <strong>{assignment_config.assignment_type}</strong>
          </div>
          <div className="components-count">
            Components: <strong>{assignment_config.components.length}</strong>
          </div>
          <div className="settings">
            {assignment_config.settings.allow_group_work && <span>Group Work Allowed</span>}
            {assignment_config.settings.peer_review_required && <span>Peer Review Required</span>}
            {assignment_config.settings.auto_grading_enabled && <span>Auto Grading</span>}
            {assignment_config.settings.plagiarism_check && <span>Plagiarism Check</span>}
          </div>
        </div>

        <div className="components-list">
          <h3>Assignment Components</h3>
          {assignment_config.components.map(component => {
            const requirement = submission_requirements.find(r => r.component_id === component.id);
            return (
              <div key={component.id} className="component-card">
                <div className="component-header">
                  <h4>{component.title}</h4>
                  <span className="component-type">{component.type} - {component.subtype}</span>
                  <span className="points">{component.points} pts</span>
                </div>
                <p className="component-description">{component.description}</p>
                {component.estimated_time_hours && (
                  <small>Estimated time: {component.estimated_time_hours} hours</small>
                )}
                {requirement && renderComponentInput(component, requirement)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="submission-footer">
        <div className="submission-status">
          Submitted: {totalSubmitted} / {totalRequired} required components
        </div>
        <div className="action-buttons">
          <button
            onClick={submitAssignment}
            disabled={submitting || totalSubmitted < totalRequired}
            className="submit-btn"
          >
            {submitting ? 'Submitting...' : 'Submit Assignment'}
          </button>
        </div>
      </div>

    </div>
  );
}
