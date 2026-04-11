import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import './DashboardHeader.css'

type DashboardHeaderProps = {
  searchValue: string
  onSearchChange: (value: string) => void
  notificationCount: number
  onNotificationsClick: () => void
  onQuickActionsClick: () => void
}

export default function DashboardHeader({
  searchValue,
  onSearchChange,
  notificationCount,
  onNotificationsClick,
  onQuickActionsClick,
}: DashboardHeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileMenu])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="student-shell-header">
      <div className="student-shell-header__inner">
        <div className="student-shell-header__left">
          <button
            className="student-shell-logo"
            onClick={() => navigate('/dashboard/student')}
            title="Dashboard"
          >
            <span className="student-shell-logo__mark" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" />
                <path d="M7 10.5V15c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5" />
              </svg>
            </span>
            <span className="student-shell-logo__text">EduDash</span>
          </button>

          <div className="student-shell-search">
            <span className="student-shell-search__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="text"
              className="student-shell-search__input"
              placeholder="Search courses, assignments"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-label="Search courses and assignments"
            />
          </div>
        </div>

        <div className="student-shell-header__right">
          <button className="student-shell-icon-btn" title="Notifications" onClick={onNotificationsClick}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V10a5 5 0 1 1 10 0v4.2a2 2 0 0 0 .6 1.4L19 17h-4" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            {notificationCount > 0 && <span className="student-shell-icon-btn__badge">{notificationCount}</span>}
          </button>

          <button className="student-shell-icon-btn" title="Quick actions" onClick={onQuickActionsClick}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
            </svg>
          </button>

          <div className="student-shell-profile" ref={profileRef}>
            <button
              className="student-shell-profile__trigger"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title="User Profile"
            >
              <span className="student-shell-profile__avatar">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </span>
              <div className="student-shell-profile__meta">
                <div className="student-shell-profile__name">{user?.name || 'User'}</div>
                <div className="student-shell-profile__role">
                  {user?.role === 'student' ? 'Student Portal' : user?.role || 'User'}
                </div>
              </div>
            </button>

            {showProfileMenu && (
              <div className="student-shell-profile__menu">
                <button className="student-shell-profile__menu-item" onClick={() => navigate('/profile')}>
                  My Profile
                </button>
                <button className="student-shell-profile__menu-item" onClick={() => navigate('/progress')}>
                  My Grades
                </button>
                <hr className="student-shell-profile__divider" />
                <button className="student-shell-profile__menu-item student-shell-profile__menu-item--danger" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
