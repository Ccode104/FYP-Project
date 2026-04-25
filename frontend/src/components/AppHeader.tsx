import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="app-header__search">
        <span className="material-symbols-outlined">search</span>
        <input
          type="text"
          placeholder="Search courses, assignments..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
        />
      </div>
       <div className="app-header__actions">
         <div className="app-header__divider"></div>
        <div className="app-header__user-dropdown" ref={dropdownRef}>
          <div 
            className="app-header__user" 
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <span className="app-header__name">{user?.name || 'User'}</span>
            <div className="app-header__avatar">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
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
                  handleLogout();
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
      </div>
    </header>
  );
}
