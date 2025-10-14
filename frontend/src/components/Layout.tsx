import type { ReactNode } from 'react'
import './Layout.css'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="site-layout">
      <header className="site-header">
        <div className="container site-header__inner">
          <h1 className="site-title">VNIT COURSE EVALUATION PORTAL</h1>
        </div>
      </header>

      <main className="site-main">
        {children}
      </main>

      <footer className="site-footer">
        <div className="container">
          <p className="site-footer__text">Created by Shoyam Rai, Manas Jungade, Abhishek Chandurkar and Tanmay Sharnagat</p>
        </div>
      </footer>
    </div>
  )
}