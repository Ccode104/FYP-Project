import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';

type NavItem = {
  id: string;
  label: string;
  icon: string;
  href: string;
};

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { courseTitle } = useCourse();

  // Determine if we are inside a specific course context
  const courseMatch = pathname.match(/\/courses\/(\d+)(?:\/(.*))?/);
  const currentCourseId = courseMatch ? courseMatch[1] : null;
  const inCourseContext = !!currentCourseId;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = (): NavItem[] => {
    // Role based items
    if (user?.role === 'student') {
      if (inCourseContext) {
        return [
          { id: 'dashboard', label: 'Back to Dashboard', icon: 'arrow_back', href: '/dashboard/student' },
          { id: 'hub', label: 'Course Hub', icon: 'school', href: `/courses/${currentCourseId}/hub` },
          { id: 'assignments', label: 'Assignments', icon: 'assignment', href: `/courses/${currentCourseId}/assignments` },
          { id: 'lectures', label: 'Live Lectures', icon: 'video_camera_front', href: `/courses/${currentCourseId}/live-lectures` },
          { id: 'discussion', label: 'Discussion', icon: 'forum', href: `/courses/${currentCourseId}/discussion` },
        ];
      }
      // Global student nav
      return [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard/student' },
        { id: 'planner', label: 'Planner', icon: 'calendar_month', href: '/planner' },
        { id: 'progress', label: 'Progress', icon: 'moving', href: '/progress' },
        { id: 'success-center', label: 'Success Center', icon: 'psychology', href: '/success-center' },
      ];
    } else if (user?.role === 'teacher' || user?.role === 'ta') {
      if (inCourseContext) {
        return [
          { id: 'dashboard', label: 'Back to Dashboard', icon: 'arrow_back', href: `/dashboard/${user.role}` },
          { id: 'hub', label: 'Course Hub', icon: 'school', href: `/courses/${currentCourseId}/hub` },
          { id: 'assignments', label: 'Assignments', icon: 'assignment', href: `/courses/${currentCourseId}/assignments` },
          { id: 'quizzes', label: 'Quizzes', icon: 'quiz', href: `/courses/${currentCourseId}/quizzes` },
          { id: 'lectures', label: 'Live Lectures', icon: 'video_camera_front', href: `/courses/${currentCourseId}/live-lectures` },
          { id: 'videos', label: 'Videos', icon: 'play_circle', href: `/courses/${currentCourseId}/videos` },
        ];
      }
      // Global teacher nav
      return [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: `/dashboard/${user.role}` },
        { id: 'planner', label: 'Planner', icon: 'calendar_month', href: `/planner/${user.role}` },
        { id: 'suspended-quizzes', label: 'Suspended Quizzes', icon: 'warning', href: '/teacher/suspended-quizzes' },
        { id: 'proctoring', label: 'Proctoring', icon: 'visibility', href: '/teacher/proctoring-dashboard' },
        { id: 'review-queue', label: 'Review Queue', icon: 'rate_review', href: '/staff/review-queue' },
      ];
    } else if (user?.role === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard/admin' },
        { id: 'planner', label: 'Planner', icon: 'calendar_month', href: '/planner/admin' },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href.endsWith('/dashboard/student') || href.endsWith('/dashboard/teacher') || href.endsWith('/dashboard/ta')) {
       return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__brand">
        <div className="app-sidebar__logo">
          <span className="material-symbols-outlined">school</span>
        </div>
        <div>
          <h1 className="app-sidebar__title">Unified Portal</h1>
          <p className="app-sidebar__subtitle">Academic Management</p>
        </div>
      </div>
      
      <nav className="app-sidebar__nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`app-sidebar__link${isActive(item.href) ? ' app-sidebar__link--active' : ''}`}
            onClick={() => navigate(item.href)}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="app-sidebar__footer">
        <button className="app-sidebar__link" onClick={() => navigate('/profile')}>
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </button>
        <button className="app-sidebar__link" onClick={handleLogout}>
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
