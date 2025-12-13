import { useAuth } from '../context/AuthContext';
import StudentProfile from './student/StudentProfile';
import FacultyProfile from './teacher/FacultyProfile';
import TAProfile from './teacher/TAProfile';
import AdminProfile from './admin/AdminProfile';

export default function Profile() {
  const { user: _user } = useAuth();

  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  switch (user.role) {
    case 'student':
      return <StudentProfile />;
    case 'teacher':
      return <FacultyProfile />;
    case 'ta':
      return <TAProfile />;
    case 'admin':
      return <AdminProfile />;
    default:
      return <div>Unknown user role.</div>;
  }
}
