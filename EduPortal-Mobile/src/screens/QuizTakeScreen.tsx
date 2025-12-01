import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, TextInput } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../services/api';

type QuizTakeScreenRouteProp = RouteProp<RootStackParamList, 'QuizTake'>;

interface Quiz {
  id: number;
  title: string;
  questions: Array<{
    id: number;
    question_text: string;
    question_type: 'mcq' | 'short' | 'true_false';
    metadata: {
      choices?: string[];
      correct_answer?: string | number;
    };
  }>;
  max_score: number;
  time_limit?: number;
  is_proctored?: boolean;
  course_code?: string;
  course_title?: string;
  start_at?: string;
  end_at?: string;
}

interface QuizResult {
  score: number | null;
  needs_manual_grading: boolean;
  graded_answers: Record<number, {
    student_answer: any;
    is_correct: boolean | null;
    correct_answer: any;
  }>;
}

export default function QuizTakeScreen() {
  const route = useRoute<QuizTakeScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { quizId } = route.params;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const quizData = await apiFetch(`/quizzes/${quizId}`);
      setQuiz(quizData as Quiz);
    } catch (error) {
      console.error('Failed to load quiz:', error);
      Alert.alert('Error', 'Failed to load quiz');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const canSubmit = () => {
    if (!quiz) return false;
    return quiz.questions.every(q => {
      const answer = answers[q.id];
      if (q.question_type === 'short') {
        return typeof answer === 'string' && answer.trim().length > 0;
      }
      return answer !== undefined && answer !== null && answer !== '';
    });
  };

  const handleSubmit = async () => {
    if (!quiz || !canSubmit() || submitting) return;

    setSubmitting(true);
    try {
      const response = await apiFetch('/quiz-attempts/submit', {
        method: 'POST',
        body: {
          quiz_id: quiz.id,
          answers
        }
      });

      const resultData = response as QuizResult;
      setResult(resultData);

      Alert.alert(
        'Quiz Submitted',
        `Your quiz has been submitted successfully!${resultData.score !== null ? ` Score: ${Math.round(resultData.score)}` : ''}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      Alert.alert('Error', 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: Quiz['questions'][0], index: number) => {
    const currentAnswer = answers[question.id];
    const gradedAnswer = result?.graded_answers[question.id];

    return (
      <View key={question.id} style={[styles.questionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.questionText, { color: theme.text }]}>
          Q{index + 1}. {question.question_text}
        </Text>

        {question.question_type === 'mcq' && question.metadata.choices && (
          <View style={styles.optionsContainer}>
            {question.metadata.choices.map((choice, choiceIndex) => {
              const isSelected = currentAnswer === choiceIndex;
              const isCorrect = gradedAnswer?.correct_answer === choiceIndex;
              const isWrongSelection = gradedAnswer && !gradedAnswer.is_correct && isSelected;

              return (
                <TouchableOpacity
                  key={choiceIndex}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: isSelected ? theme.primary :
                                     result && isCorrect ? '#d4edda' :
                                     result && isWrongSelection ? '#f8d7da' : theme.surface,
                      borderColor: isSelected ? theme.primary :
                                result && isCorrect ? '#28a745' :
                                result && isWrongSelection ? '#dc3545' : theme.border
                    }
                  ]}
                  onPress={() => !result && handleAnswerChange(question.id, choiceIndex)}
                  disabled={!!result}
                >
                  <Text style={[
                    styles.optionText,
                    {
                      color: isSelected ? theme.bg :
                           result && isCorrect ? '#155724' :
                           result && isWrongSelection ? '#721c24' : theme.text
                    }
                  ]}>
                    {choice}
                    {result && isCorrect && ' ✓'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {question.question_type === 'true_false' && (
          <View style={styles.optionsContainer}>
            {['True', 'False'].map((option, optionIndex) => {
              const isSelected = currentAnswer === optionIndex;
              const isCorrect = gradedAnswer?.correct_answer === optionIndex;
              const isWrongSelection = gradedAnswer && !gradedAnswer.is_correct && isSelected;

              return (
                <TouchableOpacity
                  key={optionIndex}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: isSelected ? theme.primary :
                                     result && isCorrect ? '#d4edda' :
                                     result && isWrongSelection ? '#f8d7da' : theme.surface,
                      borderColor: isSelected ? theme.primary :
                                result && isCorrect ? '#28a745' :
                                result && isWrongSelection ? '#dc3545' : theme.border
                    }
                  ]}
                  onPress={() => !result && handleAnswerChange(question.id, optionIndex)}
                  disabled={!!result}
                >
                  <Text style={[
                    styles.optionText,
                    {
                      color: isSelected ? theme.bg :
                           result && isCorrect ? '#155724' :
                           result && isWrongSelection ? '#721c24' : theme.text
                    }
                  ]}>
                    {option}
                    {result && isCorrect && ' ✓'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {question.question_type === 'short' && (
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text
              }
            ]}
            value={currentAnswer || ''}
            onChangeText={(text) => handleAnswerChange(question.id, text)}
            placeholder="Enter your answer..."
            placeholderTextColor={theme['text-secondary']}
            multiline
            numberOfLines={3}
            editable={!result}
          />
        )}

        {result && gradedAnswer && gradedAnswer.is_correct === null && (
          <Text style={[styles.pendingText, { color: theme['text-secondary'] }]}>
            Pending manual grading
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={[styles.loadingText, { color: theme['text-secondary'] }]}>Loading quiz...</Text>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Quiz not found</Text>
      </View>
    );
  }

  // Show desktop-only message for proctored quizzes
  if (quiz.is_proctored) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.proctoredCard, { backgroundColor: theme.surface, borderColor: theme.error }]}>
          <Text style={[styles.proctoredIcon, { color: theme.error }]}>🔒</Text>
          <Text style={[styles.proctoredTitle, { color: theme.text }]}>Proctored Quiz</Text>
          <Text style={[styles.proctoredText, { color: theme['text-secondary'] }]}>
            This quiz uses advanced proctoring technology and can only be taken on the desktop website for security reasons.
          </Text>
          <Text style={[styles.proctoredText, { color: theme['text-secondary'] }]}>
            Please access this quiz through your desktop browser to continue.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: theme.bg }]}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{quiz.title}</Text>
        <Text style={[styles.subtitle, { color: theme['text-secondary'] }]}>
          {quiz.course_code} — {quiz.course_title}
        </Text>
        <Text style={[styles.scoreText, { color: theme['text-secondary'] }]}>
          Max Score: {quiz.max_score}
        </Text>
        {quiz.time_limit && (
          <Text style={[styles.timeText, { color: theme['text-secondary'] }]}>
            Time Limit: {quiz.time_limit} minutes
          </Text>
        )}
      </View>

      {quiz.questions.map((question, index) => renderQuestion(question, index))}

      {!result && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: canSubmit() && !submitting ? theme.primary : theme['text-secondary']
            }
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit() || submitting}
        >
          <Text style={[styles.submitButtonText, { color: theme.bg }]}>
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Text>
        </TouchableOpacity>
      )}

      {result && (
        <View style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.resultTitle, { color: theme.text }]}>Quiz Submitted</Text>
          <Text style={[styles.resultScore, { color: theme.primary }]}>
            Score: {result.score !== null ? Math.round(result.score) : 'Pending'}
          </Text>
          {result.needs_manual_grading && (
            <Text style={[styles.resultNote, { color: theme['text-secondary'] }]}>
              Some questions require manual grading
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 40,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 40,
  },
  proctoredCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 24,
  },
  proctoredIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  proctoredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  proctoredText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 14,
  },
  timeText: {
    fontSize: 14,
  },
  questionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pendingText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  submitButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultScore: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultNote: {
    fontSize: 14,
    textAlign: 'center',
  },
});