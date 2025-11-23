import { io, Socket } from 'socket.io-client';
import * as faceapi from 'face-api.js';

export interface ProctoringConfig {
  webcam_required: boolean;
  screen_monitoring: boolean;
  audio_monitoring: boolean;
  face_detection_required: boolean;
  max_warnings: number;
  auto_suspend_severity: number;
  allow_recovery: boolean;
  recovery_wait_seconds: number;
  violation_score_penalty: number;
  suspension_requires_teacher: boolean;
  live_monitoring_enabled: boolean;
  record_sessions: boolean;
}

export interface ProctoringSession {
  id: number;
  session_token: string;
  student_id: number;
  quiz_id: number;
  status: 'active' | 'suspended' | 'completed' | 'terminated';
  webcam_enabled: boolean;
  screen_monitoring_enabled: boolean;
  audio_monitoring_enabled: boolean;
}

export interface ViolationData {
  type: string;
  severity: 1 | 2 | 3 | 4;
  description?: string;
  evidence?: Record<string, unknown>;
  timestamp?: string;
}

export interface ProctoringStatus {
  isConnected: boolean;
  isFullscreen: boolean;
  webcamActive: boolean;
  screenSharing: boolean;
  faceDetected: boolean;
  audioDetected: boolean;
  violations: ViolationData[];
  warningCount: number;
  isSuspended: boolean;
  gracePeriodActive: boolean;
  gracePeriodTimeLeft: number;
  gracePeriodViolation?: ViolationData;
}

class ProctoringService {
  private socket: Socket | null = null;
  private sessionToken: string | null = null;
  private config: ProctoringConfig | null = null;
  private status: ProctoringStatus = {
    isConnected: false,
    isFullscreen: false,
    webcamActive: false,
    screenSharing: false,
    faceDetected: false,
    audioDetected: false,
    violations: [],
    warningCount: 0,
    isSuspended: false,
    gracePeriodActive: false,
    gracePeriodTimeLeft: 0
  };

  private statusCallbacks: ((status: ProctoringStatus) => void)[] = [];
  private violationCallbacks: ((violation: ViolationData) => void)[] = [];

  // Monitoring state
  private faceDetectionInterval: number | null = null;
  private screenCheckInterval: number | null = null;
  private fullscreenCheckInterval: number | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  // Grace period state
  private gracePeriodTimeout: number | null = null;
  private gracePeriodInterval: number | null = null;

  // Face detection models loaded
  private modelsLoaded = false;

  constructor() {
    this.initializeFaceDetection();
  }

  private async initializeFaceDetection() {
    try {
      // Load face detection models
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      this.modelsLoaded = true;
      console.log('Face detection models loaded');
    } catch (error) {
      console.warn('Face detection models not available, webcam monitoring will be limited:', error);
      this.modelsLoaded = false;
    }
  }

  // Initialize proctoring session
  async initializeSession(sessionToken: string, config: ProctoringConfig, userType: 'student' | 'teacher' | 'admin' = 'student'): Promise<void> {
    this.sessionToken = sessionToken;
    this.config = config;

    // Connect to WebSocket
    const socketUrl = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : 'http://localhost:4000';

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not initialized'));

      this.socket.on('connect', () => {
        console.log('Connected to proctoring server');

        // Join proctoring session
        this.socket?.emit('join-proctoring-session', {
          sessionToken: this.sessionToken,
          userId: this.getCurrentUserId(),
          userType
        });

        this.status.isConnected = true;
        this.notifyStatusChange();
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from proctoring server');
        this.status.isConnected = false;
        this.notifyStatusChange();
      });

      this.socket.on('proctoring-joined', (data) => {
        console.log('Joined proctoring session:', data);
      });

      // Listen for suspension/resume commands
      this.socket.on('session-suspended', (data) => {
        console.log('Session suspended:', data);
        this.status.isSuspended = true;
        this.notifyStatusChange();
        // Handle suspension UI
      });

      this.socket.on('session-resumed', (data) => {
        console.log('Session resumed:', data);
        this.status.isSuspended = false;
        this.notifyStatusChange();
        // Handle resume UI
      });

      this.socket.on('connect_error', (error) => {
        console.error('Proctoring connection error:', error);
        reject(error);
      });
    });
  }

  // Start monitoring based on configuration
  async startMonitoring(): Promise<void> {
    if (!this.config) throw new Error('Proctoring config not set');

    // Enter fullscreen mode first
    await this.enterFullscreen();

    // Start fullscreen monitoring
    this.startFullscreenMonitoring();

    // Start webcam monitoring if required
    if (this.config.webcam_required) {
      await this.startWebcamMonitoring();
    }

    // Start screen monitoring if required
    if (this.config.screen_monitoring) {
      this.startScreenMonitoring();
    }

    // Start audio monitoring if required
    if (this.config.audio_monitoring) {
      this.startAudioMonitoring();
    }
  }

  // Stop all monitoring
  stopMonitoring(): void {
    this.stopFullscreenMonitoring();
    this.stopWebcamMonitoring();
    this.stopScreenMonitoring();
    this.stopAudioMonitoring();
    this.clearGracePeriod();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.status.isConnected = false;
    this.notifyStatusChange();
  }

  // Grace period management
  startGracePeriod(violation: ViolationData, durationSeconds: number = 5): void {
    // Clear any existing grace period
    this.clearGracePeriod();

    this.status.gracePeriodActive = true;
    this.status.gracePeriodTimeLeft = durationSeconds;
    this.status.gracePeriodViolation = violation;
    this.notifyStatusChange();

    // Start countdown
    this.gracePeriodInterval = window.setInterval(() => {
      this.status.gracePeriodTimeLeft--;
      this.notifyStatusChange();

      if (this.status.gracePeriodTimeLeft <= 0) {
        this.endGracePeriod(true); // Time expired, trigger suspension
      }
    }, 1000);

    // Set timeout for automatic suspension
    this.gracePeriodTimeout = window.setTimeout(() => {
      this.endGracePeriod(true);
    }, durationSeconds * 1000);
  }

  private endGracePeriod(forceSuspend: boolean = false): void {
    this.clearGracePeriod();

    if (forceSuspend && this.status.gracePeriodViolation) {
      // Record the violation and suspend
      this.recordViolation(this.status.gracePeriodViolation);
    }

    this.status.gracePeriodActive = false;
    this.status.gracePeriodTimeLeft = 0;
    this.status.gracePeriodViolation = undefined;
    this.notifyStatusChange();
  }

  private clearGracePeriod(): void {
    if (this.gracePeriodTimeout) {
      clearTimeout(this.gracePeriodTimeout);
      this.gracePeriodTimeout = null;
    }
    if (this.gracePeriodInterval) {
      clearInterval(this.gracePeriodInterval);
      this.gracePeriodInterval = null;
    }
  }

  // Allow student to return to fullscreen during grace period
  returnToFullscreen(): Promise<void> {
    return this.enterFullscreen().then(() => {
      // Check if we're back in fullscreen
      const isFullscreen = !!(document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as Document & { msFullscreenElement?: Element }).msFullscreenElement);

      if (isFullscreen) {
        this.endGracePeriod(false); // Cancel suspension
        this.status.isFullscreen = true;
        this.notifyStatusChange();
      }
    });
  }

  // Fullscreen monitoring
  private startFullscreenMonitoring(): void {
    this.fullscreenCheckInterval = window.setInterval(() => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as Document & { msFullscreenElement?: Element }).msFullscreenElement
      );

      if (this.status.isFullscreen !== isFullscreen) {
        this.status.isFullscreen = isFullscreen;
        this.notifyStatusChange();

        if (!isFullscreen) {
          // Start grace period for fullscreen violation
          if (!this.status.gracePeriodActive) {
            this.startGracePeriod({
              type: 'fullscreen_exit',
              severity: 3,
              description: 'Exited fullscreen mode'
            }, 5); // 5 second grace period
          }
        } else {
          // Returned to fullscreen - cancel grace period if active
          if (this.status.gracePeriodActive && this.status.gracePeriodViolation?.type === 'fullscreen_exit') {
            this.endGracePeriod(false);
          }
        }
      }
    }, 1000);
  }

  private stopFullscreenMonitoring(): void {
    if (this.fullscreenCheckInterval) {
      clearInterval(this.fullscreenCheckInterval);
      this.fullscreenCheckInterval = null;
    }
  }

  // Webcam monitoring with face detection
  private async startWebcamMonitoring(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });

      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.style.display = 'none';
      document.body.appendChild(this.videoElement);

      this.canvasElement = document.createElement('canvas');
      this.canvasElement.style.display = 'none';
      document.body.appendChild(this.canvasElement);

      await this.videoElement.play();

      this.status.webcamActive = true;
      this.notifyStatusChange();

      // Start face detection (if models are available)
      if (this.modelsLoaded) {
        this.faceDetectionInterval = window.setInterval(async () => {
          if (!this.videoElement || !this.canvasElement) return;

          try {
            const detections = await faceapi.detectAllFaces(
              this.videoElement,
              new faceapi.TinyFaceDetectorOptions()
            );

            const hasFace = detections.length > 0;
            const multipleFaces = detections.length > 1;

            if (this.status.faceDetected !== hasFace) {
              this.status.faceDetected = hasFace;
              this.notifyStatusChange();

              if (!hasFace) {
                this.recordViolation({
                  type: 'face_not_detected',
                  severity: 2,
                  description: 'No face detected in webcam'
                });
              }
            }

            if (multipleFaces) {
              this.recordViolation({
                type: 'multiple_faces',
                severity: 4,
                description: 'Multiple faces detected'
              });
            }
          } catch (error) {
            console.error('Face detection error:', error);
          }
        }, 2000);
      } else {
        // Models not loaded - just mark webcam as active without face detection
        this.status.faceDetected = true; // Assume face is present if webcam is active
        this.notifyStatusChange();
        console.log('Webcam monitoring active without face detection (models not loaded)');
      }

    } catch (error) {
      console.error('Failed to start webcam monitoring:', error);
      this.recordViolation({
        type: 'webcam_access_denied',
        severity: 4,
        description: 'Failed to access webcam'
      });
    }
  }

  private stopWebcamMonitoring(): void {
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
      this.faceDetectionInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      document.body.removeChild(this.videoElement);
      this.videoElement = null;
    }

    if (this.canvasElement) {
      document.body.removeChild(this.canvasElement);
      this.canvasElement = null;
    }

    this.status.webcamActive = false;
    this.status.faceDetected = false;
    this.notifyStatusChange();
  }

  // Screen monitoring
  private startScreenMonitoring(): void {
    // Check for screen sharing indicators
    this.screenCheckInterval = window.setInterval(async () => {
      try {
        // Check if screen sharing is active (limited browser support)
        const displays = await (navigator as Navigator & { getDisplayMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream> }).getDisplayMedia?.({ video: true });
        if (displays) {
          displays.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }

        // Alternative: Check for screen sharing extensions or indicators
        const isScreenSharing = this.detectScreenSharing();

        if (this.status.screenSharing !== isScreenSharing) {
          this.status.screenSharing = isScreenSharing;
          this.notifyStatusChange();

          if (isScreenSharing) {
            this.recordViolation({
              type: 'screen_sharing_detected',
              severity: 4,
              description: 'Screen sharing detected'
            });
          }
        }
      } catch {
        // Screen sharing detection not supported or failed
      }
    }, 5000);
  }

  private stopScreenMonitoring(): void {
    if (this.screenCheckInterval) {
      clearInterval(this.screenCheckInterval);
      this.screenCheckInterval = null;
    }
  }

  private detectScreenSharing(): boolean {
    // Check for common screen sharing indicators
    // This is a basic implementation - real detection would require more sophisticated methods
    // Check window titles, active applications, etc.
    // For now, return false as this requires native integration
    return false;
  }

  // Audio monitoring
  private startAudioMonitoring(): void {
    try {
      this.audioContext = new AudioContext();

      // Get microphone access
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const source = this.audioContext!.createMediaStreamSource(stream);
          const analyser = this.audioContext!.createAnalyser();
          analyser.fftSize = 256;

          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const checkAudio = () => {
            analyser.getByteFrequencyData(dataArray);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;

            // Detect significant audio (adjust threshold as needed)
            const hasAudio = average > 10;

            if (this.status.audioDetected !== hasAudio) {
              this.status.audioDetected = hasAudio;
              this.notifyStatusChange();

              if (hasAudio) {
                this.recordViolation({
                  type: 'audio_detected',
                  severity: 2,
                  description: 'Background audio detected'
                });
              }
            }

            if (this.audioContext?.state === 'running') {
              requestAnimationFrame(checkAudio);
            }
          };

          checkAudio();
        })
        .catch(error => {
          console.error('Failed to start audio monitoring:', error);
        });
    } catch (error) {
      console.error('Audio monitoring not supported:', error);
    }
  }

  private stopAudioMonitoring(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.status.audioDetected = false;
    this.notifyStatusChange();
  }

  // Record violation
  private recordViolation(violation: ViolationData): void {
    this.status.violations.push({
      ...violation,
      timestamp: new Date().toISOString()
    });

    // Increment warning count for severity 1-2
    if (violation.severity <= 2) {
      this.status.warningCount++;
    }

    this.notifyStatusChange();
    this.notifyViolation(violation);

    // Send to server
    if (this.socket && this.sessionToken) {
      this.socket.emit('proctoring-violation', {
        sessionToken: this.sessionToken,
        violation: {
          ...violation,
          timestamp: new Date().toISOString()
        },
        studentId: this.getCurrentUserId()
      });
    }

    // Check if should suspend
    if (this.config && violation.severity >= this.config.auto_suspend_severity && !this.config.suspension_requires_teacher) {
      this.suspendSession(`Auto-suspended due to ${violation.type} violation`);
    }
  }

  // Suspend session
  suspendSession(reason: string): void {
    this.status.isSuspended = true;
    this.notifyStatusChange();

    if (this.socket && this.sessionToken) {
      this.socket.emit('proctoring-suspend', {
        sessionToken: this.sessionToken,
        reason,
        suspendedBy: 'system'
      });
    }
  }

  // Resume session
  resumeSession(): void {
    this.status.isSuspended = false;
    this.status.warningCount = 0; // Reset warnings
    this.notifyStatusChange();

    if (this.socket && this.sessionToken) {
      this.socket.emit('proctoring-resume', {
        sessionToken: this.sessionToken,
        resumedBy: 'system'
      });
    }
  }

  // Status change callbacks
  onStatusChange(callback: (status: ProctoringStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(callback => callback({ ...this.status }));
  }

  // Violation callbacks
  onViolation(callback: (violation: ViolationData) => void): void {
    this.violationCallbacks.push(callback);
  }

  private notifyViolation(violation: ViolationData): void {
    this.violationCallbacks.forEach(callback => callback(violation));
  }

  // Get current status
  getStatus(): ProctoringStatus {
    return { ...this.status };
  }

  // Utility methods
  private getCurrentUserId(): number {
    // This should be implemented to get current user ID from auth context
    // For now, return a placeholder
    return 1;
  }

  // Enter fullscreen
  async enterFullscreen(): Promise<void> {
    try {
      const element = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        mozRequestFullScreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
      };

      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const proctoringService = new ProctoringService();