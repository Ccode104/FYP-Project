import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderAIAssistant from './HeaderAIAssistant';
import { fetchAiLimits } from '../features/discussion/api/discussion';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLimits, setAiLimits] = useState<{ remaining: number, used: number, limit: number, percentage: string, usage: number, usageLimit: number } | null>(null);
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

  useEffect(() => {
    const loadLimits = async () => {
      try {
        const data = await fetchAiLimits();
        if (data.available) {
          setAiLimits(data);
        }
      } catch (err) {
        console.error('Failed to fetch AI limits:', err);
      }
    };
    loadLimits();
    // Refresh every 5 minutes
    const interval = setInterval(loadLimits, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
         {aiLimits && (
           <div className="app-header__ai-status" style={{ 
             display: 'flex', 
             alignItems: 'center', 
             gap: '8px', 
             padding: '4px 12px', 
             background: 'var(--shell-surface-elevated)', 
             borderRadius: '16px',
             fontSize: '13px',
             color: 'var(--text-secondary)',
             border: '1px solid var(--shell-border)'
           }} title={`Used: ${aiLimits.used}/${aiLimits.limit} requests | Cost: $${aiLimits.usage.toFixed(4)}/$${aiLimits.usageLimit.toFixed(2)} (${aiLimits.percentage}%)`}>
             <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>auto_awesome</span>
             <span>AI Requests Left: <strong>{aiLimits.remaining}</strong> <small style={{ marginLeft: '4px', opacity: 0.7 }}>({aiLimits.percentage}%)</small></span>
           </div>
         )}
         <div className="app-header__ai-toggle">
           <button
             className={`app-header__ai-btn ${showAI ? 'active' : ''}`}
             onClick={() => setShowAI(!showAI)}
             title="AI Navigator"
           >
             <span className="material-symbols-outlined">assistant_navigation</span>
           </button>
           <HeaderAIAssistant isOpen={showAI} onClose={() => setShowAI(false)} />
         </div>
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
