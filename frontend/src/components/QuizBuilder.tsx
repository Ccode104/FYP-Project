import { useState } from 'react';
import { apiFetch } from '../services/api';
import './QuizBuilder.css';

export interface Question {
  id: string;
  question: string;
  type: 'mcq' | 'checkbox' | 'short' | 'paragraph';
  options: string[];
  correct_answers: string[];
  points: number;
}

export interface QuizData {
  title: string;
  description: string;
  questions: Question[];
}

interface QuizBuilderProps {
  courseOfferingId: number;
  initialQuiz?: QuizData;
  onSave?: (quiz: QuizData) => void;
  onExportGoogleForm?: (formUrl: string) => void;
}

export default function QuizBuilder({
  courseOfferingId,
  initialQuiz,
  onSave,
  onExportGoogleForm,
}: QuizBuilderProps) {
  const [quiz, setQuiz] = useState<QuizData>(
    initialQuiz || {
      title: '',
      description: '',
      questions: [],
    }
  );
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    topic: '',
    difficulty: 'medium',
    numQuestions: 5,
    questionTypes: ['mcq'] as string[],
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const addQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      question: '',
      type,
      options: type === 'mcq' || type === 'checkbox' ? ['', '', '', ''] : [],
      correct_answers: [],
      points: 1,
    };
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => (q.id === id ? { ...q, ...updates } : q)),
    }));
  };

  const removeQuestion = (id: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id),
    }));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...quiz.questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[targetIndex]] = [
      newQuestions[targetIndex],
      newQuestions[index],
    ];
    setQuiz(prev => ({ ...prev, questions: newQuestions }));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== questionId) return q;
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }),
    }));
  };

  const addOption = (questionId: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== questionId) return q;
        return { ...q, options: [...q.options, ''] };
      }),
    }));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== questionId) return q;
        const newOptions = q.options.filter((_, i) => i !== optionIndex);
        const newCorrectAnswers = q.correct_answers.filter(a => a !== q.options[optionIndex]);
        return { ...q, options: newOptions, correct_answers: newCorrectAnswers };
      }),
    }));
  };

  const toggleCorrectAnswer = (questionId: string, answer: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== questionId) return q;

        if (q.type === 'mcq') {
          return { ...q, correct_answers: [answer] };
        } else {
          const isSelected = q.correct_answers.includes(answer);
          return {
            ...q,
            correct_answers: isSelected
              ? q.correct_answers.filter(a => a !== answer)
              : [...q.correct_answers, answer],
          };
        }
      }),
    }));
  };

  const validateQuiz = (): string[] => {
    const errors: string[] = [];

    if (!quiz.title.trim()) {
      errors.push('Quiz title is required');
    }

    if (quiz.questions.length === 0) {
      errors.push('At least one question is required');
    }

    quiz.questions.forEach((q, index) => {
      const qNum = index + 1;

      if (!q.question.trim()) {
        errors.push(`Question ${qNum}: Question text is required`);
      }

      if (q.type === 'mcq' || q.type === 'checkbox') {
        const filledOptions = q.options.filter(o => o.trim());
        if (filledOptions.length < 2) {
          errors.push(`Question ${qNum}: At least 2 options are required`);
        }

        if (q.correct_answers.length === 0) {
          errors.push(`Question ${qNum}: At least one correct answer is required`);
        }

        const uniqueOptions = new Set(q.options.map(o => o.toLowerCase().trim()));
        if (uniqueOptions.size !== q.options.length) {
          errors.push(`Question ${qNum}: Duplicate options are not allowed`);
        }
      }
    });

    return errors;
  };

  const handleSave = async () => {
    const errors = validateQuiz();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);
    setValidationErrors([]);

    try {
      const quizPayload = {
        course_offering_id: courseOfferingId,
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions.map(q => ({
          question: q.question,
          type: q.type,
          options: q.options.filter(o => o.trim()),
          correct_answers: q.correct_answers,
          points: q.points,
        })),
      };

      const result = await apiFetch('/api/quiz-builder/quizzes', {
        method: 'POST',
        body: quizPayload,
      });

      setSuccess('Quiz saved successfully!');
      if (onSave) onSave(quiz);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleExportGoogleForm = async () => {
    const errors = validateQuiz();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setError(null);
      return;
    }

    setExporting(true);
    setError(null);
    setValidationErrors([]);

    try {
      const result = await apiFetch<{ formUrl: string; formId: string }>(
        '/api/quiz-builder/export-google-form',
        {
          method: 'POST',
          body: { quiz },
        }
      );

      setSuccess(`Google Form created! URL: ${result.formUrl}`);
      if (onExportGoogleForm) onExportGoogleForm(result.formUrl);

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(
        err.message ||
          'Failed to export to Google Form. Make sure your Google account is connected.'
      );
    } finally {
      setExporting(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiSettings.topic.trim()) {
      setError('Please enter a topic for AI generation');
      return;
    }

    setAiGenerating(true);
    setError(null);

    try {
      const result = await apiFetch<{ title: string; questions: any[] }>(
        '/api/quiz-builder/generate-ai',
        {
          method: 'POST',
          body: {
            topic: aiSettings.topic,
            difficulty: aiSettings.difficulty,
            num_questions: aiSettings.numQuestions,
            question_types: aiSettings.questionTypes,
          },
        }
      );

      const newQuestions: Question[] = result.questions.map((q: any, idx: number) => ({
        id: `q-${Date.now()}-${idx}`,
        question: q.question,
        type: q.type,
        options: q.options || [],
        correct_answers: q.correct_answers || [],
        points: 1,
      }));

      setQuiz(prev => ({
        ...prev,
        title: prev.title || result.title,
        questions: [...prev.questions, ...newQuestions],
      }));

      setShowAIModal(false);
      setSuccess(`Generated ${newQuestions.length} questions with AI!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions with AI');
    } finally {
      setAiGenerating(false);
    }
  };

  const questionTypeLabels: Record<Question['type'], string> = {
    mcq: 'Multiple Choice (Single Answer)',
    checkbox: 'Multiple Choice (Multiple Answers)',
    short: 'Short Answer',
    paragraph: 'Paragraph',
  };

  return (
    <div className="quiz-builder">
      <div className="quiz-builder-header">
        <h2>Quiz Builder</h2>
        <div className="quiz-builder-actions">
          <button className="btn-ai" onClick={() => setShowAIModal(true)}>
            <span className="material-symbols-outlined">auto_awesome</span>
            Generate with AI
          </button>
          <button className="btn-secondary" onClick={handleExportGoogleForm} disabled={exporting}>
            <span className="material-symbols-outlined">description</span>
            {exporting ? 'Exporting...' : 'Export to Google Form'}
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <span className="material-symbols-outlined">save</span>
            {saving ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </div>

      {error && (
        <div className="quiz-builder-error">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="quiz-builder-validation">
          <span className="material-symbols-outlined">warning</span>
          <ul>
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {success && (
        <div className="quiz-builder-success">
          <span className="material-symbols-outlined">check_circle</span>
          {success}
        </div>
      )}

      <div className="quiz-builder-content">
        <div className="quiz-metadata">
          <div className="form-group">
            <label>Quiz Title *</label>
            <input
              type="text"
              value={quiz.title}
              onChange={e => setQuiz(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter quiz title..."
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={quiz.description}
              onChange={e => setQuiz(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter quiz description (optional)..."
              rows={3}
            />
          </div>
        </div>

        <div className="questions-section">
          <h3>Questions ({quiz.questions.length})</h3>

          {quiz.questions.length === 0 ? (
            <div className="no-questions">
              <span className="material-symbols-outlined">quiz</span>
              <p>No questions yet. Add a question or generate with AI.</p>
            </div>
          ) : (
            <div className="questions-list">
              {quiz.questions.map((q, index) => (
                <div key={q.id} className="question-card">
                  <div className="question-header">
                    <div className="question-number">
                      <span>Q{index + 1}</span>
                      <span className="question-type-badge">{questionTypeLabels[q.type]}</span>
                    </div>
                    <div className="question-actions">
                      <button
                        onClick={() => moveQuestion(index, 'up')}
                        disabled={index === 0}
                        title="Move up"
                      >
                        <span className="material-symbols-outlined">arrow_upward</span>
                      </button>
                      <button
                        onClick={() => moveQuestion(index, 'down')}
                        disabled={index === quiz.questions.length - 1}
                        title="Move down"
                      >
                        <span className="material-symbols-outlined">arrow_downward</span>
                      </button>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="btn-delete"
                        title="Delete question"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="question-body">
                    <div className="form-group">
                      <label>Question Text *</label>
                      <textarea
                        value={q.question}
                        onChange={e => updateQuestion(q.id, { question: e.target.value })}
                        placeholder="Enter your question..."
                        rows={2}
                      />
                    </div>

                    {(q.type === 'mcq' || q.type === 'checkbox') && (
                      <div className="options-section">
                        <label>Options *</label>
                        <div className="options-list">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="option-row">
                              <input
                                type={q.type === 'mcq' ? 'radio' : 'checkbox'}
                                name={`correct-${q.id}`}
                                checked={q.correct_answers.includes(opt)}
                                onChange={() => toggleCorrectAnswer(q.id, opt)}
                                disabled={!opt.trim()}
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={e => updateOption(q.id, optIdx, e.target.value)}
                                placeholder={`Option ${optIdx + 1}`}
                              />
                              <button
                                onClick={() => removeOption(q.id, optIdx)}
                                disabled={q.options.length <= 2}
                                className="btn-remove-option"
                              >
                                <span className="material-symbols-outlined">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                        <button className="btn-add-option" onClick={() => addOption(q.id)}>
                          <span className="material-symbols-outlined">add</span>
                          Add Option
                        </button>
                        <p className="hint">
                          {q.type === 'mcq'
                            ? 'Select the radio button to mark the correct answer'
                            : 'Check the boxes to mark all correct answers'}
                        </p>
                      </div>
                    )}

                    {(q.type === 'short' || q.type === 'paragraph') && (
                      <div className="text-answer-preview">
                        <span className="material-symbols-outlined">text_fields</span>
                        <span>
                          Student will provide a {q.type === 'short' ? 'short' : 'detailed'} text
                          answer
                        </span>
                      </div>
                    )}

                    <div className="form-group points-group">
                      <label>Points</label>
                      <input
                        type="number"
                        value={q.points}
                        onChange={e =>
                          updateQuestion(q.id, { points: parseInt(e.target.value) || 1 })
                        }
                        min={1}
                        max={100}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="add-question-buttons">
            <button onClick={() => addQuestion('mcq')}>
              <span className="material-symbols-outlined">radio_button_checked</span>
              MCQ
            </button>
            <button onClick={() => addQuestion('checkbox')}>
              <span className="material-symbols-outlined">check_box</span>
              Checkbox
            </button>
            <button onClick={() => addQuestion('short')}>
              <span className="material-symbols-outlined">short_text</span>
              Short Answer
            </button>
            <button onClick={() => addQuestion('paragraph')}>
              <span className="material-symbols-outlined">notes</span>
              Paragraph
            </button>
          </div>
        </div>
      </div>

      {showAIModal && (
        <div className="modal-overlay" onClick={() => setShowAIModal(false)}>
          <div className="ai-modal" onClick={e => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3>
                <span className="material-symbols-outlined">auto_awesome</span>
                Generate Questions with AI
              </h3>
              <button onClick={() => setShowAIModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="ai-modal-body">
              <div className="form-group">
                <label>Topic *</label>
                <input
                  type="text"
                  value={aiSettings.topic}
                  onChange={e => setAiSettings(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g., JavaScript Arrays, Python Functions, Data Structures"
                />
              </div>

              <div className="form-group">
                <label>Difficulty</label>
                <select
                  value={aiSettings.difficulty}
                  onChange={e => setAiSettings(prev => ({ ...prev, difficulty: e.target.value }))}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="form-group">
                <label>Number of Questions</label>
                <input
                  type="number"
                  value={aiSettings.numQuestions}
                  onChange={e =>
                    setAiSettings(prev => ({
                      ...prev,
                      numQuestions: parseInt(e.target.value) || 5,
                    }))
                  }
                  min={1}
                  max={20}
                />
              </div>

              <div className="form-group">
                <label>Question Types</label>
                <div className="checkbox-group">
                  {(['mcq', 'checkbox', 'short', 'paragraph'] as const).map(type => (
                    <label key={type} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={aiSettings.questionTypes.includes(type)}
                        onChange={e => {
                          setAiSettings(prev => ({
                            ...prev,
                            questionTypes: e.target.checked
                              ? [...prev.questionTypes, type]
                              : prev.questionTypes.filter(t => t !== type),
                          }));
                        }}
                      />
                      {questionTypeLabels[type]}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="ai-modal-footer">
              <button className="btn-secondary" onClick={() => setShowAIModal(false)}>
                Cancel
              </button>
              <button
                className="btn-ai"
                onClick={handleAIGenerate}
                disabled={aiGenerating || aiSettings.questionTypes.length === 0}
              >
                {aiGenerating ? (
                  <>
                    <span className="loading-spinner"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">auto_awesome</span>
                    Generate Questions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
