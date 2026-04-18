import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/ToastProvider';
import {
  getVideoById,
  getVideoQuizQuestions,
  addVideoQuizQuestion,
  updateVideoQuizQuestion,
  deleteVideoQuizQuestion,
} from '../../features/videos/api/videos';
import { apiFetch } from '../../services/api';
import './VideoQuizEditor.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_url: string;
  cloudinary_public_id?: string;
  duration: number;
  upload_timestamp: string;
}

interface VideoSection {
  id: number;
  start_time: number;
  end_time: number;
  title: string;
  summary?: string;
  quiz_count?: number;
}

interface QuizQuestion {
  id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'open_ended';
  options?: string[];
  correct_answer: string;
  points?: number;
  explanation?: string;
  timestamp?: number;
  section_id?: number;
  section?: VideoSection;
}

type QuestionType = 'multiple_choice' | 'true_false' | 'open_ended';

export default function VideoQuizEditor() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { push } = useToast();

  const [video, setVideo] = useState<Video | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sections, setSections] = useState<VideoSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState<number>(1);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  const getDriveEmbedUrl = (v: Video | null) => {
    if (!v) {
      console.log('Video is null');
      return '';
    }
    console.log('Video data:', v);
    console.log('cloudinary_public_id:', v.cloudinary_public_id);
    console.log('video_url:', v.video_url);

    // Check if cloudinary_public_id exists and contains a Google Drive file ID
    if (v.cloudinary_public_id) {
      console.log('Checking cloudinary_public_id for Drive ID...');
      const driveMatch = v.cloudinary_public_id.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (driveMatch && driveMatch[1]) {
        console.log('Found Drive ID in cloudinary_public_id:', driveMatch[1]);
        return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
      }
    }
    // Check if video_url is a Google Drive URL
    if (v.video_url) {
      console.log('Checking video_url for Drive ID...');
      const driveMatch = v.video_url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (driveMatch && driveMatch[1]) {
        console.log('Found Drive ID in video_url:', driveMatch[1]);
        return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
      }
      // Otherwise use the video_url as-is
      console.log('Using video_url as-is:', v.video_url);
      return v.video_url;
    }
    console.log('No video URL found');
    return '';
  };

  const embedUrl = getDriveEmbedUrl(video);

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimestamp = (str: string) => {
    const parts = str.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10) || 0;
      const secs = parseInt(parts[1], 10) || 0;
      return mins * 60 + secs;
    }
    return 0;
  };

  useEffect(() => {
    if (!videoId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const response = (await getVideoById(Number(videoId))) as { video: Video };
        const videoData = response.video;
        console.log('API Response:', response);
        setVideo(videoData);
        if (videoData.duration) {
          setDuration(videoData.duration);
        }

        const questionsData = await getVideoQuizQuestions(Number(videoId));
        setQuestions(Array.isArray(questionsData) ? questionsData : []);

        // Load sections
        const sectionsResponse = await apiFetch(`/api/videos/${videoId}/sections`);
        setSections(sectionsResponse.sections || []);
      } catch (err) {
        console.error('Failed to load video data:', err);
        push({ kind: 'error', message: 'Failed to load video data' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [videoId, push]);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      if (correctAnswer === index) {
        setCorrectAnswer(0);
      } else if (correctAnswer > index) {
        setCorrectAnswer(correctAnswer - 1);
      }
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const resetForm = () => {
    setQuestionType('multiple_choice');
    setQuestionText('');
    setOptions(['', '']);
    setCorrectAnswer(1);
    setTargetTimestamp('');
    setEditingQuestion(null);
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoId || !questionText.trim()) return;

    const timestamp = targetTimestamp ? parseTimestamp(targetTimestamp) : null;

    const questionData = {
      question_text: questionText,
      question_type: questionType,
      options: questionType === 'multiple_choice' ? options.filter(o => o.trim()) : undefined,
      correct_answer:
        questionType === 'true_false'
          ? correctAnswer === 0
            ? 'true'
            : 'false'
          : options[correctAnswer] || '',
      section_id: selectedSectionId,
    };

    try {
      if (editingQuestion) {
        await updateVideoQuizQuestion(Number(videoId), editingQuestion.id, questionData);
        setQuestions(prev =>
          prev.map(q =>
            q.id === editingQuestion.id
              ? { ...q, ...questionData, timestamp: timestamp || undefined }
              : q
          )
        );
        push({ kind: 'success', message: 'Question updated successfully' });
      } else {
        const created = (await addVideoQuizQuestion(Number(videoId), questionData)) as QuizQuestion;
        setQuestions(prev => [...prev, created]);
        push({ kind: 'success', message: 'Question added successfully' });
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save question:', err);
      push({ kind: 'error', message: 'Failed to save question' });
    }
  };

  const handleEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setQuestionText(question.question_text);
    setQuestionType(question.question_type);

    if (question.options && question.options.length > 0) {
      setOptions(question.options);
    } else {
      setOptions(['', '']);
    }

    if (question.question_type === 'true_false') {
      setCorrectAnswer(question.correct_answer === 'true' ? 0 : 1);
    } else if (question.options) {
      const idx = question.options.indexOf(question.correct_answer);
      setCorrectAnswer(idx >= 0 ? idx : 0);
    }

    if (question.section_id) {
      setSelectedSectionId(question.section_id);
    } else {
      setSelectedSectionId(null);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!videoId) return;

    try {
      await deleteVideoQuizQuestion(Number(videoId), questionId);
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      push({ kind: 'success', message: 'Question deleted successfully' });
    } catch (err) {
      console.error('Failed to delete question:', err);
      push({ kind: 'error', message: 'Failed to delete question' });
    }
  };

  const getQuestionTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple Choice';
      case 'true_false':
        return 'True / False';
      case 'open_ended':
        return 'Open Ended';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="video-quiz-editor-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="video-quiz-editor">
      <header className="video-quiz-editor-header">
        <h1 className="header-title">{video?.title || 'Video Quiz Editor'}</h1>
      </header>

      <div className="video-quiz-editor-content">
        <div className="left-column">
          <section className="video-player-section">
            <div className="video-container">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  title={video?.title}
                />
              ) : (
                <div className="video-placeholder">
                  <span className="material-symbols-outlined">play_circle</span>
                  <p>No video URL available</p>
                </div>
              )}
            </div>
          </section>

          <section className="add-question-form">
            <div className="form-header">
              <span className="form-icon">
                <span className="material-symbols-outlined">add_circle</span>
              </span>
              <h3>{editingQuestion ? 'Edit Interactive Question' : 'Add Interactive Question'}</h3>
            </div>
            <form onSubmit={handleSubmitQuestion}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Section</label>
                  <select 
                    value={selectedSectionId || ''}
                    onChange={e => setSelectedSectionId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select section...</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>
                        {formatTimestamp(section.start_time)} - {formatTimestamp(section.end_time)}: {section.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Question Type</label>
                  <select
                    value={questionType}
                    onChange={e => setQuestionType(e.target.value as QuestionType)}
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="open_ended">Open Ended</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Question Text</label>
                <textarea
                  placeholder="Enter the question that will appear..."
                  rows={2}
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  required
                />
              </div>

              {questionType === 'multiple_choice' && (
                <div className="options-section">
                  <label>Answer Options</label>
                  {options.map((option, index) => (
                    <div key={index} className="option-row">
                      <input
                        type="radio"
                        name="correct"
                        checked={correctAnswer === index}
                        onChange={() => setCorrectAnswer(index)}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={e => handleOptionChange(index, e.target.value)}
                        required
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          className="remove-option-btn"
                          onClick={() => handleRemoveOption(index)}
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                  {options.length < 6 && (
                    <button type="button" className="add-option-btn" onClick={handleAddOption}>
                      <span className="material-symbols-outlined">add</span> Add another option
                    </button>
                  )}
                </div>
              )}

              {questionType === 'true_false' && (
                <div className="options-section">
                  <label>Correct Answer</label>
                  <div className="true-false-options">
                    <label className="tf-option">
                      <input
                        type="radio"
                        name="correct"
                        checked={correctAnswer === 0}
                        onChange={() => setCorrectAnswer(0)}
                      />
                      <span>True</span>
                    </label>
                    <label className="tf-option">
                      <input
                        type="radio"
                        name="correct"
                        checked={correctAnswer === 1}
                        onChange={() => setCorrectAnswer(1)}
                      />
                      <span>False</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-discard" onClick={resetForm}>
                  {editingQuestion ? 'Cancel' : 'Discard'}
                </button>
                <button type="submit" className="btn-save">
                  {editingQuestion ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="right-column">
          <div className="questions-panel">
            <div className="questions-panel-header">
              <h3>Section Questions ({sections.length} sections)</h3>
              <span className="questions-count">{questions.length} Total</span>
            </div>
            <div className="questions-list">
              {questions.length === 0 ? (
                <div className="empty-state">
                  <span className="material-symbols-outlined">quiz</span>
                  <p>No questions yet. Add your first question to this video.</p>
                </div>
              ) : (
                questions
                  .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
                  .map((question, index) => (
                    <div
                      key={question.id}
                      className={`question-card ${index === 0 ? 'question-card-highlighted' : ''}`}
                    >
                      <div className="question-card-header">
                      <span
                          className={
                            index === 0 ? 'timestamp-badge-highlighted' : 'timestamp-badge'
                          }
                        >
                          {question.section ? formatTimestamp(question.section.start_time) : 'No section'}
                        </span>
                        <div className="question-actions">
                          <button
                            className="action-btn"
                            onClick={() => handleEditQuestion(question)}
                            title="Edit"
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            className="action-btn action-btn-delete"
                            onClick={() => handleDeleteQuestion(question.id)}
                            title="Delete"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                      <p className="question-text">{question.question_text}</p>
                      <div className="question-meta">
                        <span className="material-symbols-outlined">info</span>
                        {getQuestionTypeLabel(question.question_type)}
                        {question.options &&
                          question.options.length > 0 &&
                          ` • ${question.options.length} Options`}
                      </div>
                    </div>
                  ))
              )}
            </div>
            <div className="questions-panel-footer">
              <button className="preview-btn">
                <span className="material-symbols-outlined">preview</span>
                Preview Interactive Video
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
