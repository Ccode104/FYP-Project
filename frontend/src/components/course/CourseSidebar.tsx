import { useState, useEffect, useRef } from 'react'
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
  onSidebarLeave: () => void
  onSidebarEnter: () => void
  onSidebarClick: () => void
}

function CourseSidebarInner({ tabs, activeTab, onTabChange, userRole, isOpen, onSidebarLeave, onSidebarEnter, onSidebarClick }: CourseSidebarInnerProps) {

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
      onMouseEnter={onSidebarEnter}
      onMouseLeave={onSidebarLeave}
      onClick={onSidebarClick}
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
                onClick={(e) => { e.stopPropagation(); onTabChange(tab.id); }}
                onKeyDown={(e) => handleKeyDown(e, tab.id)}

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
  const [openedByHamburger, setOpenedByHamburger] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { onSidebarToggle } = props

  // Handle global click to close sidebar when opened by hover
  useEffect(() => {
    const handleGlobalClick = () => {
      if (isOpen && !openedByHamburger) {
        setIsOpen(false)
        if (onSidebarToggle) {
          onSidebarToggle(false)
        }
      }
    }

    if (isOpen && !openedByHamburger) {
      document.addEventListener('click', handleGlobalClick)
      return () => document.removeEventListener('click', handleGlobalClick)
    }
  }, [isOpen, openedByHamburger, onSidebarToggle])

  const handleToggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    setOpenedByHamburger(newState) // Track if opened by hamburger
    if (props.onSidebarToggle) {
      props.onSidebarToggle(newState)
    }
  }

  const handleSidebarEnter = () => {
      if (!openedByHamburger) { // Only open on hover if not opened by hamburger
        timeoutRef.current = setTimeout(() => {
          setIsOpen(true)
          if (props.onSidebarToggle) {
            props.onSidebarToggle(true)
          }
        }, 500)
      }
    }

  const handleSidebarLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (!openedByHamburger) { // Only close on leave if not opened by hamburger
      setIsOpen(false)
      if (props.onSidebarToggle) {
        props.onSidebarToggle(false)
      }
    }
  }

  const handleSidebarClick = () => {
    if (!openedByHamburger) { // Only close on click if opened by hover
      setIsOpen(false)
      if (props.onSidebarToggle) {
        props.onSidebarToggle(false)
      }
    }
  }

  return (
    <>
      {/* Hamburger Button - Positioned in top-left */}
      <button
        className="sidebar-hamburger"
        onClick={handleToggle}
        aria-label="Toggle sidebar"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* Sidebar Navigation */}
      <CourseSidebarInner
        {...props}
        isOpen={isOpen}
        onSidebarLeave={handleSidebarLeave}
        onSidebarEnter={handleSidebarEnter}
        onSidebarClick={handleSidebarClick}
      />

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
