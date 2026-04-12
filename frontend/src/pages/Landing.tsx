import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';
import { useAuth, getDashboardPathForRole } from '../context/AuthContext';

const topNavItems = ['Explore', 'Resources', 'Curriculum'];

const featureCards = [
  {
    title: 'Code Editor',
    description:
      'Browser-based code editor with syntax highlighting and support for multiple programming languages.',
    className: 'md:col-span-2 lg:col-span-2',
    icon: <span className="material-symbols-outlined text-4xl">code</span>,
    extra: (
      <div className="mt-8 bg-surface-container p-4 rounded-lg flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-primary">main.py</span>
        <span className="text-xs text-on-surface-variant">42 ms latency</span>
      </div>
    ),
  },
  {
    title: 'AI Query Resolver',
    description:
      'AI-powered chatbot assistant to help students with their academic questions and doubts.',
    className: 'bg-primary text-white',
    icon: (
      <span className="material-symbols-outlined text-4xl text-on-primary-container">
        psychology
      </span>
    ),
  },
  {
    title: 'Video Lectures',
    description: 'Upload and stream video lectures with interactive timestamps and notes.',
    className: '',
    icon: <span className="material-symbols-outlined text-4xl text-secondary">video_library</span>,
  },
  {
    title: 'Course Management',
    description: 'Create and manage courses, enroll students, and organize course materials.',
    className: '',
    icon: <span className="material-symbols-outlined text-4xl text-tertiary">school</span>,
  },
  {
    title: 'Assignments',
    description: 'Create assignments, accept submissions, and grade student work with rubrics.',
    className: 'md:col-span-2',
    icon: <span className="material-symbols-outlined text-2xl font-bold mb-3">upload_file</span>,
    extra: (
      <div className="hidden sm:block w-32 h-32 bg-white rounded-lg shadow-inner flex items-center justify-center">
        <span className="material-symbols-outlined text-5xl text-primary">upload_file</span>
      </div>
    ),
  },
  {
    title: 'Progress Tracking',
    description: 'Track student progress with grades, analytics, and performance metrics.',
    className: '',
    icon: <span className="material-symbols-outlined text-4xl text-primary">monitoring</span>,
  },
  {
    title: 'Quizzes',
    description: 'Create and take quizzes with automatic grading and proctoring support.',
    className: '',
    icon: <span className="material-symbols-outlined text-4xl text-error">quiz</span>,
  },
  {
    title: 'Discussion Forums',
    description: 'Course-specific discussion boards for student-faculty interactions.',
    className: '',
    icon: <span className="material-symbols-outlined text-4xl text-primary">forum</span>,
  },
  {
    title: 'Security',
    description: 'Role-based access control with secure authentication and session management.',
    className: 'lg:col-span-1 border-l-4 border-primary',
    icon: <span className="material-symbols-outlined text-4xl text-on-surface">verified_user</span>,
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (user && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate(getDashboardPathForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="landing-page">
      <header>
        <nav>
          <div className="brand-nav">
            <span className="text-xl font-bold tracking-tighter text-blue-900">
              Unified Academic Portal
            </span>
            <div className="hidden md:flex nav-links">
              {topNavItems.map((item, index) => (
                <a key={item} href="#" className={index === 0 ? 'active' : ''}>
                  {item}
                </a>
              ))}
            </div>
          </div>
          <div className="header-actions">
            {user && (
              <div className="search-bar hidden sm:flex">
                <span className="material-symbols-outlined icon-search">search</span>
                <input placeholder="Search portal..." type="text" />
              </div>
            )}
            {user && (
              <div className="header-icons">
                <button className="icon-btn" aria-label="Notifications">
                  <span className="material-symbols-outlined icon-text">notifications</span>
                </button>
              </div>
            )}
            {!user ? (
              <div className="header-buttons">
                <button className="login-btn" onClick={() => navigate('/login')}>
                  Login
                </button>
                <button className="signup-btn" onClick={() => navigate('/signup')}>
                  Sign Up
                </button>
              </div>
            ) : (
              <button
                className="dashboard-btn"
                onClick={() => navigate(getDashboardPathForRole(user.role))}
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden pt-24 pb-20 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="z-10 text-center lg:text-left">
              <p className="label-md uppercase tracking-[0.2em] font-bold text-primary mb-4 block">
                Unified Academic Portal
              </p>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 hero-gradient">
                Manage Your Academic Workflows
              </h1>
              <p className="text-on-surface-variant text-lg md:text-xl mb-10 max-w-2xl leading-relaxed">
                A comprehensive platform for students, teachers, and administrators to manage
                courses, assignments, quizzes, and academic progress all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  className="cta-gradient text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all active:scale-95"
                  onClick={() => navigate('/login')}
                >
                  Get Started
                </button>
                <button
                  className="bg-surface-container-high text-on-surface px-8 py-4 rounded-xl font-semibold text-lg hover:bg-surface-container-highest transition-all active:scale-95"
                  onClick={() => navigate('/signup')}
                >
                  Create Account
                </button>
              </div>
              <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 opacity-60 grayscale hover:grayscale-0 transition-all">
                <span className="font-bold text-sm">TRUSTED BY</span>
                <div className="flex gap-6">
                  <span className="font-black italic text-xl">Students</span>
                  <span className="font-black italic text-xl">Teachers</span>
                  <span className="font-black italic text-xl">TAs</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 bg-white p-4 rounded-[2rem] shadow-2xl overflow-hidden">
                <div className="relative w-full h-[500px] network-visual flex flex-col items-center justify-center overflow-hidden rounded-[1.5rem]">
                  <div className="absolute top-6 left-6 z-20">
                    <span className="badge">Academic Hub</span>
                  </div>
                  <svg className="absolute inset-0 w-full h-full" fill="none" viewBox="0 0 400 500">
                    <path
                      d="M100 150 L300 120"
                      stroke="rgba(96, 165, 250, 0.3)"
                      strokeDasharray="4 4"
                      strokeWidth="2"
                    ></path>
                    <path
                      d="M100 150 L200 300"
                      stroke="rgba(96, 165, 250, 0.3)"
                      strokeDasharray="4 4"
                      strokeWidth="2"
                    ></path>
                    <path
                      d="M300 120 L200 300"
                      stroke="rgba(96, 165, 250, 0.3)"
                      strokeDasharray="4 4"
                      strokeWidth="2"
                    ></path>
                    <path
                      d="M200 300 L320 400"
                      stroke="rgba(96, 165, 250, 0.3)"
                      strokeDasharray="4 4"
                      strokeWidth="2"
                    ></path>
                    <path
                      d="M100 150 L80 380"
                      stroke="rgba(96, 165, 250, 0.3)"
                      strokeDasharray="4 4"
                      strokeWidth="2"
                    ></path>
                    <circle cx="100" cy="150" fill="url(#glow-blue)" opacity="0.2" r="40"></circle>
                    <circle
                      cx="300"
                      cy="120"
                      fill="url(#glow-purple)"
                      opacity="0.2"
                      r="40"
                    ></circle>
                    <circle cx="200" cy="300" fill="url(#glow-blue)" opacity="0.25" r="50"></circle>
                    <circle
                      cx="320"
                      cy="400"
                      fill="url(#glow-purple)"
                      opacity="0.2"
                      r="40"
                    ></circle>
                    <defs>
                      <radialGradient
                        id="glow-blue"
                        cx="0"
                        cy="0"
                        gradientTransform="translate(100 150) rotate(90) scale(40)"
                        gradientUnits="userSpaceOnUse"
                        r="1"
                      >
                        <stop stopColor="#60A5FA"></stop>
                        <stop offset="1" stopColor="#60A5FA" stopOpacity="0"></stop>
                      </radialGradient>
                      <radialGradient
                        id="glow-purple"
                        cx="0"
                        cy="0"
                        gradientTransform="translate(300 120) rotate(90) scale(40)"
                        gradientUnits="userSpaceOnUse"
                        r="1"
                      >
                        <stop stopColor="#A78BFA"></stop>
                        <stop offset="1" stopColor="#A78BFA" stopOpacity="0"></stop>
                      </radialGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 z-10">
                    <div className="absolute top-[25%] left-[15%] flex flex-col items-center gap-2">
                      <div className="node-icon blue">
                        <span className="material-symbols-outlined">psychology</span>
                      </div>
                      <span className="node-label blue">AI Assistant</span>
                    </div>
                    <div className="absolute top-[18%] right-[15%] flex flex-col items-center gap-2">
                      <div className="node-icon purple">
                        <span className="material-symbols-outlined">rate_review</span>
                      </div>
                      <span className="node-label purple">Grading</span>
                    </div>
                    <div className="absolute top-[55%] left-[40%] flex flex-col items-center gap-2">
                      <div className="node-icon cyan">
                        <span className="material-symbols-outlined">terminal</span>
                      </div>
                      <span className="node-label cyan">Code Editor</span>
                    </div>
                    <div className="absolute bottom-[15%] right-[12%] flex flex-col items-center gap-2">
                      <div className="node-icon teal">
                        <span className="material-symbols-outlined">insights</span>
                      </div>
                      <span className="node-label teal">Analytics</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <div className="line-v"></div>
                    <div className="line-h"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 text-center lg:text-left">
              <h2 className="text-4xl font-bold tracking-tight text-on-surface mb-4">
                All-in-One Academic Platform
              </h2>
              <p className="text-on-surface-variant max-w-2xl">
                Everything you need to manage your academic journey in one unified platform.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featureCards.map(card => (
                <article
                  key={card.title}
                  className={`bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group h-full ${card.className}`}
                >
                  {card.icon}
                  <div className="landing-feature-card__content">
                    <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                    <p className="text-on-surface-variant text-sm">{card.description}</p>
                  </div>
                  {card.extra}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6 relative">
          <div className="max-w-4xl mx-auto bg-primary rounded-[2.5rem] p-12 md:p-20 text-center text-white overflow-hidden relative shadow-2xl">
            <div className="absolute inset-0 opacity-10">
              <img
                alt="Digital Network"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM1oVAO_4dPBwxZDVtXVEI0Vd6-62ToL0SJtGHGL8tuxnLwNvDlFymeDiXfLgh8wVCzKNax6OAtNoSKJ6l-JYzgYKTac2HJ7o166P_GISZ_iLmpk-7znTiq7tQNl1FoW3qL8ECDWNnmqiM0eQAA_2KLUus4UeyYxPKyS8jqpGL39SnXXbtmajHt8hQqEf_SYx6SZByJX7J6iZ6r2u7utYLQnA9LyNbzpWw3R2-P2lf9K1DP-vTQGnE3xVjpq967jx9FzO_eT-31bM"
              />
            </div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Ready to get started?
              </h2>
              <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                Create an account to access your personalized academic dashboard and start managing
                your courses today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all active:scale-95 w-full sm:w-auto"
                  onClick={() => navigate('/signup')}
                >
                  Sign Up
                </button>
                <button
                  className="bg-primary-container text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all border border-blue-400/30 active:scale-95 w-full sm:w-auto"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-12 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center space-y-8 w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12 w-full max-w-2xl text-center md:text-left">
            <div className="flex flex-col gap-4">
              <span className="font-bold text-on-surface">Features</span>
              <a
                className="text-slate-400 hover:text-blue-900 transition-colors text-xs tracking-wide"
                href="#"
              >
                Courses
              </a>
              <a
                className="text-slate-400 hover:text-blue-900 transition-colors text-xs tracking-wide"
                href="#"
              >
                Assignments
              </a>
              <a
                className="text-slate-400 hover:text-blue-900 transition-colors text-xs tracking-wide"
                href="#"
              >
                Quizzes
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <span className="font-bold text-on-surface">About</span>
              <a
                className="text-slate-400 hover:text-blue-900 transition-colors text-xs tracking-wide"
                href="#"
              >
                About Us
              </a>
              <a
                className="text-slate-400 hover:text-blue-900 transition-colors text-xs tracking-wide"
                href="#"
              >
                Contact
              </a>
              <a
                className="text-slate-400 hover:text-blue-900 transition-colors text-xs tracking-wide"
                href="#"
              >
                Help
              </a>
            </div>
            <div className="flex flex-col gap-4 col-span-2 md:col-span-1">
              <span className="font-bold text-on-surface">Legal</span>
              <a
                className="text-slate-400 hover:text-blue-900 transition-colors text-xs tracking-wide"
                href="#"
              >
                Privacy Policy
              </a>
              <a
                className="text-slate-400 hover:text-blue-900 transition-colors text-xs tracking-wide"
                href="#"
              >
                Terms of Service
              </a>
              <a
                className="text-slate-400 hover:text-blue-900 transition-colors text-xs tracking-wide"
                href="#"
              >
                Contact Support
              </a>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 w-full text-center">
            <p className="font-sans text-xs tracking-wide text-slate-400">
              © 2024 Unified Academic Portal. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
