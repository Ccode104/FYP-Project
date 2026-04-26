import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/ToastProvider';
import './AssignmentCreate.css';

export default function AssignmentCreate() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [type, setType] = useState('code'); // default type
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast?.push({ kind: 'error', message: 'Title is required' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Map UI types to backend expected values
      let backendType = type;
      let allowGithub = false;
      
      if (type === 'github') {
        backendType = 'mixed';
        allowGithub = true;
      } else if (type === 'mixed') {
        backendType = 'mixed';
        allowGithub = true;
      }

      await apiFetch('/api/assignments', {
        method: 'POST',
        body: {
          course_offering_id: Number(courseId),
          title,
          description: description || null,
          due_at: dueAt || null,
          max_score: Number(maxScore) || 100,
          assignment_type: backendType,
          allow_github_repo: allowGithub,
          release_at: new Date().toISOString(), // Default to release now
        },
      });
      toast?.push({ kind: 'success', message: 'Assignment created' });
      navigate(`/courses/${courseId}/assignments`);
    } catch (err: any) {
      toast?.push({ kind: 'error', message: err?.message || 'Failed to create' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="assignment-create-page">
      <h2>Create New Assignment</h2>
      <form className="assignment-create-form" onSubmit={handleSubmit}>
        <label>
          Title*
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </label>
        <label>
          Due Date
          <input
            type="datetime-local"
            value={dueAt}
            onChange={e => setDueAt(e.target.value)}
          />
        </label>
        <label>
          Max Score
          <input
            type="number"
            value={maxScore}
            onChange={e => setMaxScore(e.target.value)}
            min={0}
          />
        </label>
        <label>
          Assignment Type
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="code">Code</option>
            <option value="github">GitHub</option>
            <option value="mixed">Mixed</option>
            <option value="pdf">PDF / Essay</option>
          </select>
        </label>
        <div className="form-actions">
          <button type="button" onClick={() => navigate(`/courses/${courseId}/assignments`)} className="btn btn-secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
