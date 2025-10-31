import type { ReactNode } from 'react'
import './Layout.css'
// import { Link } from 'react-router-dom';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="site-layout">
      <header className="site-header">
        <div className="site-header__inner">
          <h1 className="site-title">Unified Academic Portal</h1>
          {/*
          Can be added in future once the respective React components are defined
          <nav className="site-nav">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          */}
        </div>
      </header>

      <main className="split-main">
        <div className="left-panel">
          <div className="glow-circle"></div>
          <h2><span className="welcome-text"> Welcome Back </span>👋</h2>
          <p className="tagline">Access your academic dashboard, assignments, and more.</p>
        </div>

        <div className="right-panel">
          <div className="auth-card">
            {children}
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <p className="site-footer__text">
          © 2025 Unified Academic Portal — Created by Shoyam Rai, Manas Jungade, Abhishek Chandurkar, and Tanmay Sharnagat
        </p>
      </footer>
    </div>
  )
}
