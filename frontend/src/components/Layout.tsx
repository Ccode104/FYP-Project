import type { ReactNode } from 'react';
import './Layout.css';
import { useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import Chatbot from './Chatbot';
import TAAgentChat from './TAAgentChat';
import { useAuth, getDashboardPathForRole } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useCourse } from '../context/CourseContext';

export default function Layout({ children }: { children: ReactNode }) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showTAChat, setShowTAChat] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { courseTitle, assignmentTitle } = useCourse();
  const isAuth = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/forgot');
  const isLanding = pathname === '/';
  const isLoginPage = pathname === '/login';
  const isLiveLecture = pathname.includes('/live-lectures/');
  const isVideoPlayer = pathname.includes('/videos/');
  const isStudentDashboard = pathname === '/dashboard/student';
  const isTeacherDashboard =
    pathname === '/dashboard/teacher' ||
    pathname === '/dashboard/ta' ||
    pathname === '/dashboard/admin';
  const isTeacherPage = user?.role === 'teacher' || user?.role === 'ta' || user?.role === 'admin';
  const isCourseHub = pathname.match(/\/courses\/\d+\/hub$/) !== null;
  const isCourseDetails = pathname.match(/\/courses\/\d+\/[^h]/) !== null;
  const isCourseLiveLecture = isLiveLecture && (user?.role === 'teacher' || user?.role === 'ta');
  const isPublicPage = isLanding || isAuth;
  const isFullscreenPage = isVideoPlayer || (isLiveLecture && user?.role === 'student');

  // Get course ID from URL if on a course page
  const getCurrentCourseId = useCallback(() => {
    const match = pathname.match(/\/courses\/(\d+)/);
    return match ? match[1] : undefined;
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserDropdown]);

  // Hide header on scroll down
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHeaderVisible(false);
      } else {
        setHeaderVisible(true);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLanding) {
    return <>{children}</>;
  }

  // For auth pages, show common navbar
  if (isPublicPage) {
    return (
      <div className={`site-layout ${isLoginPage ? 'login-background' : ''}`}>
        <header
          className={`site-header public-header ${headerVisible ? '' : 'header-hidden'} ${isLoginPage ? 'login-transparent' : ''}`}
        >
          <div className="site-header__inner">
            <div className="site-header__left">
              <button
                className="site-title-link"
                onClick={() => navigate('/')}
                aria-label="Go to home"
              >
                <h1 className="site-title">Unified Academic Portal</h1>
              </button>
              {user && (
                <nav className="site-nav">
                  <button
                    className="nav-link"
                    onClick={() => navigate(getDashboardPathForRole(user.role))}
                    aria-label="Courses"
                  >
                    Dashboard
                  </button>
                </nav>
              )}
            </div>
            <div className="site-header__right">
              {!user ? (
                <>
                  <nav className="site-nav">
                    <button
                      className={`nav-link ${pathname === '/login' ? 'active' : ''}`}
                      onClick={() => navigate('/login')}
                      aria-label="Login"
                    >
                      Login
                    </button>
                    <button
                      className={`btn btn-primary nav-signup ${pathname === '/signup' ? 'active' : ''}`}
                      onClick={() => navigate('/signup')}
                      aria-label="Sign Up"
                    >
                      Sign Up
                    </button>
                  </nav>
                  {!isLoginPage && <ThemeToggle />}
                </>
              ) : (
                <>
                  <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-role">{user.role.toUpperCase()}</span>
                  </div>
                  {!isLoginPage && <ThemeToggle />}
                  <button className="btn btn-ghost logout-btn" onClick={logout}>
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="site-main auth-main">{children}</main>

        <footer className={`site-footer ${isLoginPage ? 'login-transparent' : ''}`}>
          <p className="site-footer__text">
            © 2025 Unified Academic Portal — Created by Shoyam Rai, Manas Jungade, Abhishek
            Chandurkar, and Tanmay Sharnagat
          </p>
        </footer>
      </div>
    );
  }

  // For fullscreen pages (like live lectures), hide header and footer
  if (isFullscreenPage) {
    return (
      <div className="site-layout fullscreen-layout">
        <main className="site-main fullscreen-main">{children}</main>
      </div>
    );
  }

  if (isStudentDashboard) {
    return (
      <div className="site-layout">
        <main className="site-main">{children}</main>
      </div>
    );
  }

  // Dashboard shell for teacher/TA/admin with sidebar (teacher dashboard, TA dashboard, course hub, course details, or live lecture)
  if (
    isTeacherPage &&
    (isTeacherDashboard || isCourseHub || isCourseDetails || isCourseLiveLecture)
  ) {
    return (
      <div className="dashboard-shell">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="dashboard-sidebar__brand">
            <div className="dashboard-sidebar__logo">A</div>
            <div className="dashboard-sidebar__brand-text">
              <span className="dashboard-sidebar__title">The Atelier</span>
              <span className="dashboard-sidebar__subtitle">Academic Excellence</span>
            </div>
          </div>

          <nav className="dashboard-sidebar__nav">
            <button
              className={`dashboard-sidebar__link ${pathname === '/dashboard/teacher' || pathname === '/dashboard/ta' ? 'active' : ''}`}
              onClick={() => navigate('/dashboard/teacher')}
            >
              <span className="material-symbols-outlined">dashboard</span>
              Dashboard
            </button>
            <button className="dashboard-sidebar__link" onClick={() => navigate('/courses')}>
              <span className="material-symbols-outlined">school</span>
              Courses
            </button>
            <button className="dashboard-sidebar__link">
              <span className="material-symbols-outlined">calendar_month</span>
              Schedule
            </button>
            <button className="dashboard-sidebar__link">
              <span className="material-symbols-outlined">settings</span>
              Settings
            </button>
          </nav>

          <div className="dashboard-sidebar__bottom">
            <button className="dashboard-sidebar__new-btn">
              <span className="material-symbols-outlined">add</span>
              New Research
            </button>
            <button className="dashboard-sidebar__footer-link">
              <span className="material-symbols-outlined">help</span>
              Help
            </button>
            <button className="dashboard-sidebar__footer-link" onClick={() => logout()}>
              <span className="material-symbols-outlined">logout</span>
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* Top Header */}
          <header className="dashboard-top-header">
            <div className="dashboard-top-header__search">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search academic records..." type="text" />
            </div>
            <div className="dashboard-top-header__right">
              <div className="dashboard-top-header__icons">
                <button className="dashboard-top-header__icon-btn">
                  <span className="material-symbols-outlined">dark_mode</span>
                </button>
                <button className="dashboard-top-header__icon-btn">
                  <span className="material-symbols-outlined">notifications</span>
                  <span className="dashboard-top-header__notification-dot"></span>
                </button>
              </div>
              <div className="dashboard-top-header__divider"></div>
              <div className="dashboard-top-header__user">
                <div className="dashboard-top-header__user-info">
                  <span className="dashboard-top-header__user-name">{user?.name || 'User'}</span>
                  <span className="dashboard-top-header__user-role">
                    {user?.role === 'ta' ? 'TA' : user?.role}
                  </span>
                </div>
                <img
                  alt="User Profile"
                  className="dashboard-top-header__avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBD0bCyT2xxmcGICPblH8X0k_lPWAQxtKPNrsYo5fB8s20ZmZTHihlGARnXGM1lG8o66s1ndR55dFCR3yLB3497BRwNRHtCM9MnYJJNYK7nENevqr4kV4NH7Dp42W4xXHTUF4BFiH1CT1NeyUgizp5OIH9zdXrExJKggVaKjZ45hES3tWLGzi1ky1wY8_fHr0vGAOI0Jr3wui6olRUU-o0j9TErMUTDSz3FNh3dkgWebavrcsJ79OpKE65I38x-4En7UqHsNtozYSU"
                />
              </div>
            </div>
          </header>

          {/* Content Canvas */}
          <div className="dashboard-content">{children}</div>
        </main>
      </div>
    );
  }

  // For authenticated users on dashboard pages
  return (
    <div className="site-layout">
      <header className={`site-header ${headerVisible ? '' : 'header-hidden'}`}>
        <div className="site-header__inner">
          <div className="site-header__left">
            <button
              className="site-title-link"
              onClick={() => navigate('/')}
              aria-label="Go to home"
            >
              <h1 className="site-title">Unified Academic Portal</h1>
            </button>
            {user && (
              <nav className="breadcrumb-nav">
                <button
                  className="breadcrumb-link"
                  onClick={() => navigate(getDashboardPathForRole(user.role))}
                  aria-label="Dashboard"
                >
                  Dashboard
                </button>
                {courseTitle && (
                  <>
                    <span className="breadcrumb-separator">›</span>
                    <button
                      className="breadcrumb-link"
                      onClick={() => {
                        const courseId = window.location.pathname.split('/')[2];
                        if (courseId) navigate(`/courses/${courseId}`);
                      }}
                      aria-label="Course"
                    >
                      {courseTitle}
                    </button>
                  </>
                )}
                {assignmentTitle && (
                  <>
                    <span className="breadcrumb-separator">›</span>
                    <span className="breadcrumb-current">{assignmentTitle}</span>
                  </>
                )}
              </nav>
            )}
          </div>
          <div className="site-header__right">
            <ThemeToggle />
            {user && (
              <>
                {(user.role === 'student' || user.role === 'ta') && (
                  <button
                    className="chatbot-toggle-btn"
                    onClick={() => {
                      if (user.role === 'student') {
                        setShowChatbot(true);
                      } else if (user.role === 'ta') {
                        setShowTAChat(true);
                      }
                    }}
                    title={`Open ${user.role === 'student' ? 'AI Assistant' : 'TA Evaluation Assistant'}`}
                    style={{
                      padding: '8px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      marginRight: '12px',
                    }}
                  >
                    🤖
                  </button>
                )}
                <div className="user-dropdown-container" ref={dropdownRef}>
                  <button
                    className="user-dropdown-trigger"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    aria-label="User menu"
                  >
                    <span className="user-name">{user.name}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showUserDropdown && (
                    <div className="user-dropdown-menu">
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setShowUserDropdown(false);
                          navigate('/profile');
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Profile
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setShowUserDropdown(false);
                          logout();
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="site-main">{children}</main>

      {/* Chatbot Components */}
      <Chatbot
        courseId={getCurrentCourseId()}
        isOpen={showChatbot}
        onClose={() => setShowChatbot(false)}
      />
      {showTAChat && (
        <TAAgentChat
          courseId={getCurrentCourseId() ? parseInt(getCurrentCourseId()!) : undefined}
          onClose={() => setShowTAChat(false)}
        />
      )}

      <footer className="site-footer">
        <p className="site-footer__text">
          © 2025 Unified Academic Portal — Created by Shoyam Rai, Manas Jungade, Abhishek
          Chandurkar, and Tanmay Sharnagat
        </p>
      </footer>
    </div>
  );
}
