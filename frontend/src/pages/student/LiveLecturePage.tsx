import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LiveLectureRoom from '../../components/live-lecture/LiveLectureRoom';

const LiveLecturePage: React.FC = () => {
  const { courseId, lectureId } = useParams<{ courseId: string; lectureId: string }>();
  const { user: _user } = useAuth();
  const navigate = useNavigate();

  if (!courseId || !lectureId || !user) {
    return <div>Loading...</div>;
  }

  const handleClose = () => {
    // Navigate back to the course page
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
