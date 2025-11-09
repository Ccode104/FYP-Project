import React from 'react';import { useState, useEffect } from 'react';
import {
  getVideoQuizQuestions,
  addVideoQuizQuestion,
  updateVideoQuizQuestion,
  deleteVideoQuizQuestion,
} from '../services/videos';
import './VideoQuestionManager.css';

interface VideoQuestionManagerProps {
  videoId: number;
  videoDuration?: number;
  currentTime?: number;
  onTimeSelect?: (time: number) => void;
}

export default function VideoQuestionManager({
  videoId,
  videoDuration,
  currentTime,
  onTimeSelect,
}: VideoQuestionManagerProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'mcq',
    options: ['', '', '', ''],
    correct_answer: '',
    points: '1.0',
    explanation: '',
    timestamp: '',
  });
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Load questions
  useEffect(() => {
    loadQuestions();
  }, [videoId]);

  const loadQuestions = async () => {
    try {
      const data = await getVideoQuizQuestions(videoId);
      setQuestions(data.questions || []);
    } catch (error: any) {
      console.error('Error loading questions:', error);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setFormData({
      question_text: '',
      question_type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      points: '1.0',
      explanation: '',
      timestamp: currentTime ? String(currentTime) : '',
    });
    setShowForm(true);
  };

  const handleEditQuestion = (question: any) => {
    setEditingQuestion(question);
    const options = question.options ? JSON.parse(question.options) : ['', '', '', ''];
    setFormData({
      question_text: question.question_text || '',
      question_type: question.question_type || 'mcq',
      options: Array.isArray(options) ? options : ['', '', '', ''],
      correct_answer: question.correct_answer || '',
      points: String(question.points || 1.0),
      explanation: question.explanation || '',
      timestamp: question.timestamp ? String(question.timestamp) : '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.question_text.trim() || !formData.correct_answer.trim()) {
      setMessage({ kind: 'error', text: 'Question text and correct answer are required' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (formData.question_type === 'mcq' && formData.options.filter((o) => o.trim()).length < 2) {
      setMessage({ kind: 'error', text: 'MCQ must have at least 2 options' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      const questionData: any = {
        question_text: formData.question_text,
        question_type: formData.question_type,
        correct_answer: formData.correct_answer,
        points: parseFloat(formData.points) || 1.0,
        explanation: formData.explanation || null,
        timestamp: formData.timestamp ? parseFloat(formData.timestamp) : null,
      };

      if (formData.question_type === 'mcq') {
        questionData.options = formData.options.filter((o) => o.trim());
      }

      if (editingQuestion) {
        await updateVideoQuizQuestion(videoId, editingQuestion.id, questionData);
        setMessage({ kind: 'success', text: 'Question updated successfully' });
      } else {
        await addVideoQuizQuestion(videoId, questionData);
        setMessage({ kind: 'success', text: 'Question added successfully' });
      }

      setShowForm(false);
      setEditingQuestion(null);
      loadQuestions();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving question:', error);
      setMessage({ kind: 'error', text: error?.message || 'Failed to save question' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDelete = async (questionId: number) => {
    if (!confirm('Delete this question?')) return;

    try {
      await deleteVideoQuizQuestion(videoId, questionId);
      setMessage({ kind: 'success', text: 'Question deleted' });
      loadQuestions();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ kind: 'error', text: error?.message || 'Failed to delete question' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (!seconds && seconds !== 0) return 'No timestamp';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-question-manager">
      <div className="manager-header">
        <h4>Quiz Questions</h4>
        <button className="btn btn-primary" onClick={handleAddQuestion}>
          + Add Question
        </button>
      </div>

      {message && (
        <div className={`message-banner ${message.kind}`}>
          <span>{message.text}</span>
          <button className="message-close" onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {showForm && (
        <div className="question-form-card">
          <h5>{editingQuestion ? 'Edit Question' : 'Add New Question'}</h5>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
            <div className="form-group">
              <label>Question Text *</label>
              <textarea
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                placeholder="Enter the question"
                rows={3}
                required
              />
            </div>

            <div className="form-group">
              <label>Question Type *</label>
              <select
                value={formData.question_type}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    question_type: e.target.value,
                    correct_answer: '',
                    options: e.target.value === 'mcq' ? ['', '', '', ''] : [],
                  });
                }}
                required
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="true_false">True/False</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>

            {formData.question_type === 'mcq' && (
              <div className="form-group">
                <label>Options *</label>
                {formData.options.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...formData.options];
                      newOptions[index] = e.target.value;
                      setFormData({ ...formData, options: newOptions });
                    }}
                    placeholder={`Option ${index + 1}`}
                    style={{ marginBottom: 8 }}
                  />
                ))}
                <div className="form-hint">
                  <label>Correct Answer (Option Index): *</label>
                  <input
                    type="number"
                    min="0"
                    max={formData.options.length - 1}
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    placeholder="0, 1, 2, or 3"
                    required
                  />
                </div>
              </div>
            )}

            {formData.question_type === 'true_false' && (
              <div className="form-group">
                <label>Correct Answer *</label>
                <select
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                  required
                >
                  <option value="">Select answer</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
            )}

            {formData.question_type === 'short_answer' && (
              <div className="form-group">
                <label>Correct Answer *</label>
                <input
                  type="text"
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                  placeholder="Expected answer"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>
                Timestamp (seconds) *
                {currentTime !== undefined && (
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setFormData({ ...formData, timestamp: String(Math.floor(currentTime)) });
                      if (onTimeSelect) onTimeSelect(currentTime);
                    }}
                    style={{ marginLeft: 8, fontSize: '0.875rem' }}
                  >
                    Use Current Time ({formatTime(currentTime)})
                  </button>
                )}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max={videoDuration || undefined}
                value={formData.timestamp}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                placeholder="e.g., 30.5 (30 seconds 500ms)"
                required
              />
              <small className="form-hint">
                Video will pause at this timestamp and show the question to students
              </small>
            </div>

            <div className="form-group">
              <label>Points</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                placeholder="1.0"
              />
            </div>

            <div className="form-group">
              <label>Explanation (shown after answering)</label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="Optional explanation"
                rows={2}
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn" onClick={() => { setShowForm(false); setEditingQuestion(null); }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingQuestion ? 'Update Question' : 'Add Question'}
              </button>
            </div>
          </form>
        </div>
      )}

      {questions.length === 0 ? (
        <p className="muted">No questions added yet. Click "Add Question" to create one.</p>
      ) : (
        <div className="questions-list">
          {questions.map((q, idx) => (
            <div key={`${q.id}-${idx}`} className="question-item">
              <div className="question-header">
                <div>
                  <strong>{q.question_text}</strong>
                  <span className="question-meta">
                    {formatTime(q.timestamp)} • {q.question_type} • {q.points} points
                  </span>
                </div>
                <div className="question-actions">
                  <button className="btn" onClick={() => handleEditQuestion(q)}>
                    Edit
                  </button>
                  <button className="btn" onClick={() => handleDelete(q.id)}>
                    Delete
                  </button>
                </div>
              </div>
              {q.explanation && (
                <p className="question-explanation">Explanation: {q.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

