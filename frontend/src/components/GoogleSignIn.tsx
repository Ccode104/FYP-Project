import { useEffect, useRef } from 'react'
import './GoogleSignIn.css'

interface GoogleSignInProps {
  onSuccess: (credential: string) => void
  onError?: (error: string) => void
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  width?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          prompt: () => void
          renderButton: (element: HTMLElement, config: {
            theme?: string
            size?: string
            text?: string
            width?: string
            type?: string
          }) => void
        }
      }
    }
  }
}

export default function GoogleSignIn({ 
  onSuccess, 
  onError,
  text = 'signin_with',
  theme = 'outline',
  size = 'large',
  width
}: GoogleSignInProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    // Load Google Identity Services script
    const loadGoogleScript = () => {
      if (document.getElementById('google-signin-script')) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.id = 'google-signin-script'
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Google Sign-In script'))
        document.head.appendChild(script)
      })
    }

    const initializeGoogleSignIn = async () => {
      try {
        await loadGoogleScript()

        // Wait for Google to be available
        const checkGoogle = () => {
          if (window.google?.accounts?.id) {
            if (buttonRef.current && !initializedRef.current) {
              // Get client ID from environment variable or use a default
              const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
              
              if (!clientId) {
                console.warn('Google Client ID not found. Please set VITE_GOOGLE_CLIENT_ID in your .env file')
                if (onError) {
                  onError('Google Sign-In is not configured. Please contact support.')
                }
                return
              }

              // Initialize Google Sign-In
              window.google.accounts.id.initialize({
                client_id: clientId,
                callback: (response) => {
                  if (response.credential) {
                    onSuccess(response.credential)
                  } else {
                    if (onError) {
                      onError('Failed to get Google credential')
                    }
                  }
                },
              })

              // Render the button
              if (buttonRef.current) {
                window.google.accounts.id.renderButton(buttonRef.current, {
                  theme,
                  size,
                  text,
                  width,
                  type: 'standard',
                })
                initializedRef.current = true
              }
            }
          } else {
            setTimeout(checkGoogle, 100)
          }
        }

        checkGoogle()
      } catch (error: any) {
        console.error('Error initializing Google Sign-In:', error)
        if (onError) {
          onError(error.message || 'Failed to initialize Google Sign-In')
        }
      }
    }

    initializeGoogleSignIn()

    // Cleanup
    return () => {
      // Cleanup if needed
    }
  }, [onSuccess, onError, theme, size, text, width])

  return (
    <div className="google-signin-container">
      <div ref={buttonRef} className="google-signin-button" />
    </div>
  )
}

