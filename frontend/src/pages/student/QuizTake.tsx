import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getQuiz, submitQuizAttempt, Quiz } from '../../services/quizzes'
import { useToast } from '../../components/ToastProvider'
import { proctoringService } from '../../services/proctoring'
import type { ProctoringConfig, ProctoringStatus } from '../../services/proctoring'
import { createProctoringSession, getProctoringConfig } from '../../services/proctoringApi'
import FullscreenInstructions from '../../components/FullscreenInstructions'

export default function QuizTake() {
   const { quizId } = useParams()
   const navigate = useNavigate()
   const { user } = useAuth()
   const { push } = useToast()

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // answers keyed by question id
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    score: number | null;
    needs_manual_grading: boolean;
    proctoring_result?: {
      violated: boolean;
      total_violations: number;
      critical_violations: number;
      score_penalty: number;
      final_score: number | null;
    }
  } | null>(null)
  const [gradedAnswers, setGradedAnswers] = useState<Record<number, { student_answer: unknown; is_correct: boolean | null; correct_answer: unknown }>>({})

  // Proctoring state
   const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
   const [quizStarted, setQuizStarted] = useState(false)
   const [proctoringConfig, setProctoringConfig] = useState<ProctoringConfig | null>(null)
   const [proctoringStatus, setProctoringStatus] = useState<ProctoringStatus | null>(proctoringService.getStatus())
   const [proctoringSession, setProctoringSession] = useState<any>(null)
  const [isInitializingProctoring, setIsInitializingProctoring] = useState(false)
  const [checkingPermissions, setCheckingPermissions] = useState(false)
  const [permissionsGranted, setPermissionsGranted] = useState(false)
  const [showFullscreenInstructions, setShowFullscreenInstructions] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string>('')
  const [fullscreenRetryCount, setFullscreenRetryCount] = useState(0)
  const [timeExpiredCount, setTimeExpiredCount] = useState(0)
  const [isSuspended, setIsSuspended] = useState(false)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [resumeCountdown, setResumeCountdown] = useState(0)
  const submittedAttemptedRef = useRef(false)
  const sessionCheckInterval = useRef<number | null>(null)
  const resumeTimeout = useRef<number | null>(null)

  useEffect(() => {
    (async () => {
      if (!quizId) return
      try {
        const q = await getQuiz(Number(quizId))
        console.log('DEBUG: Loaded quiz:', { id: q.id, title: q.title, is_proctored: q.is_proctored, time_limit: q.time_limit })
        setQuiz(q)

        // Check if there's a suspended quiz attempt
        if (q.is_proctored && user) {
          console.log('DEBUG: Quiz is proctored, checking for suspended attempts and active sessions')
          try {
            // First check if student has any suspended quiz attempts for this quiz
            const suspendedAttemptsResponse = await fetch(`/api/quizzes/${q.id}/attempts/suspended/${user.id}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth:token')}`
              }
            });
            const suspendedAttemptsData = await suspendedAttemptsResponse.json();
            console.log('DEBUG: Suspended attempts check result:', suspendedAttemptsData)

            if (suspendedAttemptsData.hasSuspendedAttempt) {
              console.log('DEBUG: Student has suspended quiz attempt, preventing new attempt')
              setIsSuspended(true);
              setErr('This quiz attempt was suspended due to proctoring violations. Please contact your instructor for assistance.');
              return; // Prevent further loading
            }

            // Check for active/suspended proctoring sessions
            const activeSessionResponse = await fetch(`/api/proctoring/sessions/active/${user.id}/${q.id}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth:token')}`
              }
            });
            const activeSessionData = await activeSessionResponse.json();
            console.log('DEBUG: Active session check result:', activeSessionData)

            if (activeSessionData.session) {
              const session = activeSessionData.session;
              console.log('DEBUG: Found existing session:', { id: session.id, status: session.status })

              if (session.status === 'suspended') {
                console.log('DEBUG: Session is suspended, showing resume prompt')
                setIsSuspended(true);
                setShowResumePrompt(true);
                // Start 10-second countdown for auto-suspension
                setResumeCountdown(10);
                resumeTimeout.current = window.setTimeout(() => {
                  // Auto-suspend if not resumed
                  setShowResumePrompt(false);
                  setIsSuspended(true);
                  push({ kind: 'error', message: 'Quiz automatically suspended due to timeout.' });
                }, 10000);
              } else if (session.status === 'active') {
                console.log('DEBUG: Session is active, resuming quiz')
                // Resume existing active session
                setProctoringSession(session);
                setQuizStarted(true);
                // Continue with existing timer
                if (session.quiz_attempt_id) {
                  // Calculate remaining time based on server time
                  const attemptStart = new Date(session.attempt_started_at);
                  const now = new Date();
                  const elapsed = Math.floor((now.getTime() - attemptStart.getTime()) / 1000);
                  const totalLimit = q.time_limit * 60; // Convert to seconds
                  const remaining = Math.max(0, totalLimit - elapsed);
                  setTimeRemaining(remaining);
                  console.log('DEBUG: Resumed with remaining time:', remaining)
                }
              }
            } else {
              console.log('DEBUG: No existing session found, will show proctoring start screen')
            }
          } catch (error) {
            console.warn('DEBUG: Could not check suspended status:', error)
          }
        } else {
          console.log('DEBUG: Quiz is not proctored or no user logged in')
        }

        // Load proctoring configuration if quiz is proctored
        if (q.is_proctored) {
          console.log('DEBUG: Loading proctoring configuration')
          try {
            const configResponse = await getProctoringConfig(Number(quizId))
            setProctoringConfig(configResponse.config)
            console.log('DEBUG: Loaded proctoring config:', configResponse.config)
          } catch (configError) {
            console.warn('DEBUG: Failed to load proctoring config, using defaults:', configError)
            // Use default config
            setProctoringConfig({
              webcam_required: true,
              screen_monitoring: true,
              audio_monitoring: false,
              face_detection_required: true,
              max_warnings: 3,
              auto_suspend_severity: 3,
              allow_recovery: true,
              recovery_wait_seconds: 30,
              violation_score_penalty: 1.0,
              suspension_requires_teacher: true,
              live_monitoring_enabled: false,
              record_sessions: true
            })
          }
        }
      } catch (e: unknown) {
        const error = e as Error
        setErr(error?.message || 'Failed to load quiz')
      } finally {
        setLoading(false)
      }
    })()
  }, [quizId, user])

  // Permission checking functions
  const checkAndRequestPermissions = useCallback(async (): Promise<boolean> => {
    if (!proctoringConfig) return false;

    setCheckingPermissions(true);
    try {
      const permissions = [];

      // Check camera permission if webcam monitoring is required
      if (proctoringConfig.webcam_required) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (cameraPermission.state === 'denied') {
            throw new Error('Camera permission denied');
          }
          // Try to get camera access to trigger permission prompt
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false
          });
          stream.getTracks().forEach(track => track.stop()); // Stop immediately
          permissions.push('camera');
        } catch (error) {
          console.error('Camera permission error:', error);
          push({ kind: 'error', message: 'Camera access is required for this proctored quiz. Please enable camera permissions and try again.' });
          return false;
        }
      }

      // Check microphone permission if audio monitoring is required
      if (proctoringConfig.audio_monitoring) {
        try {
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (micPermission.state === 'denied') {
            throw new Error('Microphone permission denied');
          }
          // Try to get microphone access to trigger permission prompt
          const stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
          stream.getTracks().forEach(track => track.stop()); // Stop immediately
          permissions.push('microphone');
        } catch (error) {
          console.error('Microphone permission error:', error);
          push({ kind: 'error', message: 'Microphone access is required for this proctored quiz. Please enable microphone permissions and try again.' });
          return false;
        }
      }

      setPermissionsGranted(true);
      console.log('Permissions granted:', permissions);
      return true;
    } catch (error) {
      console.error('Permission check failed:', error);
      push({ kind: 'error', message: 'Failed to check permissions. Please refresh and try again.' });
      return false;
    } finally {
      setCheckingPermissions(false);
    }
  }, [proctoringConfig, push]);

  // Proctoring functions - using advanced proctoring service
   const initializeAdvancedProctoring = useCallback(async () => {
     if (!quiz || !user || !proctoringConfig) {
       console.log('DEBUG: Cannot initialize proctoring - missing requirements:', { quiz: !!quiz, user: !!user, proctoringConfig: !!proctoringConfig })
       return
     }

     console.log('DEBUG: Starting proctoring initialization')
     let session = null
     let sessionToken = null

     try {
       setIsInitializingProctoring(true)

       // Create proctoring session on backend
       console.log('DEBUG: Creating proctoring session on backend')
       session = await createProctoringSession({
         quiz_id: Number(quiz.id),
         student_id: Number(user.id),
         device_info: {
           userAgent: navigator.userAgent,
           platform: navigator.platform,
           language: navigator.language,
           screenResolution: `${screen.width}x${screen.height}`,
           timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
         },
         browser_info: {
           cookiesEnabled: navigator.cookieEnabled,
           online: navigator.onLine,
           hardwareConcurrency: navigator.hardwareConcurrency
         },
         webcam_enabled: proctoringConfig.webcam_required,
         screen_monitoring_enabled: proctoringConfig.screen_monitoring,
         audio_monitoring_enabled: proctoringConfig.audio_monitoring
       })
       console.log('DEBUG: Created proctoring session:', session)

       setProctoringSession(session)

       // Generate session token for WebSocket connection
       sessionToken = session.session_token
       console.log('DEBUG: Session token:', sessionToken)

       // Initialize proctoring service
       console.log('DEBUG: Initializing proctoring service')
       await proctoringService.initializeSession(sessionToken, proctoringConfig, 'student', session.id)
       console.log('DEBUG: Proctoring service initialized')

     } catch (error) {
       console.error('DEBUG: Failed to initialize proctoring service:', error)
       // Continue with local monitoring even if WebSocket fails
       console.log('DEBUG: Continuing with local monitoring despite WebSocket failure')
     }

     // Always set up listeners and monitoring, even if WebSocket failed
     try {
       // Set up status change listener
       proctoringService.onStatusChange((status) => {
         console.log('DEBUG: Proctoring status changed:', status)
         setProctoringStatus(status)

         // Handle suspension
         if (status.isSuspended && !submittedAttemptedRef.current) {
           submittedAttemptedRef.current = true
           console.log('DEBUG: Quiz suspended, showing suspended UI')
           setIsSuspended(true)
           push({ kind: 'error', message: 'Quiz suspended due to proctoring violations. Contact your instructor.' })
         }
       })

       // Set up violation listener
       proctoringService.onViolation((violation) => {
         console.log('DEBUG: Violation detected:', violation)
         if (violation.severity >= 3) {
           push({ kind: 'error', message: `Critical violation: ${violation.description}` })
         } else if (violation.severity === 2) {
           push({ kind: 'info', message: `Warning: ${violation.description}` })
         }
       })

       console.log('DEBUG: Proctoring listeners set up')
     } catch (listenerError) {
       console.error('DEBUG: Failed to set up proctoring listeners:', listenerError)
     } finally {
       setIsInitializingProctoring(false)
     }
   }, [quiz, user, proctoringConfig, push])

  const retryFullscreen = useCallback(async () => {
    setFullscreenRetryCount(prev => prev + 1)
    setShowFullscreenInstructions(false)
    await startAdvancedProctoring()
  }, [])

  const confirmManualFullscreen = useCallback(async () => {
    // Check if user has manually enabled fullscreen
    const isFullscreen = !!(
      document.fullscreenElement ||
      (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
      (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
      (document as Document & { msFullscreenElement?: Element }).msFullscreenElement
    )

    if (isFullscreen) {
      setShowFullscreenInstructions(false)
      // Continue with quiz start
      await continueQuizStart()
    } else {
      push({ kind: 'error', message: 'Fullscreen is still not detected. Please enable fullscreen and try again.' })
    }
  }, [push])

  const continueQuizStart = useCallback(async () => {
    try {
      // Check fullscreen status before starting
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as Document & { msFullscreenElement?: Element }).msFullscreenElement
      )

      console.log('DEBUG: continueQuizStart called')
      console.log('DEBUG: Fullscreen status at quiz start:', {
        isCurrentlyFullscreen,
        fullscreenElement: !!document.fullscreenElement,
        webkitFullscreenElement: !!(document as unknown).webkitFullscreenElement,
        mozFullScreenElement: !!(document as unknown).mozFullScreenElement,
        msFullscreenElement: !!(document as unknown).msFullscreenElement
      })

      if (!isCurrentlyFullscreen) {
        console.warn('DEBUG: WARNING - Quiz starting without fullscreen!')
        push({ kind: 'info', message: 'Quiz started without fullscreen. This may result in proctoring violations.' })
      }

      // Initialize timer if time limit exists
      if (quiz?.time_limit) {
        setTimeRemaining(quiz.time_limit * 60) // Convert minutes to seconds
      }

      // Initialize advanced proctoring
      await initializeAdvancedProctoring()

      // Start monitoring
      await proctoringService.startMonitoring()

      setQuizStarted(true)
      console.log('DEBUG: Quiz started successfully')
    } catch (error) {
      console.error('DEBUG: Failed to continue quiz start:', error)
      push({ kind: 'error', message: 'Failed to start quiz. Please try again.' })
      setQuizStarted(false)
    }
  }, [quiz?.time_limit, initializeAdvancedProctoring, push])


  const startAdvancedProctoring = useCallback(async () => {
    console.log('DEBUG: startAdvancedProctoring called')
    if (!quiz?.is_proctored || !proctoringConfig) {
      console.log('DEBUG: Cannot start proctoring - requirements not met:', { is_proctored: quiz?.is_proctored, proctoringConfig: !!proctoringConfig })
      return
    }

    console.log('DEBUG: Starting advanced proctoring with enhanced fullscreen')
    console.log('DEBUG: Browser user agent:', navigator.userAgent)
    console.log('DEBUG: Current fullscreen state before request:', {
      fullscreenElement: !!document.fullscreenElement,
      webkitFullscreenElement: !!(document as unknown).webkitFullscreenElement,
      mozFullScreenElement: !!(document as unknown).mozFullScreenElement,
      msFullscreenElement: !!(document as unknown).msFullscreenElement
    })

    try {
      // Request fullscreen synchronously in response to user gesture
      const element = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        mozRequestFullScreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
      };

      console.log('DEBUG: Attempting to request fullscreen')
      console.log('DEBUG: Available fullscreen methods:', {
        requestFullscreen: !!element.requestFullscreen,
        webkitRequestFullscreen: !!element.webkitRequestFullscreen,
        mozRequestFullScreen: !!element.mozRequestFullScreen,
        msRequestFullscreen: !!element.msRequestFullscreen
      })

      let fullscreenPromise: Promise<void>;
      if (element.requestFullscreen) {
        console.log('DEBUG: Using standard requestFullscreen')
        fullscreenPromise = element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        console.log('DEBUG: Using webkitRequestFullscreen')
        fullscreenPromise = element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        console.log('DEBUG: Using mozRequestFullScreen')
        fullscreenPromise = element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        console.log('DEBUG: Using msRequestFullscreen')
        fullscreenPromise = element.msRequestFullscreen();
      } else {
        throw new Error('Fullscreen API not supported');
      }

      console.log('DEBUG: Awaiting fullscreen promise')
      await fullscreenPromise;
      console.log('DEBUG: Fullscreen promise resolved')

      // Wait for fullscreen state to be confirmed
      console.log('DEBUG: Waiting for fullscreen state confirmation')
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds
      while (attempts < maxAttempts) {
        const isFullscreen = !!(
          document.fullscreenElement ||
          (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
          (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
          (document as Document & { msFullscreenElement?: Element }).msFullscreenElement
        );

        console.log(`DEBUG: Fullscreen check attempt ${attempts + 1}/${maxAttempts}:`, {
          isFullscreen,
          fullscreenElement: !!document.fullscreenElement,
          webkitFullscreenElement: !!(document as unknown).webkitFullscreenElement,
          mozFullScreenElement: !!(document as unknown).mozFullScreenElement,
          msFullscreenElement: !!(document as unknown).msFullscreenElement
        })

        if (isFullscreen) {
          console.log('DEBUG: Fullscreen confirmed successfully')
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.error('DEBUG: Fullscreen confirmation timeout after', maxAttempts * 100, 'ms')
        throw new Error('Fullscreen state not confirmed within timeout');
      }

      console.log('DEBUG: Fullscreen confirmed, proceeding with quiz start')
      // If fullscreen succeeded, continue with quiz
      await continueQuizStart()

    } catch (error) {
      console.error('DEBUG: Automatic fullscreen failed:', error)
      console.error('DEBUG: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack'
      })

      // Show instructions for manual fullscreen setup
      if (error instanceof Error) {
        setFullscreenError(error.message)
      } else {
        setFullscreenError('Failed to enter fullscreen mode')
      }
      setShowFullscreenInstructions(true)
    }
  }, [quiz?.is_proctored, proctoringConfig, continueQuizStart])

  // Function to force fullscreen during quiz
  const forceFullscreenDuringQuiz = useCallback(async () => {
    console.log('DEBUG: Attempting to force fullscreen during quiz')
    try {
      const element = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        mozRequestFullScreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
      };

      let fullscreenPromise: Promise<void>;
      if (element.requestFullscreen) {
        fullscreenPromise = element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        fullscreenPromise = element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        fullscreenPromise = element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        fullscreenPromise = element.msRequestFullscreen();
      } else {
        throw new Error('Fullscreen API not supported');
      }

      await fullscreenPromise;

      // Wait for fullscreen state to be confirmed
      let attempts = 0;
      const maxAttempts = 50;
      while (attempts < maxAttempts) {
        const isFullscreen = !!(
          document.fullscreenElement ||
          (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
          (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
          (document as Document & { msFullscreenElement?: Element }).msFullscreenElement
        );

        if (isFullscreen) {
          console.log('DEBUG: Successfully forced fullscreen during quiz')
          push({ kind: 'success', message: 'Quiz returned to fullscreen mode' })
          return true;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      console.log('DEBUG: Failed to confirm fullscreen during quiz')
      return false;
    } catch (error) {
      console.error('DEBUG: Failed to force fullscreen during quiz:', error)
      return false;
    }
  }, [push])

  // Timer effect - with enhanced time expiration handling
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && quizStarted && !result) {
      const timer = window.setTimeout(() => {
        setTimeRemaining(prev => {
          if (prev !== null && prev <= 1) {
            // Time expired - handle with grace period and fullscreen enforcement
            setTimeExpiredCount(current => {
              const newCount = current + 1;
              console.log(`DEBUG: Time expired ${newCount} time(s)`)

              if (newCount >= 2) {
                // Second time - suspend the session and show suspended UI
                console.log('DEBUG: Second time expired - suspending quiz')

                const suspendViaAPI = async () => {
                  if (proctoringSession?.id) {
                    try {
                      const { suspendSession: apiSuspend } = await import('../../services/proctoringApi')
                      await apiSuspend(proctoringSession.id, 'Quiz time expired (2 attempts)')
                      console.log('DEBUG: Session suspended via API')
                      return true
                    } catch (error) {
                      console.error('DEBUG: Failed to suspend via API:', error)
                      return false
                    }
                  }
                  return false
                }

                suspendViaAPI().then((apiSuccess) => {
                  if (apiSuccess) {
                    setIsSuspended(true)
                    push({ kind: 'error', message: 'Quiz suspended due to time expiration. Contact your instructor.' })
                  } else {
                    proctoringService.suspendSession('Quiz time expired (2 attempts)').then(() => {
                      setIsSuspended(true)
                      push({ kind: 'error', message: 'Quiz suspended due to time expiration. Contact your instructor.' })
                    }).catch((error) => {
                      console.error('DEBUG: Failed to suspend via service:', error)
                      setIsSuspended(true)
                      push({ kind: 'error', message: 'Quiz suspended due to time expiration. Contact your instructor.' })
                    })
                  }
                })
                return newCount;
              } else {
                // First time - try to force fullscreen
                console.log('DEBUG: First time expired - attempting to force fullscreen')
                forceFullscreenDuringQuiz().then(success => {
                  if (success) {
                    push({ kind: 'info', message: 'Time expired! Quiz returned to fullscreen mode.' })
                  } else {
                    // Failed to force fullscreen - suspend immediately and show suspended UI
                    const suspendViaAPI = async () => {
                      if (proctoringSession?.id) {
                        try {
                          const { suspendSession: apiSuspend } = await import('../../services/proctoringApi')
                          await apiSuspend(proctoringSession.id, 'Quiz time expired and fullscreen could not be restored')
                          console.log('DEBUG: Session suspended via API')
                          return true
                        } catch (error) {
                          console.error('DEBUG: Failed to suspend via API:', error)
                          return false
                        }
                      }
                      return false
                    }
 
                    suspendViaAPI().then((apiSuccess) => {
                      if (apiSuccess) {
                        setIsSuspended(true)
                        push({ kind: 'error', message: 'Quiz suspended - could not restore fullscreen mode. Contact your instructor.' })
                      } else {
                        proctoringService.suspendSession('Quiz time expired and fullscreen could not be restored').then(() => {
                          setIsSuspended(true)
                          push({ kind: 'error', message: 'Quiz suspended - could not restore fullscreen mode. Contact your instructor.' })
                        }).catch((error) => {
                          console.error('DEBUG: Failed to suspend via service, setting suspended anyway:', error)
                          setIsSuspended(true)
                          push({ kind: 'error', message: 'Quiz suspended - could not restore fullscreen mode. Contact your instructor.' })
                        })
                      }
                    })
                  }
                });
                return newCount;
              }
            });
            return 0;
          }
          return prev ? prev - 1 : null
        })
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [timeRemaining, quizStarted, result, forceFullscreenDuringQuiz, push])



  // Navigation protection and cheating prevention - prevent accidental navigation and common cheating methods during quiz
  useEffect(() => {
    if (!quizStarted || result) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Start grace period for navigation attempt
      if (!proctoringStatus?.gracePeriodActive) {
        proctoringService.startGracePeriod({
          type: 'navigation_attempt',
          severity: 3,
          description: 'Attempted to refresh or navigate away'
        }, 5)
      }

      // Show confirmation dialog
      e.preventDefault()
      e.returnValue = 'Are you sure you want to leave? Your quiz progress may be lost.'
      return e.returnValue
    }

    const handlePopState = (e: PopStateEvent) => {
      // Suspend quiz immediately on back button press
      if (!submittedAttemptedRef.current) {
        submittedAttemptedRef.current = true
        console.log('DEBUG: Back button pressed - suspending quiz immediately')

        // Always try API first using sessionId from component state
        const suspendViaAPI = async () => {
          if (proctoringSession?.id) {
            try {
              const { suspendSession: apiSuspend } = await import('../../services/proctoringApi')
              await apiSuspend(proctoringSession.id, 'Back button pressed during quiz')
              console.log('DEBUG: Session suspended via API')
              return true
            } catch (error) {
              console.error('DEBUG: Failed to suspend via API:', error)
              return false
            }
          }
          return false
        }

        // Try API first, then service as backup
        suspendViaAPI().then((apiSuccess) => {
          if (apiSuccess) {
            setIsSuspended(true)
            push({ kind: 'error', message: 'Quiz suspended due to navigation attempt. Contact your instructor.' })
          } else {
            // Fallback to service
            proctoringService.suspendSession('Back button pressed during quiz').then(() => {
              setIsSuspended(true)
              push({ kind: 'error', message: 'Quiz suspended due to navigation attempt. Contact your instructor.' })
            }).catch((error) => {
              console.error('DEBUG: Failed to suspend via service:', error)
              setIsSuspended(true)
              push({ kind: 'error', message: 'Quiz suspended due to navigation attempt. Contact your instructor.' })
            })
          }
        })
      }
      // Prevent the navigation
      window.history.pushState(null, '', window.location.href)
    }

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent right-click context menu
      e.preventDefault()
      proctoringService.recordViolation({
        type: 'right_click_attempt',
        severity: 2,
        description: 'Attempted to open context menu (right-click)'
      })
    }

    const handleCopy = (e: ClipboardEvent) => {
      // Prevent copy
      e.preventDefault()
      proctoringService.recordViolation({
        type: 'copy_attempt',
        severity: 2,
        description: 'Attempted to copy content'
      })
    }

    const handlePaste = (e: ClipboardEvent) => {
      // Prevent paste
      e.preventDefault()
      proctoringService.recordViolation({
        type: 'paste_attempt',
        severity: 2,
        description: 'Attempted to paste content'
      })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common cheating shortcuts
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase()
        if (['c', 'v', 'x', 'a', 'u', 'i', 'j', 'p', 's', 't', 'w', 'r', 'f', 'n', 'g', 'h', 'l'].includes(key)) {
          e.preventDefault()
          proctoringService.recordViolation({
            type: 'keyboard_shortcut',
            severity: 2,
            description: `Attempted keyboard shortcut: Ctrl+${key.toUpperCase()}`
          })
        }
      }

      // Prevent F12 (dev tools)
      if (e.key === 'F12') {
        e.preventDefault()
        proctoringService.recordViolation({
          type: 'dev_tools_attempt',
          severity: 3,
          description: 'Attempted to open developer tools (F12)'
        })
      }

      // Prevent F11 (fullscreen toggle)
      if (e.key === 'F11') {
        e.preventDefault()
        proctoringService.recordViolation({
          type: 'fullscreen_toggle_attempt',
          severity: 2,
          description: 'Attempted to toggle fullscreen with F11'
        })
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('keydown', handleKeyDown)

    // Prevent back button by pushing current state
    window.history.pushState(null, '', window.location.href)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [quizStarted, result, proctoringStatus?.gracePeriodActive])

  // Heartbeat mechanism to keep session alive
  useEffect(() => {
    if (!quizStarted || !proctoringSession) return

    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/proctoring/sessions/${proctoringSession.id}/heartbeat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth:token')}`
          }
        })
      } catch (error) {
        console.warn('Heartbeat failed:', error)
      }
    }

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(sendHeartbeat, 30000)

    // Send initial heartbeat
    sendHeartbeat()

    return () => clearInterval(heartbeatInterval)
  }, [quizStarted, proctoringSession])

  // Stop proctoring when quiz submission starts or is submitted
  useEffect(() => {
    if (result || submitting) {
      proctoringService.stopMonitoring()
    }
  }, [result, submitting])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      proctoringService.stopMonitoring()
      // Clear any pending timeouts
      if (resumeTimeout.current) {
        clearTimeout(resumeTimeout.current)
      }
    }
  }, [])


  const canSubmit = useMemo(() => {
    if (!quiz) return false
    // require an answer for each question
    return quiz.questions.every((q) => {
      const a = answers[q.id]
      if (q.question_type === 'short') return typeof a === 'string' && a.trim().length > 0
      return a !== undefined && a !== null && a !== ''
    })
  }, [quiz, answers])

  const handleSubmit = async (violated = false) => {
    if (!quiz || !user || submitting || result) return
    setSubmitting(true)
    try {
      const res = await submitQuizAttempt({
        quiz_id: quiz.id,
        student_id: Number(user.id),
        answers,
        proctoring_session_id: proctoringSession?.id
      })

      setResult({
        score: res.attempt.score,
        needs_manual_grading: res.needs_manual_grading,
        proctoring_result: res.proctoring_result
      })
      setGradedAnswers(res.graded_answers as unknown)

      if (res.proctoring_result?.violated) {
        push({
          kind: 'error',
          message: `Quiz submitted with violations. Score: 0 (penalized due to ${res.proctoring_result.critical_violations} critical violation(s))`
        })
      } else {
        push({ kind: 'success', message: 'Quiz submitted successfully' })
      }
    } catch (e: unknown) {
      const error = e as Error
      push({ kind: 'error', message: error?.message || 'Submit failed' })
      // Don't reset submitting to prevent loops on repeated violations
    } finally {
      setSubmitting(false)
    }
  }

  const handleViolationSubmit = () => {
    handleSubmit(true)
  }

  if (loading) return <div className="container"><p className="muted">Loading…</p></div>
  if (err) return <div className="container"><div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>{err}</div></div>
  if (!quiz) return <div className="container"><p className="muted">Quiz not found</p></div>

  // Show suspended UI if quiz is suspended
  if (isSuspended) {
    return (
      <div className="container" style={{ maxWidth: 600, textAlign: 'center', padding: '40px 20px' }}>
        <div className="card" style={{ borderColor: '#ef4444', borderWidth: 2 }}>
          <div style={{ fontSize: '4em', marginBottom: '20px' }}>🚫</div>
          <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Quiz Suspended</h2>
          <p style={{ fontSize: '1.1em', marginBottom: '20px', color: '#6b7280' }}>
            This quiz has been suspended due to proctoring violations or other issues.
          </p>
          <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '8px', marginBottom: '20px', textAlign: 'left', border: '1px solid #fca5a5' }}>
            <strong style={{ color: '#991b1b' }}>What happened:</strong>
            <ul style={{ margin: '8px 0 0 20px', color: '#7f1d1d' }}>
              <li>The quiz was suspended due to a violation of proctoring rules</li>
              <li>All progress has been saved</li>
              <li>You cannot continue or resubmit this quiz</li>
            </ul>
          </div>
          <p style={{ fontSize: '1em', marginBottom: '24px' }}>
            <strong>Please contact your instructor for assistance.</strong>
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/courses/${quiz.course_offering_id}/quizzes`)}
            style={{ fontSize: '1.1em', padding: '12px 24px' }}
          >
            Return to Course Quizzes
          </button>
        </div>
      </div>
    )
  }

  // Show proctoring start screen for proctored quizzes
  if (quiz.is_proctored && !quizStarted) {
    return (
      <div className="container" style={{ maxWidth: 600 }}>
        <div className="card">
          <h2>Advanced Proctored Quiz</h2>
          <p>This quiz uses advanced proctoring technology. You must:</p>
          <ul style={{ marginLeft: 20, marginBottom: 20 }}>
            <li>Keep the browser in fullscreen mode</li>
            <li>Not switch tabs or minimize the window</li>
            <li>Not lose focus from this window</li>
            {proctoringConfig?.webcam_required && <li>Keep your face visible to the camera</li>}
            {proctoringConfig?.audio_monitoring && <li>Minimize background noise</li>}
            {quiz.time_limit && <li>Complete within {quiz.time_limit} minutes</li>}
          </ul>
          <div style={{ background: '#f59e0b', padding: 15, borderRadius: 4, marginBottom: 20, color: 'white' }}>
            <strong>Advanced Monitoring:</strong>
            <ul style={{ margin: '10px 0 0 20px', fontSize: '0.9em' }}>
              {proctoringConfig?.webcam_required && <li>Face detection and tracking</li>}
              {proctoringConfig?.screen_monitoring && <li>Screen sharing detection</li>}
              {proctoringConfig?.audio_monitoring && <li>Audio monitoring</li>}
              <li>Real-time violation reporting</li>
            </ul>
          </div>

          {/* Permission Check Section */}
          {(proctoringConfig?.webcam_required || proctoringConfig?.audio_monitoring) && !permissionsGranted && (
            <div style={{ background: '#1e40af', padding: 15, borderRadius: 4, marginBottom: 20, border: '1px solid #1e40af', color: 'white' }}>
              <h3 style={{ margin: '0 0 10px 0', color: 'white' }}>📷 Permission Required</h3>
              <p style={{ margin: '0 0 15px 0', fontSize: '0.9em' }}>
                This proctored quiz requires access to your camera
                {proctoringConfig?.audio_monitoring && ' and microphone'}.
                Please grant permissions when prompted.
              </p>
              <button
                className="btn btn-outline"
                onClick={checkAndRequestPermissions}
                disabled={checkingPermissions}
                style={{ borderColor: 'white', color: 'white', backgroundColor: 'transparent' }}
              >
                {checkingPermissions ? 'Checking Permissions...' : 'Grant Camera Access'}
              </button>
            </div>
          )}

          {/* Success message when permissions granted */}
          {permissionsGranted && (
            <div style={{ background: '#f0fdf4', padding: 15, borderRadius: 4, marginBottom: 20, border: '1px solid #22c55e' }}>
              <p style={{ margin: 0, color: '#15803d', fontWeight: 'bold' }}>
                ✅ Permissions granted successfully!
              </p>
            </div>
          )}


          <p style={{ color: '#ef4444', fontWeight: 'bold' }}>
            Critical violations will immediately suspend the quiz. Teacher intervention may be required to resume.
          </p>

          <button
            className="btn btn-primary"
            onClick={startAdvancedProctoring}
            disabled={isInitializingProctoring || ((proctoringConfig?.webcam_required || proctoringConfig?.audio_monitoring) && !permissionsGranted)}
            style={{ marginTop: 20 }}
          >
            {isInitializingProctoring
              ? 'Initializing Proctoring...'
              : 'Enter Fullscreen & Start Quiz'
            }
          </button>
        </div>
      </div>
    )
  }

  // Format time remaining
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      {/* Fullscreen Instructions Overlay */}
      {showFullscreenInstructions && (
        <FullscreenInstructions
          onRetry={retryFullscreen}
          onManual={confirmManualFullscreen}
          errorMessage={fullscreenError}
          attemptNumber={fullscreenRetryCount + 1}
          maxAttempts={3}
        />
      )}


      {/* Grace Period Warning Overlay */}
      {proctoringStatus?.gracePeriodActive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(239, 68, 68, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          color: 'white',
          fontSize: '1.2em',
          textAlign: 'center',
          padding: '20px'
        }}>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ margin: '0 0 10px 0', color: 'white' }}>Proctoring Violation Detected</h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '1.1em' }}>
            {proctoringStatus.gracePeriodViolation?.description}
          </p>
          <div style={{
            fontSize: '4em',
            fontWeight: 'bold',
            margin: '20px 0',
            color: proctoringStatus.gracePeriodTimeLeft <= 2 ? '#ff6b6b' : 'white'
          }}>
            {proctoringStatus.gracePeriodTimeLeft}
          </div>
          <p style={{ margin: '0 0 30px 0' }}>
            Quiz will be suspended in {proctoringStatus.gracePeriodTimeLeft} second{proctoringStatus.gracePeriodTimeLeft !== 1 ? 's' : ''} if not corrected.
          </p>
          {proctoringStatus.gracePeriodViolation?.type === 'fullscreen_exit' && (
            <button
              className="btn btn-primary"
              onClick={() => proctoringService.returnToFullscreen()}
              style={{
                fontSize: '1.2em',
                padding: '15px 30px',
                background: 'white',
                color: '#dc2626',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Return to Fullscreen
            </button>
          )}
          {proctoringStatus.gracePeriodViolation?.type === 'face_not_detected' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 20px 0', fontSize: '1.1em' }}>
                Please ensure your face is clearly visible to the camera.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  // For webcam violations, we just wait for the face detection to recover automatically
                  // The grace period will be cancelled when face is detected again
                  console.log('DEBUG: Student acknowledged webcam violation warning')
                }}
                style={{
                  fontSize: '1.2em',
                  padding: '15px 30px',
                  background: 'white',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                I Understand - Keep Face Visible
              </button>
            </div>
          )}
          {(proctoringStatus.gracePeriodViolation?.type === 'tab_switch' ||
            proctoringStatus.gracePeriodViolation?.type === 'navigation_attempt' ||
            proctoringStatus.gracePeriodViolation?.type === 'back_button_pressed') && (
            <button
              className="btn btn-primary"
              onClick={() => {
                // For tab/window violations, just acknowledge and return focus
                console.log('DEBUG: Student returned focus to quiz window')
              }}
              style={{
                fontSize: '1.2em',
                padding: '15px 30px',
                background: 'white',
                color: '#dc2626',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Return to Quiz Window
            </button>
          )}
        </div>
      )}

      <header className="topbar">
        <div>
          <h2>
            {quiz.title}
            {quiz.is_proctored && (
              <span style={{
                display: 'inline-block',
                marginLeft: '12px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.8em',
                fontWeight: 'bold',
                background: '#dc2626',
                color: 'white'
              }}>
                🔒 PROCTORED
              </span>
            )}
          </h2>
          {quiz.is_proctored && proctoringStatus && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              {timeRemaining !== null && (
                <div style={{
                  background: timeRemaining < 300 ? '#fee2e2' : timeRemaining < 600 ? '#fef3c7' : '#f0fdf4',
                  border: `2px solid ${timeRemaining < 300 ? '#ef4444' : timeRemaining < 600 ? '#f59e0b' : '#22c55e'}`,
                  color: timeRemaining < 300 ? '#dc2626' : timeRemaining < 600 ? '#d97706' : '#15803d',
                  fontWeight: 'bold',
                  fontSize: '1.4em',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  minWidth: '120px'
                }}>
                  ⏱️ {formatTime(timeRemaining)}
                </div>
              )}

              {/* Connection Status */}
              <div style={{
                color: proctoringStatus.isConnected ? '#10b981' : '#ef4444',
                fontWeight: 'bold',
                fontSize: '0.9em'
              }}>
                {proctoringStatus.isConnected ? '● Connected' : '● Disconnected'}
              </div>

              {/* Fullscreen Status */}
              <div style={{
                color: proctoringStatus.isFullscreen ? '#10b981' : '#ef4444',
                fontWeight: 'bold',
                fontSize: '0.9em'
              }}>
                {proctoringStatus.isFullscreen ? '✓ Fullscreen' : '✗ Not Fullscreen'}
              </div>

              {/* Webcam Status */}
              {proctoringConfig?.webcam_required && (
                <div style={{
                  color: proctoringStatus.faceDetected ? '#10b981' : '#f59e0b',
                  fontWeight: 'bold',
                  fontSize: '0.9em'
                }}>
                  {proctoringStatus.webcamActive
                    ? (proctoringStatus.faceDetected ? '👤 Face OK' : '👤 Face Not Detected')
                    : '📷 Camera Off'
                  }
                </div>
              )}

              {/* Audio Status */}
              {proctoringConfig?.audio_monitoring && (
                <div style={{
                  color: proctoringStatus.audioDetected ? '#f59e0b' : '#10b981',
                  fontWeight: 'bold',
                  fontSize: '0.9em'
                }}>
                  {proctoringStatus.audioDetected ? '🎤 Audio Detected' : '🔇 Quiet'}
                </div>
              )}

              {/* Screen Sharing Status */}
              {proctoringConfig?.screen_monitoring && proctoringStatus.screenSharing && (
                <div style={{
                  color: '#ef4444',
                  fontWeight: 'bold',
                  fontSize: '0.9em'
                }}>
                  🚨 Screen Sharing
                </div>
              )}

              {/* Violations Count */}
              {proctoringStatus.violations.length > 0 && (
                <div style={{
                  color: proctoringStatus.warningCount >= (proctoringConfig?.max_warnings || 3) ? '#ef4444' : '#f59e0b',
                  fontWeight: 'bold',
                  fontSize: '0.9em'
                }}>
                  ⚠️ Violations: {proctoringStatus.violations.length}
                </div>
              )}

              {/* Grace Period Status */}
              {proctoringStatus.gracePeriodActive && (
                <div style={{
                  color: '#f59e0b',
                  fontWeight: 'bold',
                  fontSize: '0.9em',
                  background: '#fef3c7',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '2px solid #f59e0b'
                }}>
                  ⚠️ VIOLATION: {proctoringStatus.gracePeriodTimeLeft}s
                </div>
              )}

              {/* Suspension Status */}
              {proctoringStatus.isSuspended && (
                <div style={{
                  color: '#ef4444',
                  fontWeight: 'bold',
                  fontSize: '0.9em',
                  background: '#fee2e2',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  🚫 QUIZ SUSPENDED
                </div>
              )}
            </div>
          )}
        </div>
        {/* Back button removed for proctored quizzes - navigation protection prevents accidental exit */}
      </header>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="muted">Course: {quiz.course_code} — {quiz.course_title}</div>
        <div className="muted">Max score: {quiz.max_score}</div>
        {quiz.start_at && <div className="muted">Opens: {new Date(quiz.start_at).toLocaleString()}</div>}
        {quiz.end_at && <div className="muted">Closes: {new Date(quiz.end_at).toLocaleString()}</div>}
      </div>

      <form className="card" onSubmit={(e) => { e.preventDefault(); void handleSubmit() }}>
        <ol style={{ paddingLeft: 20 }}>
          {quiz.questions.map((q, idx) => (
            <li key={q.id} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Q{idx + 1}. {q.question_text}</div>
              {q.question_type === 'mcq' && (
                <div>
                  {(q.metadata.choices || []).map((choice, i) => (
                    <label key={i} style={{ display: 'block', marginBottom: 6, color: gradedAnswers[q.id]?.is_correct !== undefined && gradedAnswers[q.id] ? (gradedAnswers[q.id].student_answer === i && gradedAnswers[q.id].is_correct ? 'green' : (gradedAnswers[q.id].student_answer === i && gradedAnswers[q.id].is_correct === false ? '#b91c1c' : 'inherit')) : 'inherit' }}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === i}
                        onChange={() => setAnswers((m) => ({ ...m, [q.id]: i }))}
                        disabled={!!result}
                      />{' '}
                      {choice}
                      {result && gradedAnswers[q.id]?.correct_answer === i ? ' ✓' : ''}
                    </label>
                  ))}
                </div>
              )}
              {q.question_type === 'true_false' && (
                <div>
                  {['True', 'False'].map((label, i) => (
                    <label key={i} style={{ display: 'block', marginBottom: 6, color: gradedAnswers[q.id]?.student_answer === i ? (gradedAnswers[q.id]?.is_correct ? 'green' : '#b91c1c') : 'inherit' }}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === i}
                        onChange={() => setAnswers((m) => ({ ...m, [q.id]: i }))}
                        disabled={!!result}
                      />{' '}
                      {label}
                      {result && gradedAnswers[q.id]?.correct_answer === i ? ' ✓' : ''}
                    </label>
                  ))}
                </div>
              )}
              {q.question_type === 'short' && (
                <div>
                  <textarea
                    className="input"
                    style={{ width: '100%', minHeight: 80 }}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((m) => ({ ...m, [q.id]: e.target.value }))}
                    placeholder="Your answer..."
                    disabled={!!result}
                  />
                  {result && gradedAnswers[q.id] && gradedAnswers[q.id].is_correct === null && (
                    <div className="muted" style={{ marginTop: 4 }}>Pending manual grading.</div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-primary" type="submit" disabled={!canSubmit || submitting || !!result}>
            {submitting ? 'Submitting…' : (result ? 'Submitted' : 'Submit Quiz')}
          </button>
        </div>
      </form>

      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <div>Score: {result.score === null ? 'Pending' : Math.round(result.score)}</div>
          {result.needs_manual_grading && <div className="muted">Some questions require manual grading.</div>}
        </div>
      )}
    </div>
  )
}
