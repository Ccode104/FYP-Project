import React from 'react';

interface FullscreenInstructionsProps {
  onRetry: () => void;
  onManual: () => void;
  errorMessage?: string;
  attemptNumber?: number;
  maxAttempts?: number;
}

export default function FullscreenInstructions({
  onRetry,
  onManual,
  errorMessage,
  attemptNumber = 1,
  maxAttempts = 3
}: FullscreenInstructionsProps) {
  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return {
        name: 'Chrome',
        steps: [
          'Click the fullscreen icon (⛶) in the address bar',
          'Or press F11 on your keyboard',
          'Or click the three dots menu → Fullscreen'
        ]
      };
    } else if (userAgent.includes('firefox')) {
      return {
        name: 'Firefox',
        steps: [
          'Press F11 on your keyboard',
          'Or click the fullscreen button in the toolbar',
          'Or View menu → Enter Fullscreen'
        ]
      };
    } else if (userAgent.includes('safari')) {
      return {
        name: 'Safari',
        steps: [
          'View menu → Enter Fullscreen',
          'Or press Control + Command + F',
          'Or click the green traffic light button'
        ]
      };
    } else if (userAgent.includes('edg')) {
      return {
        name: 'Edge',
        steps: [
          'Click the fullscreen icon (⛶) in the address bar',
          'Or press F11 on your keyboard',
          'Or click the menu button → Fullscreen'
        ]
      };
    } else {
      return {
        name: 'Your Browser',
        steps: [
          'Look for a fullscreen button in the toolbar',
          'Try pressing F11 on your keyboard',
          'Check your browser\'s View menu for fullscreen option'
        ]
      };
    }
  };

  const browser = getBrowserInstructions();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        color: '#333',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '10px',
            color: '#ef4444'
          }}>
            🔍
          </div>
          <h2 style={{
            margin: '0 0 10px 0',
            color: '#1f2937',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            Fullscreen Required
          </h2>
          <p style={{
            margin: '0 0 15px 0',
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            This proctored quiz requires fullscreen mode to maintain exam integrity.
          </p>
          {attemptNumber > 1 && (
            <p style={{
              margin: '0 0 15px 0',
              color: '#f59e0b',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Attempt {attemptNumber} of {maxAttempts}
            </p>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <p style={{
              margin: 0,
              color: '#dc2626',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              ⚠️ {errorMessage}
            </p>
          </div>
        )}

        {/* Browser Instructions */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '25px',
          textAlign: 'left'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            color: '#1f2937',
            fontSize: '1.1rem',
            fontWeight: '600'
          }}>
            Enable Fullscreen in {browser.name}:
          </h3>
          <ol style={{
            margin: 0,
            paddingLeft: '20px',
            color: '#374151'
          }}>
            {browser.steps.map((step, _index) => (
              <li key={index} style={{
                marginBottom: '8px',
                fontSize: '0.9rem',
                lineHeight: '1.4'
              }}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Alternative Methods */}
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '6px',
          padding: '15px',
          marginBottom: '25px',
          textAlign: 'left'
        }}>
          <h4 style={{
            margin: '0 0 10px 0',
            color: '#0369a1',
            fontSize: '0.95rem',
            fontWeight: '600'
          }}>
            Alternative Methods:
          </h4>
          <ul style={{
            margin: 0,
            paddingLeft: '18px',
            color: '#0369a1',
            fontSize: '0.85rem'
          }}>
            <li>Right-click on the page and select "View fullscreen"</li>
            <li>Use keyboard shortcut: F11 (most browsers)</li>
            <li>Check browser settings for fullscreen permissions</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={onRetry}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              minWidth: '120px'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            Try Again Automatically
          </button>

          <button
            onClick={onManual}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              minWidth: '120px'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
            onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
          >
            I've Enabled Fullscreen
          </button>
        </div>

        {/* Footer Note */}
        <p style={{
          margin: '20px 0 0 0',
          color: '#9ca3af',
          fontSize: '0.8rem',
          lineHeight: '1.4'
        }}>
          If you continue to have issues, contact your instructor or system administrator for assistance.
        </p>
      </div>
    </div>
  );
}
