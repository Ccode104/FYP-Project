import type { ReactNode } from 'react'
import './Layout.css'
import { useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { useAuth, getDashboardPathForRole } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useCourse } from '../context/CourseContext'

export default function Layout({ children }: { children: ReactNode }) {
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { courseTitle } = useCourse()
  const isAuth = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/forgot')
  const isLanding = pathname === '/'
  const isPublicPage = isLanding || isAuth

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserDropdown])

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
                    <span className="breadcrumb-current">{courseTitle}</span>
                  </>
                )}
              </nav>
            )}
          </div>
          <div className="site-header__right">
            <ThemeToggle />
            {user && (
              <div className="user-dropdown-container" ref={dropdownRef}>
                <button 
                  className="user-dropdown-trigger"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  aria-label="User menu"
                >
                  <span className="user-name">{user.name}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {showUserDropdown && (
                  <div className="user-dropdown-menu">
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserDropdown(false)
                        // Profile action - do nothing for now
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      Profile
                    </button>
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserDropdown(false)
                        logout()
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
