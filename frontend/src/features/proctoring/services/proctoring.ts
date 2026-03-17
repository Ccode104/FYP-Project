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
  private sessionId: number | null = null;
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
    gracePeriodTimeLeft: 0,
  };

  private statusCallbacks: ((status: ProctoringStatus) => void)[] = [];
  private violationCallbacks: ((violation: ViolationData) => void)[] = [];

  private faceDetectionInterval: number | null = null;
  private screenCheckInterval: number | null = null;
  private fullscreenCheckInterval: number | null = null;
  private visibilityHandler: (() => void) | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  private gracePeriodTimeout: number | null = null;
  private gracePeriodInterval: number | null = null;

  private modelsLoaded = false;

  private lastUserInteraction = 0;
  private userGestureEventsBound = false;

  constructor() {
    void this.initializeFaceDetection();
    this.initializeUserGestureTracking();
  }

  private async initializeFaceDetection() {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      this.modelsLoaded = true;
    } catch (error) {
      console.warn('Face detection models not available, webcam monitoring will be limited:', error);
      this.modelsLoaded = false;
    }
  }

  private initializeUserGestureTracking(): void {
    if (this.userGestureEventsBound) return;

    const events = ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown'];
    const updateInteraction = () => {
      this.lastUserInteraction = Date.now();
    };

    events.forEach((event) => {
      document.addEventListener(event, updateInteraction, { passive: true });
    });

    this.userGestureEventsBound = true;
  }

  async initializeSession(
    sessionToken: string,
    config: ProctoringConfig,
    userType: 'student' | 'teacher' | 'admin' = 'student',
    sessionId?: number,
  ): Promise<void> {
    this.sessionToken = sessionToken;
    this.sessionId = sessionId || null;
    this.config = config;

    const socketUrl = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:4000';

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('auth:token') },
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not initialized'));

      this.socket.on('connect', () => {
        this.socket?.emit('join-proctoring-session', {
          sessionToken: this.sessionToken,
          userId: this.getCurrentUserId(),
          userType,
        });

        this.status.isConnected = true;
        this.notifyStatusChange();
        resolve();
      });

      this.socket.on('disconnect', () => {
        this.status.isConnected = false;
        this.notifyStatusChange();
      });

      this.socket.on('session-suspended', () => {
        this.status.isSuspended = true;
        this.notifyStatusChange();
      });

      this.socket.on('session-resumed', () => {
        this.status.isSuspended = false;
        this.notifyStatusChange();
      });

      this.socket.on('connect_error', (error) => {
        this.status.isConnected = false;
        this.notifyStatusChange();
        reject(error);
      });
    });
  }

  async startMonitoring(): Promise<void> {
    if (!this.config) throw new Error('Proctoring config not set');

    await this.enterFullscreen();
    this.startFullscreenMonitoring();
    this.startVisibilityMonitoring();

    if (this.config.webcam_required) {
      await this.startWebcamMonitoring();
    }
    if (this.config.screen_monitoring) {
      this.startScreenMonitoring();
    }
    if (this.config.audio_monitoring) {
      this.startAudioMonitoring();
    }
  }

  stopMonitoring(): void {
    this.stopFullscreenMonitoring();
    this.stopVisibilityMonitoring();
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

  startGracePeriod(violation: ViolationData, durationSeconds: number = 5): void {
    this.clearGracePeriod();

    this.status.gracePeriodActive = true;
    this.status.gracePeriodTimeLeft = durationSeconds;
    this.status.gracePeriodViolation = violation;
    this.notifyStatusChange();

    this.gracePeriodInterval = window.setInterval(() => {
      this.status.gracePeriodTimeLeft--;
      this.notifyStatusChange();

      if (this.status.gracePeriodTimeLeft <= 0) {
        this.endGracePeriod(true);
      }
    }, 1000);

    this.gracePeriodTimeout = window.setTimeout(() => {
      this.endGracePeriod(true);
    }, durationSeconds * 1000);
  }

  returnToFullscreen(): Promise<void> {
    return this.enterFullscreen().then(() => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as Document & { msFullscreenElement?: Element }).msFullscreenElement
      );

      if (isFullscreen) {
        this.endGracePeriod(false);
        this.status.isFullscreen = true;
        this.notifyStatusChange();
      }
    });
  }

  private endGracePeriod(forceSuspend: boolean = false): void {
    const previousViolation = this.status.gracePeriodViolation;
    this.clearGracePeriod();

    if (previousViolation) {
      if (forceSuspend) {
        void this.suspendSession(`Auto-suspended due to unrecovered ${previousViolation.type} violation`);
      } else {
        this.recordViolation(previousViolation);
      }
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
          if (!this.status.gracePeriodActive) {
            this.startGracePeriod(
              {
                type: 'fullscreen_exit',
                severity: 3,
                description: 'Exited fullscreen mode',
              },
              5,
            );
          }
        } else if (this.status.gracePeriodActive && this.status.gracePeriodViolation?.type === 'fullscreen_exit') {
          this.endGracePeriod(false);
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

  private startVisibilityMonitoring(): void {
    this.visibilityHandler = () => {
      if (document.hidden) {
        if (!this.status.gracePeriodActive) {
          this.startGracePeriod(
            {
              type: 'tab_switch',
              severity: 3,
              description: 'Switched to another tab or minimized window',
            },
            5,
          );
        }
      } else if (this.status.gracePeriodActive && this.status.gracePeriodViolation?.type === 'tab_switch') {
        this.endGracePeriod(false);
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.visibilityHandler();
  }

  private stopVisibilityMonitoring(): void {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  private async startWebcamMonitoring(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
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

      if (this.modelsLoaded) {
        this.faceDetectionInterval = window.setInterval(async () => {
          if (!this.videoElement) return;

          try {
            const detections = await faceapi.detectAllFaces(this.videoElement, new faceapi.TinyFaceDetectorOptions());

            const hasFace = detections.length > 0;
            const multipleFaces = detections.length > 1;

            if (this.status.faceDetected !== hasFace) {
              this.status.faceDetected = hasFace;
              this.notifyStatusChange();

              if (!hasFace) {
                if (!this.status.gracePeriodActive) {
                  this.startGracePeriod(
                    {
                      type: 'face_not_detected',
                      severity: 3,
                      description: 'No face detected in webcam',
                    },
                    5,
                  );
                }
              } else if (this.status.gracePeriodActive && this.status.gracePeriodViolation?.type === 'face_not_detected') {
                this.endGracePeriod(false);
              }
            }

            if (multipleFaces) {
              this.recordViolation({
                type: 'multiple_faces',
                severity: 4,
                description: 'Multiple faces detected',
              });
            }
          } catch (error) {
            console.error('Face detection error:', error);
          }
        }, 2000);
      } else {
        this.status.faceDetected = true;
        this.notifyStatusChange();
      }
    } catch (error) {
      console.error('Failed to start webcam monitoring:', error);
      this.recordViolation({
        type: 'webcam_access_denied',
        severity: 4,
        description: 'Failed to access webcam',
      });
    }
  }

  private stopWebcamMonitoring(): void {
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
      this.faceDetectionInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
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

  private startScreenMonitoring(): void {
    this.screenCheckInterval = window.setInterval(async () => {
      try {
        const displays = await (
          navigator as Navigator & { getDisplayMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream> }
        ).getDisplayMedia?.({ video: true });
        if (displays) {
          displays.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }

        const isScreenSharing = this.detectScreenSharing();

        if (this.status.screenSharing !== isScreenSharing) {
          this.status.screenSharing = isScreenSharing;
          this.notifyStatusChange();

          if (isScreenSharing) {
            this.recordViolation({
              type: 'screen_sharing_detected',
              severity: 4,
              description: 'Screen sharing detected',
            });
          }
        }
      } catch {
        // not supported
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
    return false;
  }

  private startAudioMonitoring(): void {
    try {
      this.audioContext = new AudioContext();

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const source = this.audioContext!.createMediaStreamSource(stream);
          const analyser = this.audioContext!.createAnalyser();
          analyser.fftSize = 256;

          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const checkAudio = () => {
            analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;

            const hasAudio = average > 10;

            if (this.status.audioDetected !== hasAudio) {
              this.status.audioDetected = hasAudio;
              this.notifyStatusChange();

              if (hasAudio) {
                this.recordViolation({
                  type: 'audio_detected',
                  severity: 2,
                  description: 'Background audio detected',
                });
              }
            }

            if (this.audioContext?.state === 'running') {
              requestAnimationFrame(checkAudio);
            }
          };

          checkAudio();
        })
        .catch((error) => {
          console.error('Failed to start audio monitoring:', error);
        });
    } catch (error) {
      console.error('Audio monitoring not supported:', error);
    }
  }

  private stopAudioMonitoring(): void {
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
    this.status.audioDetected = false;
    this.notifyStatusChange();
  }

  recordViolation(violation: ViolationData): void {
    this.status.violations.push({
      ...violation,
      timestamp: new Date().toISOString(),
    });

    if (violation.severity >= 3) {
      this.status.warningCount++;
    }

    this.notifyStatusChange();
    this.notifyViolation(violation);

    if (this.socket && this.sessionToken) {
      this.socket.emit('proctoring-violation', {
        sessionToken: this.sessionToken,
        violation: {
          ...violation,
          timestamp: new Date().toISOString(),
        },
        studentId: this.getCurrentUserId(),
      });
    }

    if (this.config && this.status.warningCount >= this.config.max_warnings && !this.config.suspension_requires_teacher) {
      void this.suspendSession(`Auto-suspended due to ${this.status.warningCount} accumulated recovered violations`);
    }
  }

  async suspendSession(reason: string): Promise<void> {
    this.status.isSuspended = true;
    this.notifyStatusChange();

    if (this.socket && this.sessionToken) {
      this.socket.emit('proctoring-suspend', {
        sessionToken: this.sessionToken,
        reason,
        suspendedBy: 'system',
      });
      return;
    }

    if (this.sessionId) {
      try {
        const { suspendSession: apiSuspend } = await import('../api/proctoringApi');
        await apiSuspend(this.sessionId, reason);
      } catch (error) {
        console.error('Failed to suspend via API:', error);
      }
    }
  }

  resumeSession(): void {
    this.status.isSuspended = false;
    this.status.warningCount = 0;
    this.notifyStatusChange();

    if (this.socket && this.sessionToken) {
      this.socket.emit('proctoring-resume', {
        sessionToken: this.sessionToken,
        resumedBy: 'system',
      });
    }
  }

  onStatusChange(callback: (status: ProctoringStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach((callback) => callback({ ...this.status }));
  }

  onViolation(callback: (violation: ViolationData) => void): void {
    this.violationCallbacks.push(callback);
  }

  private notifyViolation(violation: ViolationData): void {
    this.violationCallbacks.forEach((callback) => callback(violation));
  }

  getStatus(): ProctoringStatus {
    return { ...this.status };
  }

  private getCurrentUserId(): number {
    try {
      const userStr = localStorage.getItem('auth:user');
      if (userStr) {
        const user = JSON.parse(userStr) as { id?: number };
        return user.id || 1;
      }

      const token = localStorage.getItem('auth:token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1])) as { id?: number };
        return payload.id || 1;
      }
    } catch (error) {
      console.warn('Could not get current user ID:', error);
    }

    return 1;
  }

  private hasRecentUserGesture(): boolean {
    const now = Date.now();
    const recentThreshold = 30000;
    return now - this.lastUserInteraction < recentThreshold;
  }

  private isCurrentlyFullscreen(): boolean {
    return !!(
      document.fullscreenElement ||
      (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
      (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
      (document as Document & { msFullscreenElement?: Element }).msFullscreenElement
    );
  }

  private async waitForFullscreen(timeout: number = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.isCurrentlyFullscreen()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error('Fullscreen state not confirmed within timeout');
  }

  private async requestFullscreen(): Promise<void> {
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
    } else {
      throw new Error('Fullscreen API not supported');
    }
  }

  private isRecoverableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    return message.includes('timeout') || message.includes('network') || message.includes('temporarily') || message.includes('busy');
  }

  private getFullscreenErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) return 'Unknown fullscreen error';

    const message = error.message.toLowerCase();

    if (message.includes('not allowed') || message.includes('denied')) {
      return 'Browser blocked fullscreen. Please check your browser settings and allow fullscreen for this site.';
    }
    if (message.includes('not supported')) {
      return 'Your browser does not support fullscreen mode.';
    }
    if (message.includes('timeout')) {
      return 'Fullscreen request timed out. Please try again.';
    }
    return 'Failed to enter fullscreen mode. Please try again or contact support.';
  }

  async enterFullscreen(options: { retryCount?: number; timeout?: number } = {}): Promise<void> {
    const { retryCount = 0, timeout = 5000 } = options;
    const maxRetries = 3;

    if (this.isCurrentlyFullscreen()) return;

    if (!this.hasRecentUserGesture()) {
      throw new Error('User gesture required for fullscreen. Please interact with the page first.');
    }

    try {
      const fullscreenPromise = this.requestFullscreen();
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Fullscreen request timeout')), timeout));

      await Promise.race([fullscreenPromise, timeoutPromise]);
      await this.waitForFullscreen(5000);
    } catch (error) {
      if (retryCount < maxRetries && this.isRecoverableError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.enterFullscreen({ ...options, retryCount: retryCount + 1 });
      }

      this.recordViolation({
        type: 'fullscreen_denied',
        severity: 2,
        description: 'Browser denied fullscreen request - proctoring compromised',
      });

      const errorMessage = this.getFullscreenErrorMessage(error);
      throw new Error(`Fullscreen is required for proctored quizzes. ${errorMessage}`);
    }
  }
}

export const proctoringService = new ProctoringService();

