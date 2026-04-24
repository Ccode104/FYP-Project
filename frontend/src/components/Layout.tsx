import type { ReactNode } from 'react';
import './Layout.css';
import './AppLayout.css';
import { useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import Chatbot from './Chatbot';
import TAAgentChat from './TAAgentChat';
import { useAuth, getDashboardPathForRole } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courseTitle, assignmentTitle } = useCourse();

  const isAuth = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/forgot');
  const isLanding = pathname === '/';
  const isLoginPage = pathname === '/login';
  const isLiveLecture = pathname.includes('/live-lectures/');
  const isVideoQuizEditor = pathname.includes('/videos/') && pathname.includes('/edit');
  const isPublicPage = isLanding || isAuth;
  const isFullscreenPage = isLiveLecture && user?.role === 'student'; // Remove video player from fullscreen
  const isStudentProgressExperience =
    user?.role === 'student' &&
    (pathname === '/progress' ||
      pathname.startsWith('/progress/leaderboard') ||
      pathname.startsWith('/progress/course/'));

  // Hide breadcrumb on video quiz editor
  const hideBreadcrumb = isVideoQuizEditor;

  // Get course ID from URL if on a course page
  const getCurrentCourseId = useCallback(() => {
    const match = pathname.match(/\/courses\/(\d+)/);
    return match ? match[1] : undefined;
  }, [pathname]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get('google_connected');
    const returnUrl = sessionStorage.getItem('google_oauth_return_url');

    if (googleConnected === 'true' && returnUrl) {
      sessionStorage.removeItem('google_oauth_return_url');
      window.location.replace(returnUrl);
    }
  }, []);

  if (isLanding) {
    return <>{children}</>;
  }

  // For auth pages, show common navbar
  if (isPublicPage) {
    return (
      <div className={`site-layout ${isLoginPage ? 'login-background' : ''}`}>
        <header className={`site-header public-header ${isLoginPage ? 'login-transparent' : ''}`}>
          <div className="site-header__inner">
            <div className="site-header__left">
              <button
                className="site-title-link"
                onClick={() => navigate('/')}
                aria-label="Go to home"
              >
                <h1 className="site-title">Unified Academic Portal</h1>
              </button>
            </div>
            <div className="site-header__right">
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

  if (isStudentProgressExperience) {
    return <>{children}</>;
  }

  // Unified App Shell for all authenticated pages
  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="app-shell__main">
        <AppHeader />

        {user && !hideBreadcrumb && (
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--shell-border)',
              background: 'var(--shell-surface)',
            }}
          >
            <nav className="breadcrumb-nav">
              <button
                className="breadcrumb-link"
                onClick={() => navigate(getDashboardPathForRole(user?.role || 'student'))}
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
          </div>
        )}

        <main className="app-content app-main">{children}</main>

        {/* Chatbots mapping */}
        <Chatbot
          courseId={getCurrentCourseId()}
          isOpen={false} // State controlled internally or via context (simplified here, since button moved)
          onClose={() => {}}
        />
        {user?.role === 'ta' && (
          <TAAgentChat
            courseId={getCurrentCourseId() ? parseInt(getCurrentCourseId()!) : undefined}
            onClose={() => {}}
          />
        )}
      </div>
    </div>
  );
}
