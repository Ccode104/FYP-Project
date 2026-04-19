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
  getVideoSections,
  createVideoSection,
  updateVideoSection,
  deleteVideoSection,
  autoGenerateSections,
} from '../../features/videos/api/videos';
import './VideoQuizEditor.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_url: string;
  cloudinary_public_id?: string;
  drive_file_id?: string;
  embed_url?: string;
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

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<VideoSection | null>(null);
  const [sectionForm, setSectionForm] = useState({
    start_time: '',
    end_time: '',
    title: '',
    summary: '',
  });
  const [generatingSections, setGeneratingSections] = useState(false);
  const [targetTimestamp, setTargetTimestamp] = useState('');

  const getDriveEmbedUrl = (v: Video | null) => {
    if (!v) return '';

    // Use embed_url from backend if available
    if (v.embed_url) {
      return v.embed_url;
    }

    // Helper to extract Drive file ID from various URL formats
    const extractDriveFileId = (url: string): string | null => {
      // Pattern 1: /file/d/FILE_ID (embed URL)
      const match1 = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (match1 && match1[1]) return match1[1];

      // Pattern 2: ?id=FILE_ID or &id=FILE_ID (download URL)
      const match2 = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
      if (match2 && match2[1]) return match2[1];

      return null;
    };

    // Check if drive_file_id exists (most reliable)
    if (v.drive_file_id) {
      return `https://drive.google.com/file/d/${v.drive_file_id}/preview?usp=drivesdk`;
    }

    // Check cloudinary_public_id (contains Drive file ID)
    if (v.cloudinary_public_id) {
      const fileId = extractDriveFileId(v.cloudinary_public_id);
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview?usp=drivesdk`;
      }
    }

    // Check video_url
    if (v.video_url) {
      const fileId = extractDriveFileId(v.video_url);
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview?usp=drivesdk`;
      }
      // Fallback: use video_url as-is
      return v.video_url;
    }

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
        const videoResponse = await getVideoById(Number(videoId));
        const videoData = (videoResponse as { video: Video }).video;
        console.log('API Response:', videoResponse);
        setVideo(videoData);
        if (videoData.duration) {
          setDuration(videoData.duration);
        }

        const questionsResponse = await getVideoQuizQuestions(Number(videoId));
        console.log('Questions API raw response:', questionsResponse);
        const questions = (questionsResponse as { questions: QuizQuestion[] }).questions || [];
        console.log('Questions after extract:', questions);
        setQuestions(questions);

        // Load sections
        const sectionsResponse = await getVideoSections(Number(videoId));
        console.log('Sections API raw response:', sectionsResponse);
        const sectionsData = sectionsResponse.sections || [];
        console.log(
          'Sections loaded:',
          sectionsData.map(s => ({ id: s.id, title: s.title }))
        );
        setSections(sectionsData);
      } catch (err) {
        console.error('Failed to load video data:', err);
        push({ kind: 'error', message: 'Failed to load video data' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [videoId, push]);

  // Enrich questions with full section objects when sections load or change
  useEffect(() => {
    if (sections.length === 0) {
      console.log('Enrich: sections array is empty, skipping');
      return;
    }
    console.log(
      'Enrich: running with sections:',
      sections.map(s => ({ id: s.id, title: s.title, id_type: typeof s.id }))
    );
    setQuestions(prev => {
      const enriched = prev.map(q => {
        console.log(
          `Enrich: Q${q.id} - section_id=${q.section_id} (type: ${typeof q.section_id}), hasSection=`,
          !!q.section
        );
        if (q.section) {
          console.log(`  already has section: "${q.section.title}"`);
          return q;
        }
        if (q.section_id != null) {
          const section = sections.find(s => {
            const match = s.id == q.section_id;
            if (match) {
              console.log(
                `  MATCHED section "${s.title}" (id=${s.id}) for section_id=${q.section_id}`
              );
            } else {
              console.log(
                `  no match: comparing s.id=${s.id} (${typeof s.id}) with q.section_id=${q.section_id} (${typeof q.section_id})`
              );
            }
            return match;
          });
          if (section) {
            return { ...q, section };
          } else {
            console.log(`  No section found in sections array for section_id=${q.section_id}`);
          }
        } else {
          console.log(`  Q${q.id} has no section_id`);
        }
        return q;
      });
      console.log(
        'Enrich: after mapping, questions:',
        enriched.map(q => ({
          id: q.id,
          section_id: q.section_id,
          hasSection: !!q.section,
          sectionTitle: q.section?.title,
        }))
      );
      return enriched;
    });
  }, [sections]);

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
    setSelectedSectionId(null);
    setEditingQuestion(null);
  };

  const enrichQuestionWithSection = (q: QuizQuestion): QuizQuestion => {
    if (q.section) return q;
    if (q.section_id != null && sections.length > 0) {
      const section = sections.find(s => s.id == q.section_id);
      if (section) {
        return { ...q, section };
      }
    }
    return q;
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
      timestamp: timestamp,
    };

    try {
      if (editingQuestion) {
        const response = await updateVideoQuizQuestion(
          Number(videoId),
          editingQuestion.id,
          questionData
        );
        const updatedQuestion = enrichQuestionWithSection(
          (response as { question: QuizQuestion }).question
        );
        setQuestions(prev => prev.map(q => (q.id === editingQuestion.id ? updatedQuestion : q)));
        push({ kind: 'success', message: 'Question updated successfully' });
      } else {
        const response = await addVideoQuizQuestion(Number(videoId), questionData);
        const created = enrichQuestionWithSection(
          (response as { question: QuizQuestion }).question
        );
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

    setTargetTimestamp(question.timestamp ? formatTimestamp(question.timestamp) : '');
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

  const openAddSection = () => {
    setEditingSection(null);
    setSectionForm({
      start_time: '00:00',
      end_time: formatTimestamp(duration || 600),
      title: '',
      summary: '',
    });
    setShowSectionModal(true);
  };

  const openEditSection = (section: VideoSection) => {
    setEditingSection(section);
    setSectionForm({
      start_time: formatTimestamp(section.start_time),
      end_time: formatTimestamp(section.end_time),
      title: section.title,
      summary: section.summary || '',
    });
    setShowSectionModal(true);
  };

  const handleSaveSection = async () => {
    if (!videoId || !sectionForm.title.trim()) {
      push({ kind: 'error', message: 'Title is required' });
      return;
    }

    const startSec = parseTimestamp(sectionForm.start_time);
    const endSec = parseTimestamp(sectionForm.end_time);

    if (sectionForm.start_time && sectionForm.end_time && endSec <= startSec) {
      push({ kind: 'error', message: 'End time must be after start time' });
      return;
    }

    try {
      const sectionData = {
        title: sectionForm.title,
        summary: sectionForm.summary,
        ...(sectionForm.start_time ? { start_time: startSec } : {}),
        ...(sectionForm.end_time ? { end_time: endSec } : {}),
      };

      if (editingSection) {
        const updated = await updateVideoSection(Number(videoId), editingSection.id, sectionData);
        setSections(prev =>
          prev.map(s => (s.id === editingSection.id ? { ...s, ...updated.section } : s))
        );
        push({ kind: 'success', message: 'Section updated successfully' });
      } else {
        const created = await createVideoSection(Number(videoId), sectionData);
        setSections(prev => [...prev, created.section]);
        push({ kind: 'success', message: 'Section created successfully' });
      }
      setShowSectionModal(false);
    } catch (err: any) {
      console.error('Failed to save section:', err);
      const msg = err?.response?.data?.error || 'Failed to save section';
      push({ kind: 'error', message: msg });
    }
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (!confirm('Delete this section? Quiz questions linked to it will not be deleted.')) return;

    try {
      await deleteVideoSection(Number(videoId), sectionId);
      setSections(prev => prev.filter(s => s.id !== sectionId));
      if (selectedSectionId === sectionId) setSelectedSectionId(null);
      push({ kind: 'success', message: 'Section deleted successfully' });
    } catch (err) {
      console.error('Failed to delete section:', err);
      push({ kind: 'error', message: 'Failed to delete section' });
    }
  };

  const handleAutoGenerate = async () => {
    if (!videoId) return;

    setGeneratingSections(true);
    try {
      const result = await autoGenerateSections(Number(videoId));
      const sectionsResp = await getVideoSections(Number(videoId));
      setSections(sectionsResp.sections || []);
      push({
        kind: 'success',
        message: `Generated ${result.sections} sections${result.transcriptGenerated ? ' with transcript' : ''}`,
      });
    } catch (err: any) {
      console.error('Failed to auto-generate sections:', err);
      const msg = err?.response?.data?.error || 'Failed to auto-generate sections';
      push({ kind: 'error', message: msg });
    } finally {
      setGeneratingSections(false);
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
                  className="drive-iframe"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="no-referrer"
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
                    onChange={e =>
                      setSelectedSectionId(e.target.value ? parseInt(e.target.value) : null)
                    }
                  >
                    <option value="">Select section...</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>
                        {formatTimestamp(section.start_time)} - {formatTimestamp(section.end_time)}:{' '}
                        {section.title}
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

          <section className="sections-panel">
            <div className="sections-panel-header">
              <h3>Video Sections</h3>
              <div className="sections-actions">
                <button
                  className="btn-secondary"
                  onClick={handleAutoGenerate}
                  disabled={generatingSections}
                  title="Auto-generate sections using AI"
                >
                  <span className="material-symbols-outlined">auto_awesome</span>
                  {generatingSections ? 'Generating...' : 'Auto-Generate'}
                </button>
                <button className="btn-primary" onClick={openAddSection}>
                  <span className="material-symbols-outlined">add</span>
                  Add Section
                </button>
              </div>
            </div>
            <div className="sections-list">
              {sections.length === 0 ? (
                <div className="empty-state">
                  <span className="material-symbols-outlined">segment</span>
                  <p>No sections yet. Add sections to organize quiz questions.</p>
                </div>
              ) : (
                sections.map(section => (
                  <div key={section.id} className="section-card">
                    <div className="section-card-header">
                      <span className="section-time">
                        {formatTimestamp(section.start_time)} - {formatTimestamp(section.end_time)}
                      </span>
                      <div className="section-actions">
                        <button
                          className="action-btn"
                          onClick={() => openEditSection(section)}
                          title="Edit"
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button
                          className="action-btn action-btn-delete"
                          onClick={() => handleDeleteSection(section.id)}
                          title="Delete"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                    <h4 className="section-title">{section.title}</h4>
                    {section.summary && <p className="section-summary">{section.summary}</p>}
                    <span className="section-quiz-count">{section.quiz_count || 0} questions</span>
                  </div>
                ))
              )}
            </div>
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
                          {(() => {
                            const sectionName = question.section ? question.section.title : null;
                            const sectionId = question.section_id;
                            console.log(
                              `Render badge for Q${question.id}: section=${sectionName}, section_id=${sectionId}, fullQuestion=`,
                              question
                            );
                            return question.section ? question.section.title : 'No section';
                          })()}
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

      {showSectionModal && (
        <div className="modal-overlay" onClick={() => setShowSectionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSection ? 'Edit Section' : 'Add New Section'}</h3>
              <button className="modal-close" onClick={() => setShowSectionModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p
                className="modal-hint"
                style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px' }}
              >
                Note: Two sections cannot have the same name. Adding timestamps is highly
                recommended for better quiz alignment.
              </p>
              <div className="form-group">
                <label>
                  Start Time (mm:ss){' '}
                  <span style={{ color: '#f59e0b', fontSize: '12px' }}>(highly recommended)</span>
                </label>
                <input
                  type="text"
                  value={sectionForm.start_time}
                  onChange={e => setSectionForm({ ...sectionForm, start_time: e.target.value })}
                  placeholder="00:00"
                />
              </div>
              <div className="form-group">
                <label>
                  End Time (mm:ss){' '}
                  <span style={{ color: '#f59e0b', fontSize: '12px' }}>(highly recommended)</span>
                </label>
                <input
                  type="text"
                  value={sectionForm.end_time}
                  onChange={e => setSectionForm({ ...sectionForm, end_time: e.target.value })}
                  placeholder="05:00"
                />
              </div>
              <div className="form-group">
                <label>Section Title</label>
                <input
                  type="text"
                  value={sectionForm.title}
                  onChange={e => setSectionForm({ ...sectionForm, title: e.target.value })}
                  placeholder="e.g., Introduction, Main Concepts"
                  required
                />
              </div>
              <div className="form-group">
                <label>Summary (optional)</label>
                <textarea
                  value={sectionForm.summary}
                  onChange={e => setSectionForm({ ...sectionForm, summary: e.target.value })}
                  placeholder="Brief description of this section..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSectionModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveSection}>
                {editingSection ? 'Update Section' : 'Create Section'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
