import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getDashboardPathForRole } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import './HeaderAIAssistant.css';

export default function HeaderAIAssistant({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [command, setCommand] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<'idle' | 'thinking' | 'done' | 'error'>('idle');
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Extract courseId from current URL
  const courseMatch = pathname.match(/\/courses\/(\d+)/);
  const courseId = courseMatch ? courseMatch[1] : null;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    const saved = localStorage.getItem('ai_navigator_history');
    if (saved) setRecentCommands(JSON.parse(saved));
  }, [isOpen]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleExecute = async (cmdStr?: string) => {
    const finalCmd = (cmdStr || command).toLowerCase().trim();
    if (!finalCmd) return;

    // Save to history
    const updated = [finalCmd, ...recentCommands.filter(c => c !== finalCmd)].slice(0, 4);
    setRecentCommands(updated);
    localStorage.setItem('ai_navigator_history', JSON.stringify(updated));

    // Step 1: Local keyword matching for instant response
    let targetPath: string | null = null;
    let confirmMsg = '';

    if (finalCmd.includes('assignment') || finalCmd.includes('task') || finalCmd.includes('homework') || finalCmd.includes('todo')) {
      targetPath = courseId ? `/courses/${courseId}/assignments` : getDashboardPathForRole(user?.role || 'student');
      confirmMsg = '🚀 Opening Assignments...';
    } else if (finalCmd.includes('quiz') || finalCmd.includes('test') || finalCmd.includes('assessment') || finalCmd.includes('exam')) {
      targetPath = courseId ? `/courses/${courseId}/quiz-management` : getDashboardPathForRole(user?.role || 'student');
      confirmMsg = '📝 Opening Quizzes...';
    } else if (finalCmd.includes('lecture') || finalCmd.includes('video') || finalCmd.includes('class') || finalCmd.includes('watch') || finalCmd.includes('recording')) {
      targetPath = courseId ? `/courses/${courseId}/videos` : getDashboardPathForRole(user?.role || 'student');
      confirmMsg = '📺 Opening Lectures...';
    } else if (finalCmd.includes('discussion') || finalCmd.includes('forum') || finalCmd.includes('chat') || finalCmd.includes('ask') || finalCmd.includes('help')) {
      targetPath = courseId ? `/courses/${courseId}/discussion` : getDashboardPathForRole(user?.role || 'student');
      confirmMsg = '💬 Opening Discussion...';
    } else if (finalCmd.includes('progress') || finalCmd.includes('grade') || finalCmd.includes('score') || finalCmd.includes('report') || finalCmd.includes('performance')) {
      targetPath = courseId ? `/progress/course/${courseId}` : getDashboardPathForRole(user?.role || 'student');
      confirmMsg = '📊 Opening Progress...';
    } else if (finalCmd.includes('profile') || finalCmd.includes('account') || finalCmd.includes('setting') || finalCmd.includes('password') || finalCmd.includes('me')) {
      targetPath = '/profile';
      confirmMsg = '👤 Opening Profile...';
    } else if (finalCmd.includes('home') || finalCmd.includes('dashboard') || finalCmd.includes('start') || finalCmd.includes('back')) {
      targetPath = getDashboardPathForRole(user?.role || 'student');
      confirmMsg = '🏠 Going to Dashboard...';
    }

    if (targetPath) {
      setStatus('done');
      setResponse(confirmMsg);
      setTimeout(() => {
        navigate(targetPath!);
        onClose();
        setCommand('');
        setResponse('');
        setStatus('idle');
      }, 500);
      return;
    }

    // Step 2: AI-powered fallback
    setStatus('thinking');
    setResponse('Thinking...');

    try {
      const result = await apiFetch<{ target: string; reason: string }>('/api/chatbot/navigate', {
        method: 'POST',
        body: { query: finalCmd, courseId },
      });

      if (result.target && result.target !== 'unknown') {
        const routeMap: Record<string, string> = {
          assignments: courseId ? `/courses/${courseId}/assignments` : getDashboardPathForRole(user?.role || 'student'),
          quizzes: courseId ? `/courses/${courseId}/quiz-management` : getDashboardPathForRole(user?.role || 'student'),
          lectures: courseId ? `/courses/${courseId}/videos` : getDashboardPathForRole(user?.role || 'student'),
          discussion: courseId ? `/courses/${courseId}/discussion` : getDashboardPathForRole(user?.role || 'student'),
          progress: courseId ? `/progress/course/${courseId}` : getDashboardPathForRole(user?.role || 'student'),
          profile: '/profile',
          settings: '/profile',
          dashboard: getDashboardPathForRole(user?.role || 'student'),
        };

        const navTarget = routeMap[result.target];
        if (navTarget) {
          setStatus('done');
          setResponse(result.reason || `Navigating to ${result.target}...`);
          setTimeout(() => {
            navigate(navTarget);
            onClose();
            setCommand('');
            setResponse('');
            setStatus('idle');
          }, 800);
          return;
        }
      }

      setStatus('error');
      setResponse(result.reason || "I'm not quite sure how to get there. Could you try a direct command like 'go to assignments'?");
    } catch {
      setStatus('error');
      setResponse("We're having trouble reaching the assistant. Please check your connection or try again in a moment.");
    }
  };

  if (!isOpen) return null;

  const suggestions = ['Show Assignments', 'Go to Quizzes', 'Open Discussion', 'View Progress'];

  return (
    <div className="header-ai-assistant" ref={panelRef}>
      <div className="header-ai-assistant__header">
        <div className="header-ai-assistant__title">
          <span className="material-symbols-outlined">assistant_navigation</span>
          AI Navigator
        </div>
        <button className="header-ai-assistant__close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="header-ai-assistant__input-area">
        <div className="header-ai-assistant__input-wrapper">
          <span className="material-symbols-outlined">search</span>
          <input
            ref={inputRef}
            className="header-ai-assistant__input"
            type="text"
            placeholder="Where do you want to go?"
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleExecute()}
          />
          <button className="header-ai-assistant__submit" onClick={() => handleExecute()}>
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>

      <div className="header-ai-assistant__suggestions">
        {suggestions.map(s => (
          <button key={s} className="header-ai-assistant__chip" onClick={() => handleExecute(s)}>
            {s}
          </button>
        ))}
      </div>

      {status !== 'idle' && (
        <div className="header-ai-assistant__response">
          <p className={`header-ai-assistant__response-text ${status === 'thinking' ? 'thinking' : ''} ${status === 'error' ? 'error' : ''}`}>
            {response}
          </p>
        </div>
      )}
      {recentCommands.length > 0 && (
        <div className="header-ai-assistant__history">
          <div className="header-ai-assistant__history-title">Recent</div>
          {recentCommands.map(c => (
            <div key={c} className="header-ai-assistant__history-item" onClick={() => handleExecute(c)}>
              <span className="material-symbols-outlined">history</span>
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
