import { useState, useEffect } from 'react';
import { getVideoQuizAttempts, getVideoQuizQuestions } from '../services/videos';
import './VideoQuizResults.css';

interface VideoQuizResultsProps {
  videoId: number;
}

interface Attempt {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  max_score: number | null;
  answers: Record<number, {
    answer: any;
    is_correct: boolean;
    points_earned: number;
    explanation: string | null;
    answered_at: string;
  }>;
}

interface Question {
  id: number;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  points: number;
  timestamp: number | null;
}

export default function VideoQuizResults({ videoId }: VideoQuizResultsProps) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  // const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, [videoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [attemptsData, questionsData] = await Promise.all([
        getVideoQuizAttempts(videoId),
        getVideoQuizQuestions(videoId),
      ]);
      setAttempts(attemptsData.attempts || []);
      setQuestions(questionsData.questions || []);
    } catch (error: any) {
      console.error('Error loading quiz results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const toggleStudent = (studentId: number) => {
    setExpandedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // const getQuestionById = (questionId: number): Question | undefined => {
  //   return questions.find((q) => q.id === questionId);
  // };

  const getPercentage = (score: number | null, maxScore: number | null): number => {
    if (!score || !maxScore || maxScore === 0) return 0;
    return Math.round((score / maxScore) * 100);
  };

  if (loading) {
    return (
      <div className="video-quiz-results-loading">
        <p>Loading quiz results...</p>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="video-quiz-results-empty">
        <p>No quiz attempts found yet.</p>
      </div>
    );
  }

  return (
    <div className="video-quiz-results">
      <div className="results-header">
        <h3>Student Quiz Results</h3>
        <span className="results-count">{attempts.length} {attempts.length === 1 ? 'student' : 'students'}</span>
      </div>

      <div className="attempts-list">
        {attempts.map((attempt) => {
          const isExpanded = expandedStudents.has(attempt.student_id);
          const percentage = getPercentage(attempt.score, attempt.max_score);
          const completed = attempt.completed_at !== null;

          return (
            <div key={attempt.id} className="attempt-card">
              <div className="attempt-header" onClick={() => toggleStudent(attempt.student_id)}>
                <div className="student-info">
                  <div className="student-name">{attempt.student_name}</div>
                  <div className="student-email">{attempt.student_email}</div>
                </div>
                <div className="attempt-stats">
                  {completed ? (
                    <>
                      <div className="score-badge">
                        {attempt.score !== null && attempt.max_score !== null
                          ? `${attempt.score} / ${attempt.max_score}`
                          : 'N/A'}
                      </div>
                      <div className="percentage-badge" data-percentage={percentage}>
                        {percentage}%
                      </div>
                    </>
                  ) : (
                    <div className="in-progress-badge">In Progress</div>
                  )}
                </div>
                <button className="expand-button">
                  {isExpanded ? '▼' : '▶'}
                </button>
              </div>

              {isExpanded && (
                <div className="attempt-details">
                  <div className="attempt-meta">
                    <div className="meta-item">
                      <span className="meta-label">Started:</span>
                      <span className="meta-value">{formatDate(attempt.started_at)}</span>
                    </div>
                    {completed && (
                      <div className="meta-item">
                        <span className="meta-label">Completed:</span>
                        <span className="meta-value">{formatDate(attempt.completed_at!)}</span>
                      </div>
                    )}
                  </div>

                  <div className="answers-section">
                    <h4>Answers</h4>
                    {questions.map((question) => {
                      const answer = attempt.answers[question.id];
                      if (!answer) return null;

                      const options = question.options
                        ? typeof question.options === 'string'
                          ? JSON.parse(question.options)
                          : question.options
                        : [];

                      return (
                        <div key={question.id} className="answer-item">
                          <div className="answer-question">
                            <div className="question-header">
                              {question.timestamp !== null && (
                                <span className="question-timestamp">
                                  {formatTime(question.timestamp)}
                                </span>
                              )}
                              <span className="question-type">{question.question_type}</span>
                            </div>
                            <p className="question-text">{question.question_text}</p>
                          </div>

                          <div className="answer-details">
                            <div className="answer-student">
                              <span className="answer-label">Student Answer:</span>
                              <span className="answer-value">
                                {question.question_type === 'mcq' && options.length > 0
                                  ? options[Number(answer.answer)] || answer.answer
                                  : question.question_type === 'true_false'
                                  ? answer.answer === true || answer.answer === 'true'
                                    ? 'True'
                                    : 'False'
                                  : answer.answer}
                              </span>
                            </div>

                            <div className="answer-result">
                              <span
                                className={`result-badge ${answer.is_correct ? 'correct' : 'incorrect'}`}
                              >
                                {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                              </span>
                              <span className="points-earned">
                                {answer.points_earned} / {question.points} points
                              </span>
                            </div>

                            {answer.explanation && (
                              <div className="answer-explanation">
                                <span className="explanation-label">Explanation:</span>
                                <p className="explanation-text">{answer.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

