import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HoverAIOverlay.css';

interface OverlayState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  sourceUrl: string;
}

export default function HoverAIOverlay() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<OverlayState>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    sourceUrl: '',
  });

  const dismiss = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  // Listen for text selection
  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay to allow selection to finalize
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (!text || text.length < 3) {
          return; // Don't show for very short selections
        }

        // Don't show if clicking inside the overlay itself
        if (overlayRef.current && selection?.anchorNode) {
          if (overlayRef.current.contains(selection.anchorNode as Node)) {
            return;
          }
        }

        try {
          const range = selection!.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // Position centered above the selection
          const x = rect.left + rect.width / 2;
          const y = rect.top - 12;

          setState({
            visible: true,
            x,
            y,
            selectedText: text,
            sourceUrl: window.location.href,
          });
        } catch {
          // Ignore range errors
        }
      }, 50);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Dismiss if clicking outside the overlay
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [dismiss]);

  // Dismiss on navigation
  useEffect(() => {
    dismiss();
  }, [pathname, dismiss]);

  const handleCiteInDiscussion = () => {
    // Extract courseId from current URL
    const courseMatch = pathname.match(/\/courses\/(\d+)/);
    const courseId = courseMatch ? courseMatch[1] : null;

    if (!courseId) {
      // Navigate to dashboard if not in course context
      dismiss();
      return;
    }

    // Navigate to discussion with pre-filled citation
    navigate(`/courses/${courseId}/discussion`, {
      state: {
        prefill: `> "${state.selectedText}"\n\n_Source: ${state.sourceUrl}_\n\n`,
      },
    });
    dismiss();
  };

  return (
    <div
      ref={overlayRef}
      className={`hover-ai-overlay ${state.visible ? 'hover-ai-overlay--visible' : ''}`}
      style={{
        left: `${state.x}px`,
        top: `${state.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="hover-ai-overlay__card">
        <button className="hover-ai-overlay__btn" onClick={handleCiteInDiscussion}>
          <span className="material-symbols-outlined">format_quote</span>
          Cite in Discussion
        </button>
        <button className="hover-ai-overlay__dismiss" onClick={dismiss}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  );
}
