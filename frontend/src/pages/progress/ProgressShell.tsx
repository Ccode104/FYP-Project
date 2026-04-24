import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './ProgressExperience.css';

type ProgressSection = 'overview' | 'academics' | 'leaderboard' | 'achievements';

export default function ProgressShell({
  activeSection,
  onSectionChange,
  children,
}: {
  activeSection: ProgressSection;
  onSectionChange: (section: ProgressSection) => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const initials = (user?.name || 'U')
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const navItems: Array<{ id: ProgressSection; label: string; icon: string }> = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'academics', label: 'Academics', icon: 'school' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'military_tech' },
    { id: 'achievements', label: 'Achievements', icon: 'workspace_premium' },
  ];

  const footerItems = [
    { label: 'Support', icon: 'help_center', onClick: () => navigate('/success-center') },
    { label: 'Settings', icon: 'settings', onClick: () => navigate('/profile') },
  ];

  return (
    <div className="progress-experience">
      <div className="progress-shell">
        <header className="progress-shell__topbar">
          <div className="progress-shell__topbar-inner">
            <div className="progress-shell__brand">Scholaris</div>
            <nav className="progress-shell__topnav">
              {navItems.map(item => (
                <button
                  key={item.id}
                  className={activeSection === item.id ? 'is-active' : ''}
                  onClick={() => onSectionChange(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="progress-shell__topactions">
              <button className="progress-shell__iconbtn" onClick={() => navigate('/success-center')}>
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="progress-shell__iconbtn" onClick={() => navigate(-1)}>
                <span className="material-symbols-outlined">history</span>
              </button>
              <button className="progress-shell__avatar" onClick={() => navigate('/profile')}>
                {initials}
              </button>
            </div>
          </div>
        </header>

        <div className="progress-shell__body">
          <aside className="progress-shell__sidebar">
            <div className="progress-shell__sidebar-brand">
              <div className="progress-shell__sidebar-title">
                <span className="progress-shell__badge">
                  <span className="material-symbols-outlined">school</span>
                </span>
                <span>Scholaris Modern</span>
              </div>
              <p className="progress-shell__sidebar-subtitle">Academic Excellence</p>
            </div>

            <div className="progress-shell__side-links">
              {navItems.map(item => (
                <button
                  key={item.id}
                  className={`progress-shell__side-link${activeSection === item.id ? ' is-active' : ''}`}
                  onClick={() => onSectionChange(item.id)}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div className="progress-shell__side-footer">
              {footerItems.map(item => (
                <button key={item.label} className="progress-shell__side-link" onClick={item.onClick}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </aside>

          <main className="progress-shell__content">{children}</main>
        </div>

        <nav className="progress-page__mobile-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={activeSection === item.id ? 'is-active' : ''}
              onClick={() => onSectionChange(item.id)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
