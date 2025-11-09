import { useState, useRef, useEffect, useCallback } from 'react';
import {
  getVideoQuizQuestions,
  startVideoQuizAttempt,
  submitVideoQuizAnswer,
  completeVideoQuizAttempt,
  getVideoQuizAttempt,
} from '../services/videos';
import { useToast } from './ToastProvider';
import './InteractiveVideoPlayer.css';

interface Question {
  id: number;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  points: number;
  explanation: string | null;
  timestamp: number | null;
}

interface VideoPlayerProps {
  video: {
    id: number;
    title: string;
    description?: string;
    video_url: string;
    duration?: number;
  };
  userRole: string;
  onComplete?: (score: number, maxScore: number) => void;
}

export default function InteractiveVideoPlayer({ video, userRole, onComplete }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [attempt, setAttempt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAnswerResult, setLastAnswerResult] = useState<{ is_correct: boolean; explanation: string | null } | null>(null);
  const [answerResults, setAnswerResults] = useState<Record<number, { is_correct: boolean; explanation: string | null }>>({});
  const { push } = useToast();

  // Load questions and attempt on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Load questions
        const questionsData = await getVideoQuizQuestions(video.id);
        const questionsList = questionsData.questions || [];
        setQuestions(questionsList);

        // For students, load or start attempt
        if (userRole === 'student') {
          try {
            const attemptData = await getVideoQuizAttempt(video.id);
            console.log(attempt);
            setAttempt(attemptData.attempt);
            if (attemptData.attempt?.answers) {
              const answers = attemptData.attempt.answers;
              const answered = new Set<number>();
              const studentAns: Record<number, string> = {};
              const results: Record<number, { is_correct: boolean; explanation: string | null }> = {};
              for (const qid of Object.keys(answers)) {
                const qidNum = parseInt(qid);
                answered.add(qidNum);
                studentAns[qidNum] = answers[qid].answer;
                // Store result if available
                if (answers[qid].is_correct !== undefined) {
                  results[qidNum] = {
                    is_correct: answers[qid].is_correct,
                    explanation: answers[qid].explanation || null,
                  };
                }
              }
              setAnsweredQuestions(answered);
              setStudentAnswers(studentAns);
              setAnswerResults(results);
            }
            if (attemptData.attempt?.completed_at) {
              setScore(attemptData.attempt.score);
              setMaxScore(attemptData.attempt.max_score);
              setShowScore(true);
            }
          } catch (err) {
            // Attempt doesn't exist, start new one
            try {
              const newAttempt = await startVideoQuizAttempt(video.id);
              setAttempt(newAttempt.attempt);
              setMaxScore(newAttempt.attempt.max_score);
            } catch (e: any) {
              console.error('Failed to start attempt:', e);
            }
          }
        }
      } catch (error: any) {
        console.error('Error loading video quiz data:', error);
        push({ kind: 'error', message: 'Failed to load video quiz data' });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [video.id, userRole, push]);

  // Track last checked time to avoid duplicate checks
  const lastCheckedTimeRef = useRef<number>(0);
  const lastQuestionIdRef = useRef<number | null>(null);
  const pauseRequestedRef = useRef<boolean>(false);
  // Throttle duplicate seek toasts
  const lastToastRef = useRef<{ key: string; time: number } | null>(null);

  // Check for questions at current time - show unanswered or when seeking back to answered ones
  const checkForQuestion = useCallback(() => {
    if (!videoRef.current || userRole !== 'student' || questions.length === 0) return;

    const video = videoRef.current;
    const currentTime = video.currentTime;
    
    // Skip if we've already checked this time (within 0.05 seconds)
    if (Math.abs(currentTime - lastCheckedTimeRef.current) < 0.01) {
      return;
    }
    
    lastCheckedTimeRef.current = currentTime;

    // Find question at current timestamp (both answered and unanswered)
    const questionAtTime = questions.find((q) => {
      if (!q.timestamp) return false;
      // Check if we're at the question timestamp (within 0.5 second window)
      return Math.abs(currentTime - q.timestamp) < 0.5;
    });

    if (questionAtTime && questionAtTime.timestamp !== null) {
      // If it's an unanswered question, pause and show it
      if (!answeredQuestions.has(questionAtTime.id)) {
        // Prevent duplicate triggers for the same question
        if (lastQuestionIdRef.current === questionAtTime.id && currentQuestion?.id === questionAtTime.id) {
          return;
        }
        
        lastQuestionIdRef.current = questionAtTime.id;
        pauseRequestedRef.current = true;

        // Immediately pause the video
        video.pause();
        
        // Set the video time to exactly the question timestamp
        if (Math.abs(video.currentTime - questionAtTime.timestamp) > 0.1) {
          video.currentTime = questionAtTime.timestamp;
        }

        // Show the question immediately
        setCurrentQuestion(questionAtTime);
        setSelectedAnswer(studentAnswers[questionAtTime.id] || '');
        setLastAnswerResult(null);
      } else {
        // If it's an answered question and user seeks back, show it again (read-only)
        if (currentQuestion?.id !== questionAtTime.id) {
          setCurrentQuestion(questionAtTime);
          setSelectedAnswer(studentAnswers[questionAtTime.id] || '');
          // Show the stored result if available
          const storedResult = answerResults[questionAtTime.id];
          if (storedResult) {
            setLastAnswerResult(storedResult);
          } else {
            // Fallback to question explanation if no stored result
            setLastAnswerResult({ is_correct: true, explanation: questionAtTime.explanation });
          }
        }
      }
    }
  }, [questions, answeredQuestions, currentQuestion, studentAnswers, userRole, answerResults]);

  // Ensure video stays paused when unanswered question is shown
  useEffect(() => {
    if (currentQuestion && videoRef.current) {
      const isAnswered = answeredQuestions.has(currentQuestion.id);
      
      // Only lock video if question is unanswered
      if (!isAnswered) {
        const video = videoRef.current;
        // Immediately pause if not already paused
        if (!video.paused) {
          video.pause();
        }

        // Set video time to question timestamp to prevent seeking
        if (currentQuestion.timestamp !== null) {
          video.currentTime = currentQuestion.timestamp;
        }

        // Continuously check and pause if needed (every 100ms)
        const pauseInterval = setInterval(() => {
          if (video && !video.paused) {
            video.pause();
          }
          // Keep video at question timestamp
          if (currentQuestion.timestamp !== null && Math.abs(video.currentTime - currentQuestion.timestamp) > 0.1) {
            video.currentTime = currentQuestion.timestamp;
          }
        }, 100);

        return () => {
          clearInterval(pauseInterval);
        };
      }
    }
  }, [currentQuestion, answeredQuestions]);

  // Use requestAnimationFrame for smooth, frequent checking
  useEffect(() => {
    if (!videoRef.current || userRole !== 'student' || questions.length === 0) return;
    
    let animationFrameId: number;
    const checkLoop = () => {
      if (!currentQuestion && !pauseRequestedRef.current && videoRef.current && !videoRef.current.paused) {
        checkForQuestion();
      }
      animationFrameId = requestAnimationFrame(checkLoop);
    };
    
    animationFrameId = requestAnimationFrame(checkLoop);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [checkForQuestion, questions, userRole, currentQuestion]);

  // Handle time update directly on video element
  const handleTimeUpdate = useCallback(() => {
    if (!currentQuestion && !pauseRequestedRef.current) {
      checkForQuestion();
    }
  }, [checkForQuestion, currentQuestion]);

  // Handle play event - prevent playing only if unanswered question is shown
  const handlePlay = useCallback(() => {
    if (userRole === 'student' && currentQuestion) {
      // Only block play if the question is unanswered
      if (!answeredQuestions.has(currentQuestion.id)) {
        if (videoRef.current) {
          videoRef.current.pause();
        }
        push({
          kind: 'error',
          message: 'Please answer the question before continuing',
        });
        return;
      }
      // If question is answered, allow play
    }
    
    // When play starts, check for questions immediately
    setTimeout(() => {
      checkForQuestion();
    }, 50);
  }, [userRole, currentQuestion, answeredQuestions, checkForQuestion, push]);

  // Prevent seeking past unanswered questions
  const handleSeeking = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (userRole !== 'student' || questions.length === 0 || showScore) return;

    const video = e.currentTarget;
    const seekTime = video.currentTime;

    // If there's an unanswered question displayed, prevent seeking past it
    if (currentQuestion && currentQuestion.timestamp !== null && !answeredQuestions.has(currentQuestion.id)) {
      // Force video back to question timestamp
      if (Math.abs(video.currentTime - currentQuestion.timestamp) > 0.1) {
        video.currentTime = currentQuestion.timestamp;
        video.pause();
      }
      return;
    }

    // Find first unanswered question before or at seek time
    const unansweredBeforeSeek = questions
      .filter((q) => q.timestamp !== null && !answeredQuestions.has(q.id))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .find((q) => q.timestamp !== null && q.timestamp <= seekTime);

    if (unansweredBeforeSeek && unansweredBeforeSeek.timestamp !== null) {
      // Prevent seeking past this question
      video.currentTime = unansweredBeforeSeek.timestamp;
      video.pause();
      // Show the question if we're at its timestamp
      if (Math.abs(seekTime - unansweredBeforeSeek.timestamp) < 0.5) {
        setCurrentQuestion(unansweredBeforeSeek);
        setSelectedAnswer(studentAnswers[unansweredBeforeSeek.id] || '');
        setLastAnswerResult(null);
      } else {
        // Only show toast if trying to seek past (not when question is already shown)
        const key = `seek-${unansweredBeforeSeek.id}`;
        const now = Date.now();
        if (!lastToastRef.current || lastToastRef.current.key !== key || now - lastToastRef.current.time > 3000) {
          lastToastRef.current = { key, time: now };
          push({
            kind: 'error',
            message: `Please answer the question at ${formatTime(unansweredBeforeSeek.timestamp)} before continuing`,
          });
        }
      }
    }
  }, [questions, answeredQuestions, userRole, showScore, push, studentAnswers, currentQuestion]);

  // Handle answer submission
  const handleSubmitAnswer = useCallback(async () => {
    if (!currentQuestion || isSubmitting) return;

    // Validate per question type
    if (currentQuestion.question_type === 'short_answer') {
      if (!selectedAnswer.trim()) return;
    } else {
      if (selectedAnswer === '') return;
    }

    // Normalize payload by question type to match backend expectations
    let answerPayload: any = selectedAnswer;
    if (currentQuestion.question_type === 'mcq') {
      // send numeric index
      const idx = Number(selectedAnswer);
      if (Number.isNaN(idx)) {
        push({ kind: 'error', message: 'Please select an option' });
        return;
      }
      answerPayload = idx;
    } else if (currentQuestion.question_type === 'true_false') {
      // send boolean
      answerPayload = selectedAnswer === 'true';
    }

    setIsSubmitting(true);
    try {
      const result = await submitVideoQuizAnswer(video.id, currentQuestion.id, answerPayload);

      // Update answered questions
      setAnsweredQuestions((prev) => new Set([...prev, currentQuestion.id]));
      setStudentAnswers((prev) => ({ ...prev, [currentQuestion.id]: selectedAnswer }));
      
      // Store the answer result
      const answerResult = {
        is_correct: result.is_correct,
        explanation: (result.explanation ?? currentQuestion.explanation) || null,
      };
      setAnswerResults((prev) => ({ ...prev, [currentQuestion.id]: answerResult }));
      
      // Show the result and explanation
      setLastAnswerResult(answerResult);

      // Update attempt
      if (result.attempt) {
        setAttempt(result.attempt);
      }

      // Show feedback
      if (result.is_correct) {
        push({ kind: 'success', message: 'Correct!' });
      } else {
        push({ kind: 'error', message: 'Incorrect. Please review the explanation.' });
      }

      // Do NOT auto-close. The modal will show feedback and explanation and the
      // student must press Continue to close and resume playback.
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      push({ kind: 'error', message: error?.message || 'Failed to submit answer' });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentQuestion, selectedAnswer, video.id, isSubmitting, push]);

  // Continue/close modal after submission and resume playback
  const handleContinueAfterSubmit = useCallback(() => {
    if (!lastAnswerResult) return; // only allow continue after submission

    lastQuestionIdRef.current = null;
    pauseRequestedRef.current = false;
    setCurrentQuestion(null);
    setLastAnswerResult(null);
    setSelectedAnswer('');
    if (videoRef.current) {
      videoRef.current.play().catch((err) => console.error('Error resuming video:', err));
    }
  }, [lastAnswerResult]);

  // Handle video end
  const handleVideoEnd = useCallback(async () => {
    if (userRole !== 'student' || showScore) return;

    // Check if all questions are answered
    const unansweredQuestions = questions.filter(
      (q) => q.timestamp !== null && !answeredQuestions.has(q.id)
    );

    if (unansweredQuestions.length > 0) {
      push({
        kind: 'error',
        message: 'Please answer all questions before completing the video',
      });
      return;
    }

    // Complete the attempt
    try {
      const result = await completeVideoQuizAttempt(video.id);
      setScore(result.score);
      setMaxScore(result.max_score);
      setShowScore(true);
      if (onComplete) {
        onComplete(result.score, result.max_score);
      }
      push({
        kind: 'success',
        message: `Quiz completed! Score: ${result.score}/${result.max_score} (${result.percentage}%)`,
      });
    } catch (error: any) {
      console.error('Error completing attempt:', error);
      push({ kind: 'error', message: 'Failed to complete quiz' });
    }
  }, [userRole, showScore, questions, answeredQuestions, video.id, onComplete, push]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <div className="video-player-loading">Loading video...</div>;
  }

  return (
    <div className="interactive-video-player">
      <div className="video-container">
        <video
          ref={videoRef}
          src={video.video_url}
          controls
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onEnded={handleVideoEnd}
          onPlay={handlePlay}
          onPlaying={() => checkForQuestion()}
          onLoadedData={() => checkForQuestion()}
          onCanPlay={() => checkForQuestion()}
          onPause={() => {
            // Reset pause request flag when video is paused
            pauseRequestedRef.current = false;
          }}
          className="video-player"
          style={{ width: '100%', maxWidth: '800px', height: 'auto', zIndex: 1 }}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Question Display Below Video */}
      {currentQuestion && userRole === 'student' && (
        <div className="question-display" style={{ scrollMarginTop: '20px' }}>
          <div className="question-header">
            <span className="timestamp-pill">
              {answeredQuestions.has(currentQuestion.id) ? '✓ Answered' : 'Question'} at {formatTime(currentQuestion.timestamp || 0)}
            </span>
          </div>
          <h3 className="question-text">{currentQuestion.question_text}</h3>

          {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
            <div className="question-options">
              {(() => {
                const options = typeof currentQuestion.options === 'string'
                  ? JSON.parse(currentQuestion.options)
                  : currentQuestion.options || [];

                return options.map((opt: string, i: number) => {
                  const optText = String(opt);
                  const optId = `${currentQuestion.id}_${i}_${encodeURIComponent(optText)}`;
                  const isSelected = selectedAnswer === String(i);
                  return (
                    <label 
                      key={optId} 
                      className="option-label"
                      onClick={() => {
                        if (!isSubmitting && !lastAnswerResult) {
                          setSelectedAnswer(String(i));
                        }
                      }}
                      style={{ cursor: (isSubmitting || lastAnswerResult) ? 'not-allowed' : 'pointer' }}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={String(i)}
                        checked={isSelected}
                        onChange={(e) => {
                          if (!isSubmitting && !lastAnswerResult) {
                            setSelectedAnswer(e.target.value);
                          }
                        }}
                        disabled={isSubmitting || !!lastAnswerResult}
                      />
                      <span>{optText}</span>
                    </label>
                  );
                });
              })()}
            </div>
          )}

          {currentQuestion.question_type === 'true_false' && (
            <div className="question-options">
              <label 
                className="option-label"
                onClick={() => {
                  if (!isSubmitting && !lastAnswerResult) {
                    setSelectedAnswer('true');
                  }
                }}
                style={{ cursor: (isSubmitting || lastAnswerResult) ? 'not-allowed' : 'pointer' }}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}-true-false`}
                  value="true"
                  checked={selectedAnswer === 'true'}
                  onChange={(e) => {
                    if (!isSubmitting && !lastAnswerResult) {
                      setSelectedAnswer(e.target.value);
                    }
                  }}
                  disabled={isSubmitting || !!lastAnswerResult}
                />
                <span>True</span>
              </label>
              <label 
                className="option-label"
                onClick={() => {
                  if (!isSubmitting && !lastAnswerResult) {
                    setSelectedAnswer('false');
                  }
                }}
                style={{ cursor: (isSubmitting || lastAnswerResult) ? 'not-allowed' : 'pointer' }}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}-true-false`}
                  value="false"
                  checked={selectedAnswer === 'false'}
                  onChange={(e) => {
                    if (!isSubmitting && !lastAnswerResult) {
                      setSelectedAnswer(e.target.value);
                    }
                  }}
                  disabled={isSubmitting || !!lastAnswerResult}
                />
                <span>False</span>
              </label>
            </div>
          )}

          {currentQuestion.question_type === 'short_answer' && (
            <input
              type="text"
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              placeholder="Enter your answer"
              disabled={isSubmitting || !!lastAnswerResult}
              className="short-answer-input"
            />
          )}

          {lastAnswerResult && (
            <div className={`answer-feedback ${lastAnswerResult.is_correct ? 'correct' : 'incorrect'}`}>
              <p>
                {lastAnswerResult.is_correct ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              {lastAnswerResult.explanation && (
                <p className="explanation">{lastAnswerResult.explanation}</p>
              )}
            </div>
          )}

          <div className="question-actions">
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={((currentQuestion?.question_type === 'short_answer') ? !selectedAnswer.trim() : selectedAnswer === '') || isSubmitting || !!lastAnswerResult}
              className="btn-primary"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </button>

            <button
              type="button"
              onClick={handleContinueAfterSubmit}
              disabled={!lastAnswerResult}
              className="btn-secondary"
            >
              {lastAnswerResult ? 'Continue' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Score Display */}
      {showScore && score !== null && maxScore !== null && (
        <div className="score-display">
          <h3>Quiz Completed!</h3>
          <div className="score-info">
            <p>
              <strong>Score:</strong> {score} / {maxScore}
            </p>
            <p>
              <strong>Percentage:</strong>{' '}
              {maxScore > 0 ? Math.round((score / maxScore) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Questions List (for reference) - Only show answered questions */}
      {questions.length > 0 && userRole === 'student' && (
        <div className="questions-list">
          <h4>Questions in this video:</h4>
          {questions.filter(q => answeredQuestions.has(q.id)).length > 0 ? (
            <ul>
              {questions
                .filter(q => answeredQuestions.has(q.id))
                .map((q, idx) => (
                  <li key={`${q.id}-${idx}`}>
                    <span className="question-item-text">
                      {q.timestamp !== null ? formatTime(q.timestamp) : 'No timestamp'} - {q.question_text}
                    </span>
                    <span className="answered-badge">✓ Answered</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="no-answered-questions">No questions answered yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

