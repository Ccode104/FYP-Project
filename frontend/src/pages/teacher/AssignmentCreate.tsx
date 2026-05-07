import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from '../../services/api';
import './AssignmentCreate.css';

interface Question {
  title: string;
  description: string;
  constraints: string;
  template_code: string;
  testCases: { input: string; expected: string; isSample: boolean }[];
  points: number;
  isOpen?: boolean;
}

const AssignmentCreate: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { push } = useToast();
  const [step, setStep] = useState(1);
  const [assignmentType, setAssignmentType] = useState<'code' | 'github' | 'mixed' | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [questions, setQuestions] = useState<Question[]>([
    {
      title: '',
      description: '',
      constraints: '',
      template_code: '',
      testCases: [{ input: '', expected: '', isSample: true }],
      points: 20,
      isOpen: true
    }
  ]);
  const [githubRequirements, setGithubRequirements] = useState('');
  const [fileRequirements, setFileRequirements] = useState({
    allowedTypes: '.pdf, .zip, .docx',
    maxFiles: 1,
    instructions: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeSelect = (type: 'code' | 'github' | 'mixed') => {
    setAssignmentType(type);
    setStep(2);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        title: '',
        description: '',
        constraints: '',
        template_code: '',
        testCases: [{ input: '', expected: '', isSample: true }],
        points: 20,
        isOpen: true
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = <K extends keyof Question>(index: number, field: K, value: Question[K]) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const addTestCase = (qIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].testCases.push({ input: '', expected: '', isSample: false });
    setQuestions(newQuestions);
  };

  const updateTestCase = (qIndex: number, tIndex: number, field: string, value: string | boolean) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].testCases[tIndex] = { ...newQuestions[qIndex].testCases[tIndex], [field]: value };
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate || !assignmentType) {
      push({ kind: 'error', message: 'Please fill in required fields' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        course_offering_id: courseId,
        title,
        description,
        assignment_type: assignmentType,
        allow_github_repo: assignmentType === 'github',
        due_at: dueDate,
        max_score: maxScore,
        assignment_config: {
          questions: assignmentType === 'code' ? questions : [],
          github_requirements: assignmentType === 'github' ? githubRequirements : '',
          file_requirements: assignmentType === 'mixed' ? fileRequirements : null
        }
      };

      await apiFetch('/api/assignments', {
        method: 'POST',
        body: payload,
      });
      push({ kind: 'success', message: 'Assignment created successfully' });
      navigate(`/teacher/courses/${courseId}/assignments`);
    } catch (err: unknown) {
      push({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to create assignment' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container assignment-create-page">
      <div className="assignment-wizard">
        <header className="wizard-header">
          <h2>
            <span className="material-symbols-outlined">
              {step === 1 ? 'assignment_add' : 'edit_note'}
            </span>
            {step === 1 ? 'Create New Assignment' : `Configure ${assignmentType?.toUpperCase()} Assignment`}
          </h2>
          <div className="wizard-progress">
            <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="step-number">{step > 1 ? '✓' : '1'}</div>
              <span>Choose Type</span>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step === 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <span>Enter Details</span>
            </div>
          </div>
        </header>

        <main className="wizard-content">
          {step === 1 ? (
            <div className="step-1">
              <p className="muted" style={{ marginBottom: '32px' }}>
                Select the type of assignment you want to create. Each type offers a specialized set of tools for evaluation.
              </p>
              <div className="type-selection-grid">
                <div className="type-card" onClick={() => handleTypeSelect('code')}>
                  <div className="type-icon">
                    <span className="material-symbols-outlined">terminal</span>
                  </div>
                  <h3>Coding Lab</h3>
                  <p>In-browser IDE with multiple questions, auto-grading via test cases, and plagiarism detection.</p>
                </div>

                <div className="type-card" onClick={() => handleTypeSelect('mixed')}>
                  <div className="type-icon">
                    <span className="material-symbols-outlined">upload_file</span>
                  </div>
                  <h3>Mixed Files</h3>
                  <p>Standard file-based submissions. Support for PDF, ZIP, and other documents with manual grading.</p>
                </div>

                <div className="type-card" onClick={() => handleTypeSelect('github')}>
                  <div className="type-icon">
                    <span className="material-symbols-outlined">code</span>
                  </div>
                  <h3>GitHub Project</h3>
                  <p>Students submit a repository link. Ideal for collaborative projects and real-world dev workflows.</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="assignment-form-layout">
              {/* Basic Details Section */}
              <section className="form-section">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Assignment Title *</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Data Structures Lab 01: Trees"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Due Date & Time *</label>
                    <input 
                      type="datetime-local" 
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Score Allocation</label>
                    <input 
                      type="number" 
                      value={maxScore} 
                      onChange={(e) => setMaxScore(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>General Instructions</label>
                    <textarea 
                      rows={4} 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide context or high-level instructions for the students..."
                    />
                  </div>
                </div>
              </section>

              {/* Type Specific Sections */}
              {assignmentType === 'code' && (
                <section className="questions-container">
                  <div className="questions-header">
                    <h3 className="heading">Coding Questions</h3>
                    <button type="button" className="btn btn-primary" onClick={addQuestion}>
                      <span className="material-symbols-outlined">add</span>
                      Add Question
                    </button>
                  </div>

                  {questions.map((q, qIndex) => (
                    <div key={qIndex} className="question-card">
                      <div 
                        className="question-card-header"
                        onClick={() => updateQuestion(qIndex, 'isOpen', !q.isOpen)}
                      >
                        <h4>
                          <span className="material-symbols-outlined">
                            {q.isOpen ? 'expand_more' : 'chevron_right'}
                          </span>
                          Question {qIndex + 1}: {q.title || 'Untitled Question'}
                        </h4>
                        <div className="question-card-actions">
                          <button type="button" className="btn-ai-generate">
                            <span className="material-symbols-outlined">magic_button</span>
                            AI Generate
                          </button>
                          {questions.length > 1 && (
                            <button 
                              type="button" 
                              className="btn-icon-only btn-delete-q"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeQuestion(qIndex);
                              }}
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {q.isOpen && (
                        <div className="question-card-body">
                          <div className="form-grid">
                            <div className="form-group full-width">
                              <label>Question Title</label>
                              <input 
                                type="text"
                                value={q.title}
                                onChange={(e) => updateQuestion(qIndex, 'title', e.target.value)}
                                placeholder="e.g. Implement a Binary Search Tree"
                              />
                            </div>
                            <div className="form-group full-width">
                              <label>Problem Statement</label>
                              <textarea 
                                rows={4}
                                value={q.description}
                                onChange={(e) => updateQuestion(qIndex, 'description', e.target.value)}
                                placeholder="Describe the problem in detail..."
                              />
                            </div>
                            <div className="form-group">
                              <label>Constraints</label>
                              <input 
                                type="text"
                                value={q.constraints}
                                onChange={(e) => updateQuestion(qIndex, 'constraints', e.target.value)}
                                placeholder="e.g. Time complexity O(log n)"
                              />
                            </div>
                            <div className="form-group">
                              <label>Points</label>
                              <input 
                                type="number"
                                value={q.points}
                                onChange={(e) => updateQuestion(qIndex, 'points', Number(e.target.value))}
                              />
                            </div>
                          </div>

                          <div className="code-editor-group">
                            <label className="label" style={{ marginBottom: '8px', display: 'block' }}>Template Code (Initial code for students)</label>
                            <textarea 
                              className="code-textarea input"
                              value={q.template_code}
                              onChange={(e) => updateQuestion(qIndex, 'template_code', e.target.value)}
                              placeholder="// Start coding here..."
                            />
                          </div>

                          <div className="test-cases-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="label">Test Cases (Auto-grading)</label>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => addTestCase(qIndex)}>
                              <span className="material-symbols-outlined">add</span> Add Test Case
                            </button>
                          </div>

                          <div className="test-cases-section">
                            <div className="test-case-list">
                              <label className="muted">Input (Stdin)</label>
                              {q.testCases.map((tc, tIndex) => (
                                <div key={tIndex} className="test-case-row">
                                  <input 
                                    type="text" 
                                    value={tc.input} 
                                    onChange={(e) => updateTestCase(qIndex, tIndex, 'input', e.target.value)}
                                    placeholder="Input..."
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="test-case-list">
                              <label className="muted">Expected Output (Stdout)</label>
                              {q.testCases.map((tc, tIndex) => (
                                <div key={tIndex} className="test-case-row">
                                  <input 
                                    type="text" 
                                    value={tc.expected} 
                                    onChange={(e) => updateTestCase(qIndex, tIndex, 'expected', e.target.value)}
                                    placeholder="Expected..."
                                  />
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={tc.isSample} 
                                      onChange={(e) => updateTestCase(qIndex, tIndex, 'isSample', e.target.checked)}
                                    />
                                    Sample
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              )}

              {assignmentType === 'github' && (
                <section className="form-section">
                  <h3 className="heading">GitHub Integration</h3>
                  <div className="form-group full-width">
                    <label>Submission Requirements</label>
                    <textarea 
                      rows={6}
                      value={githubRequirements}
                      onChange={(e) => setGithubRequirements(e.target.value)}
                      placeholder="e.g. Please provide the repository URL. Ensure you have a README.md and the code follows standard linting rules."
                    />
                  </div>
                </section>
              )}

              {assignmentType === 'mixed' && (
                <section className="form-section" style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                  <h3 className="heading">File Submission Settings</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Allowed File Extensions</label>
                      <input 
                        type="text"
                        value={fileRequirements.allowedTypes}
                        onChange={(e) => setFileRequirements({ ...fileRequirements, allowedTypes: e.target.value })}
                        placeholder="e.g. .pdf, .zip, .docx"
                      />
                    </div>
                    <div className="form-group">
                      <label>Maximum Files</label>
                      <input 
                        type="number"
                        value={fileRequirements.maxFiles}
                        onChange={(e) => setFileRequirements({ ...fileRequirements, maxFiles: Number(e.target.value) })}
                        min={1}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Submission Instructions</label>
                      <textarea 
                        rows={4}
                        value={fileRequirements.instructions}
                        onChange={(e) => setFileRequirements({ ...fileRequirements, instructions: e.target.value })}
                        placeholder="Specific instructions for what files to upload..."
                      />
                    </div>
                  </div>
                </section>
              )}
            </form>
          )}
        </main>

        <footer className="wizard-footer">
          {step === 2 ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                <span className="material-symbols-outlined">arrow_back</span>
                Change Type
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Assignment'}
                <span className="material-symbols-outlined">rocket_launch</span>
              </button>
            </>
          ) : (
            <div style={{ flex: 1, textAlign: 'right' }}>
               <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                Cancel
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default AssignmentCreate;
