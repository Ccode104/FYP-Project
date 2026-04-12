import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LiveLectureRoom from '../../components/live-lecture/LiveLectureRoom';
import LiveLectureDashboard from '../teacher/LiveLectureDashboard';

const LiveLecturePage: React.FC = () => {
  const { courseId, lectureId } = useParams<{ courseId: string; lectureId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!courseId || !lectureId || !user) {
    return <div>Loading...</div>;
  }

  // Use the new dashboard for teacher/TA roles
  if (user.role === 'teacher' || user.role === 'ta') {
    return <LiveLectureDashboard />;
  }

  // Use the original room for students
  const handleClose = () => {
    navigate(`/courses/${courseId}`);
  };

  return (
    <LiveLectureRoom
      lectureId={parseInt(lectureId)}
      userId={parseInt(user.id)}
      userName={user.name}
      userRole={user.role}
      onClose={handleClose}
    />
  );
};

export default LiveLecturePage;
