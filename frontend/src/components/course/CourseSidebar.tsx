import { useState } from 'react'
import './CourseSidebar.css'

export interface TabItem {
  id: string
  label: string
  icon: string
  tooltip?: string
  visible?: boolean
  badge?: number
}

interface CourseSidebarProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  userRole?: string
  onSidebarToggle?: (isOpen: boolean) => void
}

interface CourseSidebarInnerProps extends CourseSidebarProps {
  isOpen: boolean
}

function CourseSidebarInner({ tabs, activeTab, onTabChange, userRole, isOpen }: CourseSidebarInnerProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onTabChange(tabId)
    }
  }

  const visibleTabs = tabs.filter(tab => tab.visible !== false)

  return (
    <aside 
      className={`course-sidebar ${isOpen ? 'open' : 'closed'}`}
      role="navigation"
      aria-label="Course navigation"
    >

      <nav className="sidebar-nav">
        <ul className="nav-list" role="menu">
          {visibleTabs.map((tab) => (
            <li key={tab.id} role="none">
              <button
                role="menuitem"
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, tab.id)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                tabIndex={0}
              >
                <span className="nav-icon" aria-hidden="true">{tab.icon}</span>
                <span className="nav-label">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="nav-badge" aria-label={`${tab.badge} items`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {userRole && (
        <div className="sidebar-footer">
          <div className="user-role-badge">
            <span className="role-icon">👤</span>
            <span className="role-text">{userRole}</span>
          </div>
        </div>
      )}
    </aside>
  )
}

// Main export component with toggle state management
export default function CourseSidebar(props: CourseSidebarProps) {
  const [isOpen, setIsOpen] = useState(true)

  const handleToggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    if (props.onSidebarToggle) {
      props.onSidebarToggle(newState)
    }
  }

  return (
    <>
      {/* Hamburger Button - Positioned in top-left */}
      <button
        className="sidebar-hamburger"
        onClick={handleToggle}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={isOpen}
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* Sidebar Navigation */}
      <CourseSidebarInner {...props} isOpen={isOpen} />
      
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={handleToggle}
          aria-hidden="true"
        />
      )}
    </>
  )
}
