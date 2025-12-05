# Automatic Fullscreen Implementation Plan for Proctored Quizzes

## Current State Analysis

### Existing Implementation
- Fullscreen is triggered in `proctoringService.startMonitoring()` via `enterFullscreen()`
- Called when user clicks "Start Advanced Proctored Quiz" button
- Button click provides user gesture required by browsers
- If fullscreen fails, quiz doesn't start and shows error

### Browser Requirements
- **User Gesture**: Fullscreen API requires recent user interaction (click, keypress, touch)
- **Security**: Prevents malicious sites from forcing fullscreen
- **Cross-browser**: Different implementations (webkit, moz, ms prefixes)
- **Permissions**: May require additional permissions in some browsers

## Proposed Automatic Fullscreen Flow

### 1. Pre-Quiz Preparation
```
User navigates to quiz page
├── Check if quiz is proctored
├── Load proctoring configuration
├── Show proctoring instructions screen
└── Wait for user gesture (button click)
```

### 2. Automatic Fullscreen Sequence
```
User clicks "Start Quiz" (provides user gesture)
├── Validate permissions (camera, microphone)
├── Create proctoring session on server
├── Initialize WebSocket connection
├── Attempt fullscreen immediately
│   ├── Success: Proceed with quiz
│   └── Failure: Show retry options
├── Start monitoring systems
└── Begin quiz timer
```

### 3. Runtime Fullscreen Management
```
During quiz:
├── Monitor fullscreen state continuously
├── Detect fullscreen exit → Start grace period
├── Allow return to fullscreen during grace period
└── Auto-suspend if grace period expires
```

## Implementation Details

### Enhanced Fullscreen Service

#### Improved `enterFullscreen()` Method
```typescript
async enterFullscreen(options: {
  retryCount?: number;
  showInstructions?: boolean;
  timeout?: number;
} = {}): Promise<void> {
  const { retryCount = 0, showInstructions = true, timeout = 5000 } = options;

  // Check if already in fullscreen
  if (this.isFullscreen()) {
    return;
  }

  // Validate user gesture (recent interaction)
  if (!this.hasRecentUserGesture()) {
    throw new Error('User gesture required for fullscreen');
  }

  try {
    // Set timeout for fullscreen request
    const fullscreenPromise = this.requestFullscreen();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Fullscreen request timeout')), timeout)
    );

    await Promise.race([fullscreenPromise, timeoutPromise]);

    // Verify fullscreen was actually entered
    await this.waitForFullscreen(1000);

    console.log('Successfully entered fullscreen mode');
  } catch (error) {
    console.warn('Fullscreen request failed:', error);

    // Retry logic for recoverable failures
    if (retryCount < 2 && this.isRecoverableError(error)) {
      console.log(`Retrying fullscreen (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.enterFullscreen({ ...options, retryCount: retryCount + 1 });
    }

    // Show user instructions for manual fullscreen
    if (showInstructions) {
      this.showFullscreenInstructions();
    }

    throw new Error(`Fullscreen is required for proctored quizzes. ${this.getErrorMessage(error)}`);
  }
}
```

#### User Gesture Detection
```typescript
private hasRecentUserGesture(): boolean {
  // Track recent user interactions
  const now = Date.now();
  const recentThreshold = 5000; // 5 seconds

  return (now - this.lastUserInteraction) < recentThreshold;
}

private trackUserGestures(): void {
  const events = ['click', 'touchstart', 'keydown', 'mousedown'];

  const updateInteraction = () => {
    this.lastUserInteraction = Date.now();
  };

  events.forEach(event => {
    document.addEventListener(event, updateInteraction, { passive: true });
  });
}
```

#### Fullscreen State Management
```typescript
private isFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

private async waitForFullscreen(timeout: number): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (this.isFullscreen()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Fullscreen state not detected within timeout');
}
```

### Enhanced QuizTake Component

#### Improved Start Flow
```typescript
const startAdvancedProctoring = useCallback(async () => {
  console.log('Starting automatic fullscreen proctoring');

  try {
    // Step 1: Validate prerequisites
    await validatePrerequisites();

    // Step 2: Request fullscreen with retry logic
    await requestFullscreenWithRetry();

    // Step 3: Initialize proctoring systems
    await initializeProctoring();

    // Step 4: Start quiz
    setQuizStarted(true);

  } catch (error) {
    console.error('Failed to start proctored quiz:', error);
    handleStartFailure(error);
  }
}, []);

async function requestFullscreenWithRetry(): Promise<void> {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await proctoringService.enterFullscreen({
        retryCount: attempt - 1,
        showInstructions: attempt === maxRetries
      });
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Show retry prompt
      const retry = await showFullscreenRetryPrompt(attempt, maxRetries);
      if (!retry) {
        throw new Error('User cancelled fullscreen setup');
      }
    }
  }
}
```

#### Fullscreen Instructions Component
```typescript
function FullscreenInstructions({ onRetry, onManual }: {
  onRetry: () => void;
  onManual: () => void;
}) {
  return (
    <div className="fullscreen-instructions-overlay">
      <div className="instructions-card">
        <h3>🔍 Fullscreen Required</h3>
        <p>This proctored quiz requires fullscreen mode.</p>

        <div className="browser-instructions">
          <h4>Enable Fullscreen:</h4>
          <ul>
            <li><strong>Chrome/Edge:</strong> Click the fullscreen icon (⛶) in address bar</li>
            <li><strong>Firefox:</strong> Press F11 or click menu → Fullscreen</li>
            <li><strong>Safari:</strong> View menu → Enter Fullscreen</li>
          </ul>
        </div>

        <div className="action-buttons">
          <button onClick={onRetry} className="btn btn-primary">
            Try Again Automatically
          </button>
          <button onClick={onManual} className="btn btn-secondary">
            I've Enabled Fullscreen Manually
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Browser-Specific Considerations

### Chrome/Edge
- Most permissive with fullscreen API
- May show "Press ESC to exit fullscreen" notification
- Supports `requestFullscreen()` with options

### Firefox
- Requires user interaction for fullscreen
- May block fullscreen in popup windows
- Supports `mozRequestFullScreen()`

### Safari
- Strictest fullscreen requirements
- May require additional user gestures
- Supports `webkitRequestFullscreen()`

### Mobile Browsers
- Limited fullscreen support
- May require special handling for iOS Safari
- Consider showing warning for mobile devices

## Error Handling Strategy

### Categorize Errors
1. **Recoverable**: Network issues, temporary browser state
2. **User Fixable**: Permissions denied, fullscreen blocked
3. **Non-recoverable**: Browser doesn't support fullscreen

### Recovery Strategies
- **Automatic Retry**: For temporary failures
- **User Instructions**: Clear steps to enable fullscreen
- **Manual Override**: Allow quiz start with warnings
- **Graceful Degradation**: Continue with windowed mode (less secure)

## Security Considerations

### Proctoring Integrity
- Fullscreen exit should always trigger violations
- Monitor for fullscreen API manipulation attempts
- Record fullscreen state changes in audit logs

### User Experience
- Clear instructions for enabling fullscreen
- Multiple retry attempts before giving up
- Fallback options for accessibility needs

## Testing Strategy

### Browser Compatibility Testing
- Chrome (latest 3 versions)
- Firefox (latest 3 versions)
- Safari (desktop and mobile)
- Edge (latest 2 versions)

### Device Testing
- Desktop computers
- Laptops
- Tablets (limited support expected)
- Mobile phones (warning/block expected)

### Edge Cases
- Multiple monitors
- Virtual machines
- Browser extensions interfering
- System-level fullscreen policies

## Configuration Options

### Proctoring Config Extensions
```typescript
interface ProctoringConfig {
  // ... existing fields ...

  // Fullscreen settings
  fullscreen_required: boolean; // Default: true
  fullscreen_retry_attempts: number; // Default: 3
  fullscreen_grace_period: number; // Default: 5 seconds
  allow_windowed_mode: boolean; // Default: false
  mobile_warning: boolean; // Default: true
}
```

## Implementation Phases

### Phase 1: Core Automatic Fullscreen
- Implement enhanced `enterFullscreen()` method
- Add user gesture tracking
- Basic retry logic
- Cross-browser compatibility

### Phase 2: Advanced Error Handling
- Comprehensive error categorization
- User-friendly instruction screens
- Manual fullscreen fallback
- Mobile device handling

### Phase 3: Monitoring & Security
- Enhanced fullscreen state monitoring
- Violation detection improvements
- Audit logging enhancements
- Security testing

### Phase 4: Polish & Optimization
- Performance optimizations
- Accessibility improvements
- Internationalization support
- Advanced configuration options

## Success Metrics

- **Reliability**: >95% successful fullscreen entry on supported browsers
- **User Experience**: <30 seconds average time to enter fullscreen
- **Security**: Zero false negatives in fullscreen violation detection
- **Compatibility**: Support for all major browsers and versions

## Risk Mitigation

### Fallback Strategies
1. **Windowed Mode**: Allow quiz in windowed mode with reduced security
2. **Manual Instructions**: Clear steps for users to enable fullscreen
3. **Alternative Proctoring**: Webcam-only monitoring as backup
4. **Administrative Override**: Teachers can approve windowed sessions

### Monitoring & Alerts
- Track fullscreen success/failure rates
- Alert administrators to browser compatibility issues
- Monitor for attempts to bypass fullscreen requirements
- Regular security audits of fullscreen implementation

This comprehensive plan ensures automatic fullscreen entry for proctored quizzes while maintaining security, usability, and cross-browser compatibility.