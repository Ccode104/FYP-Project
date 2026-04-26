import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuizBuilder from '../../components/QuizBuilder';
import { apiFetch } from '../../services/api';
import './QuizBuilder.css';

interface CourseInfo {
  id: number;
  course_code: string;
  course_title: string;
}

export default function QuizBuilderPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId?: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialQuiz, setInitialQuiz] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!courseId) return;

      setLoading(true);

      try {
        const courseData = await apiFetch<CourseInfo>(`/api/student/courses/${courseId}`);
        setCourse(courseData);

        if (quizId) {
          const quizData = await apiFetch<any>(`/api/quiz-builder/quizzes/${quizId}`);
          setInitialQuiz({
            title: quizData.title,
            description: quizData.description || '',
            questions: (quizData.questions || []).map((q: any) => ({
              id: `q-${q.id}`,
              question: q.question,
              type: q.type,
              options: q.metadata?.options || [],
              correct_answers: q.metadata?.correct_answers || [],
              points: q.metadata?.points || 1,
            })),
          });
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, quizId]);

  const handleSave = (quiz: any) => {
    console.log('Quiz saved:', quiz);
  };

  const handleExportGoogleForm = (formUrl: string) => {
    console.log('Exported to Google Form:', formUrl);
    window.open(formUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="quiz-builder-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading quiz builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-builder-page">
      <div className="quiz-builder-page-header">
        <button className="back-button" onClick={() => navigate(`/courses/${courseId}/quiz-management`)}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Quizzes
        </button>
        {course && (
          <div className="course-info">
            <span className="course-code">{course.course_code}</span>
            <span className="course-title">{course.course_title}</span>
          </div>
        )}
      </div>

      <QuizBuilder
        courseOfferingId={Number(courseId)}
        quizId={quizId ? Number(quizId) : undefined}
        initialQuiz={initialQuiz}
        onSave={handleSave}
        onExportGoogleForm={handleExportGoogleForm}
      />
    </div>
  );
}
