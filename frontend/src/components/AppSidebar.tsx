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

  // Determine if we are on a video player page
  const videoMatch = pathname.match(/\/videos\/(\d+)/);
  const inVideoPlayerContext = !!videoMatch;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = (): NavItem[] => {
    // Role based items
    if (user?.role === 'student') {
      if (inVideoPlayerContext) {
        return [
          {
            id: 'dashboard',
            label: 'Back to Dashboard',
            icon: 'arrow_back',
            href: '/dashboard/student',
          },
          {
            id: 'video-library',
            label: 'Video Library',
            icon: 'video_library',
            href: '/dashboard/student',
          },
          {
            id: 'assignments',
            label: 'Assignments',
            icon: 'assignment',
            href: '/dashboard/student',
          },
          { id: 'progress', label: 'Progress', icon: 'moving', href: '/progress' },
          {
            id: 'success-center',
            label: 'Success Center',
            icon: 'psychology',
            href: '/success-center',
          },
        ];
      }
      if (inCourseContext) {
        return [
          {
            id: 'dashboard',
            label: 'Back to Dashboard',
            icon: 'arrow_back',
            href: '/dashboard/student',
          },
          {
            id: 'hub',
            label: 'Course Hub',
            icon: 'school',
            href: `/courses/${currentCourseId}/hub`,
          },
          {
            id: 'assignments',
            label: 'Assignments',
            icon: 'assignment',
            href: `/courses/${currentCourseId}/assignments`,
          },
          {
            id: 'quizzes',
            label: 'Quizzes',
            icon: 'quiz',
            href: `/courses/${currentCourseId}/quiz-management`,
          },
          {
            id: 'discussion',
            label: 'Discussion',
            icon: 'forum',
            href: `/courses/${currentCourseId}/discussion`,
          },
          {
            id: 'videos',
            label: 'Videos',
            icon: 'movie',
            href: `/courses/${currentCourseId}/library`,
          },
          {
            id: 'lectures',
            label: 'Live Lectures',
            icon: 'live_tv',
            href: `/courses/${currentCourseId}/live-lectures`,
          },
          {
            id: 'progress',
            label: 'Progress',
            icon: 'analytics',
            href: `/progress/course/${currentCourseId}`,
          },
        ];
      }
      // Global student nav
      return [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard/student' },
        { id: 'planner', label: 'Planner', icon: 'calendar_month', href: '/planner' },
        { id: 'progress', label: 'Progress', icon: 'moving', href: '/progress' },
        {
          id: 'success-center',
          label: 'Success Center',
          icon: 'psychology',
          href: '/success-center',
        },
      ];
    } else if (user?.role === 'teacher') {
      if (inVideoPlayerContext) {
        return [
          {
            id: 'dashboard',
            label: 'Back to Dashboard',
            icon: 'arrow_back',
            href: '/dashboard/teacher',
          },
          {
            id: 'video-library',
            label: 'Video Library',
            icon: 'video_library',
            href: '/dashboard/teacher',
          },
          {
            id: 'assignments',
            label: 'Assignments',
            icon: 'assignment',
            href: '/dashboard/teacher',
          },
          { id: 'quizzes', label: 'Quizzes', icon: 'quiz', href: '/dashboard/teacher' },
          {
            id: 'lectures',
            label: 'Live Lectures',
            icon: 'video_camera_front',
            href: '/dashboard/teacher',
          },
        ];
      }
      if (inCourseContext) {
        return [
          {
            id: 'dashboard',
            label: 'Back to Dashboard',
            icon: 'arrow_back',
            href: '/dashboard/teacher',
          },
          {
            id: 'hub',
            label: 'Course Hub',
            icon: 'school',
            href: `/courses/${currentCourseId}/hub`,
          },
          {
            id: 'assignments',
            label: 'Assignments',
            icon: 'assignment',
            href: `/courses/${currentCourseId}/assignments`,
          },
          {
            id: 'quizzes',
            label: 'Quizzes',
            icon: 'quiz',
            href: `/courses/${currentCourseId}/quiz-management`,
          },
          {
            id: 'discussion',
            label: 'Discussion',
            icon: 'forum',
            href: `/courses/${currentCourseId}/discussion`,
          },
          {
            id: 'videos',
            label: 'Videos',
            icon: 'movie',
            href: `/courses/${currentCourseId}/videos`,
          },
          {
            id: 'lectures',
            label: 'Live Lectures',
            icon: 'live_tv',
            href: `/courses/${currentCourseId}/live-lectures`,
          },
          {
            id: 'progress',
            label: 'Progress',
            icon: 'analytics',
            href: `/progress/course/${currentCourseId}`,
          },
        ];
      }
      // Global teacher nav
      return [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard/teacher' },
        { id: 'planner', label: 'Planner', icon: 'calendar_month', href: '/planner/teacher' },
        {
          id: 'review-queue',
          label: 'Review Queue',
          icon: 'rate_review',
          href: '/staff/review-queue',
        },
      ];
    } else if (user?.role === 'ta') {
      if (inCourseContext) {
        return [
          {
            id: 'dashboard',
            label: 'Back to Dashboard',
            icon: 'arrow_back',
            href: '/dashboard/ta',
          },
          {
            id: 'hub',
            label: 'Course Hub',
            icon: 'school',
            href: `/courses/${currentCourseId}/hub`,
          },
          {
            id: 'assignments',
            label: 'Assignments',
            icon: 'assignment',
            href: `/courses/${currentCourseId}/assignments`,
          },
          {
            id: 'quizzes',
            label: 'Quizzes',
            icon: 'quiz',
            href: `/courses/${currentCourseId}/quiz-management`,
          },
          {
            id: 'discussion',
            label: 'Discussion',
            icon: 'forum',
            href: `/courses/${currentCourseId}/discussion`,
          },
          {
            id: 'videos',
            label: 'Videos',
            icon: 'movie',
            href: `/courses/${currentCourseId}/videos`,
          },
          {
            id: 'lectures',
            label: 'Live Lectures',
            icon: 'live_tv',
            href: `/courses/${currentCourseId}/live-lectures`,
          },
          {
            id: 'progress',
            label: 'Progress',
            icon: 'analytics',
            href: `/progress/course/${currentCourseId}`,
          },
        ];
      }
      // TAs have a very simple flow: Dashboard (Tasks) only
      return [{ id: 'dashboard', label: 'My Tasks', icon: 'task_alt', href: '/dashboard/ta' }];
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
    if (
      href.endsWith('/dashboard/student') ||
      href.endsWith('/dashboard/teacher') ||
      href.endsWith('/dashboard/ta')
    ) {
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
        <div className="app-sidebar__ai-card">
          <span className="material-symbols-outlined">auto_awesome</span>
          <div className="app-sidebar__ai-card-text">
            <span className="app-sidebar__ai-card-title">AI Tools</span>
            <span className="app-sidebar__ai-card-hint">Select text to cite</span>
          </div>
        </div>
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
