import { useNavigate } from 'react-router-dom'
// // Ensure image is imported properly
// import backgroundImg from '../assets/background.jpg'
import './Landing.css'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="landing-page">
      {/* fixed background element to avoid affecting page layout/scroll */}
      
      <div className="landing-hero">
        <div className="hero-3d-container">
          <div className="hero-content hero-3d">
            <h1 className="hero-title">
              Welcome to <span className="gradient-text">Unified Academic Portal</span>
            </h1>
            <p className="hero-subtitle">
              Your all-in-one platform for managing courses, assignments, quizzes, and academic progress.
              Join thousands of students and educators already using our platform.
            </p>
            {!user && (
              <div className="hero-actions">
                <button className="btn btn-primary btn-large btn-3d" onClick={() => navigate('/login')}>
                  Get Started
                </button>
                <button className="btn btn-secondary btn-large btn-3d" onClick={() => navigate('/signup')}>
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="landing-features">
        <div className="container">
          <h2 className="features-title">Why Choose Our Platform?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎓</div>
              <h3 className="feature-title">Comprehensive Course Management</h3>
              <p className="feature-description">
                Organize your courses, access materials, and track your academic journey all in one place.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✅</div>
              <h3 className="feature-title">Easy Assignment Submission</h3>
              <p className="feature-description">
                Submit assignments with ease, track deadlines, and receive feedback from instructors.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3 className="feature-title">Real-time Progress Tracking</h3>
              <p className="feature-description">
                Monitor your academic performance with detailed progress reports and analytics.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💡</div>
              <h3 className="feature-title">Interactive Quizzes</h3>
              <p className="feature-description">
                Take quizzes, get instant feedback, and improve your understanding of course materials.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3 className="feature-title">Discussion Forums</h3>
              <p className="feature-description">
                Engage with peers and instructors through interactive discussion forums.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3 className="feature-title">Secure & Reliable</h3>
              <p className="feature-description">
                Your data is protected with industry-standard security measures and encryption.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Get Started?</h2>
            <p className="cta-subtitle">Join our platform today and transform your academic experience</p>
            {!user && <div className="cta-actions">
              <button className="btn btn-primary btn-large" onClick={() => navigate('/signup')}>
                Sign Up Now
              </button>
              <button className="btn btn-ghost btn-large" onClick={() => navigate('/login')}>
                Already have an account? Login
              </button>
            </div>}
          </div>
        </div>
      </div>
    </div>
  )
}

