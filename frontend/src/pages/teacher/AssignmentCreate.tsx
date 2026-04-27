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
  const [isGenerating, setIsGenerating] = useState(false);

  // Coding question state
  const [questions, setQuestions] = useState<any[]>([
    {
      title: '',
      description: '',
      constraints: '',
      template_code: '',
      driver_code: '',
      test_cases: [
        { is_sample: true, input_text: '', expected_text: '' },
        { is_sample: false, input_text: '', expected_text: '' }
      ]
    }
  ]);

  const handleAIByQuestion = async (index: number) => {
    const q = questions[index];
    if (!q.title || !q.description) {
      toast?.push({ kind: 'error', message: 'Enter a title and description first' });
      return;
    }

    setIsGenerating(true);
    try {
      const data = await apiFetch('/api/ai-assistant/generate-question', {
        method: 'POST',
        body: { title: q.title, description: q.description }
      });

      const updatedQuestions = [...questions];
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        constraints: data.constraints || '',
        template_code: data.template_code || '',
        driver_code: data.driver_code || '',
        test_cases: data.test_cases || []
      };
      setQuestions(updatedQuestions);
      toast?.push({ kind: 'success', message: 'AI components generated!' });
    } catch (err: any) {
      toast?.push({ kind: 'error', message: err.message || 'AI generation failed' });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateTestCase = (qIndex: number, tIndex: number, field: string, value: any) => {
    const updated = [...questions];
    updated[qIndex].test_cases[tIndex][field] = value;
    setQuestions(updated);
  };

  const addTestCase = (qIndex: number, isSample: boolean) => {
    const updated = [...questions];
    updated[qIndex].test_cases.push({ is_sample: isSample, input_text: '', expected_text: '' });
    setQuestions(updated);
  };

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
          questions: (type === 'code' || type === 'mixed') ? questions : []
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

        {(type === 'code' || type === 'mixed') && (
          <div className="coding-questions-section">
            <h3>Coding Questions</h3>
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="question-card">
                <div className="question-header">
                  <h4>Question {qIdx + 1}</h4>
                  <button 
                    type="button" 
                    className="btn btn-ai" 
                    onClick={() => handleAIByQuestion(qIdx)}
                    disabled={isGenerating}
                  >
                    <span className="material-symbols-outlined">auto_awesome</span>
                    {isGenerating ? 'Generating...' : 'AI Generate All'}
                  </button>
                </div>

                <div className="question-fields">
                  <label>
                    Question Title
                    <input 
                      type="text" 
                      value={q.title} 
                      onChange={e => updateQuestion(qIdx, 'title', e.target.value)}
                      placeholder="e.g. Binary Search"
                    />
                  </label>

                  <label>
                    Question Description
                    <textarea 
                      value={q.description} 
                      onChange={e => updateQuestion(qIdx, 'description', e.target.value)}
                      placeholder="Describe the problem..."
                    />
                  </label>

                  <div className="technical-fields">
                    <label>
                      Constraints
                      <input 
                        type="text" 
                        value={q.constraints} 
                        onChange={e => updateQuestion(qIdx, 'constraints', e.target.value)}
                        placeholder="e.g. O(log N)"
                      />
                    </label>

                    <label className="code-field">
                      Template Code (Initial code for student)
                      <textarea 
                        className="monospace"
                        value={q.template_code} 
                        onChange={e => updateQuestion(qIdx, 'template_code', e.target.value)}
                        placeholder="def solve(n): ..."
                      />
                    </label>

                    <label className="code-field">
                      Driver Code (Hidden logic to test student)
                      <textarea 
                        className="monospace"
                        value={q.driver_code} 
                        onChange={e => updateQuestion(qIdx, 'driver_code', e.target.value)}
                        placeholder="import sys; print(solve(sys.stdin.read()))"
                      />
                    </label>
                  </div>

                  <div className="test-cases-grid">
                    <div className="test-cases-col">
                      <h5>Sample Test Cases (Visible)</h5>
                      {q.test_cases.filter((tc: any) => tc.is_sample).map((tc: any, tIdx: number) => (
                        <div key={tIdx} className="test-case-row">
                          <input 
                            placeholder="Input" 
                            value={tc.input_text} 
                            onChange={e => updateTestCase(qIdx, q.test_cases.indexOf(tc), 'input_text', e.target.value)}
                          />
                          <input 
                            placeholder="Expected" 
                            value={tc.expected_text} 
                            onChange={e => updateTestCase(qIdx, q.test_cases.indexOf(tc), 'expected_text', e.target.value)}
                          />
                        </div>
                      ))}
                      <button type="button" className="btn-small" onClick={() => addTestCase(qIdx, true)}>+ Add Sample</button>
                    </div>

                    <div className="test-cases-col">
                      <h5>Hidden Test Cases</h5>
                      {q.test_cases.filter((tc: any) => !tc.is_sample).map((tc: any, tIdx: number) => (
                        <div key={tIdx} className="test-case-row">
                          <input 
                            placeholder="Input" 
                            value={tc.input_text} 
                            onChange={e => updateTestCase(qIdx, q.test_cases.indexOf(tc), 'input_text', e.target.value)}
                          />
                          <input 
                            placeholder="Expected" 
                            value={tc.expected_text} 
                            onChange={e => updateTestCase(qIdx, q.test_cases.indexOf(tc), 'expected_text', e.target.value)}
                          />
                        </div>
                      ))}
                      <button type="button" className="btn-small" onClick={() => addTestCase(qIdx, false)}>+ Add Hidden</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
