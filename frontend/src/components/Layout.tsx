import type { ReactNode } from 'react'
import './Layout.css'
import { useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { useAuth, getDashboardPathForRole } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAuth = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/forgot')
  const isLanding = pathname === '/'
  const isPublicPage = isLanding || isAuth

  // For landing and auth pages, show common navbar
  if (isPublicPage) {
    return (
      <div className="site-layout">
        <header className="site-header public-header">
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
                    Courses
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
                  <ThemeToggle />
                </>
              ) : (
                <>
                  <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-role">{user.role.toUpperCase()}</span>
                  </div>
                  <ThemeToggle />
                  <button className="btn btn-ghost logout-btn" onClick={logout}>
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className={`site-main ${isLanding ? 'landing-main' : 'auth-main'}`}>
          {children}
        </main>

        <footer className="site-footer">
          <p className="site-footer__text">
            © 2025 Unified Academic Portal — Created by Shoyam Rai, Manas Jungade, Abhishek Chandurkar, and Tanmay Sharnagat
          </p>
        </footer>
      </div>
    )
  }

  // For authenticated users on dashboard pages
  return (
    <div className="site-layout">
      <header className="site-header">
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
                  onClick={() => navigate('/')}
                  aria-label="Home"
                >
                  Home
                </button>
                <button 
                  className="nav-link" 
                  onClick={() => navigate(getDashboardPathForRole(user.role))}
                  aria-label="Courses"
                >
                  Courses
                </button>
              </nav>
            )}
          </div>
          <div className="site-header__right">
            {user && (
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role">{user.role.toUpperCase()}</span>
              </div>
            )}
            <ThemeToggle />
            {user && (
              <button className="btn btn-ghost logout-btn" onClick={logout}>
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="site-main">
        {children}
      </main>

      <footer className="site-footer">
        <p className="site-footer__text">
          © 2025 Unified Academic Portal — Created by Shoyam Rai, Manas Jungade, Abhishek Chandurkar, and Tanmay Sharnagat
        </p>
      </footer>
    </div>
  )
}
