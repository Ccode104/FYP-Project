import type { ReactNode } from 'react'
import './Layout.css'
import { useLocation } from 'react-router-dom'

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const isAuth = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/forgot')

  // For auth routes, let the page components control their own full-screen layout
  if (isAuth) {
    return <>{children}</>
  }

  return (
    <div className="site-layout">
      <header className="site-header">
        <div className="site-header__inner">
          <h1 className="site-title">Unified Academic Portal</h1>
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
