import { useState, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { apiFetch } from '../services/api'
import './CodeEditor.css'

interface CodeEditorProps {
  onSubmit: (code: string, language: string) => void
  defaultLanguage?: string
  disabled?: boolean
  value?: string
  onChange?: (code: string) => void
}

const languageMap: { [key: string]: string } = {
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  javascript: 'javascript',
  c: 'c'
}

interface TypingMetrics {
  timestamp: number
  charCount: number
  speed: number // characters per second
  isSuspicious: boolean
}

export default function CodeEditor({ defaultLanguage = 'python', disabled = false, value, onChange }: CodeEditorProps) {
  const [code, setCode] = useState(value || '')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const eventListenersRef = useRef<(() => void) | null>(null)
  const typingMetricsRef = useRef<TypingMetrics[]>([])
  const lastKeystrokeTimeRef = useRef<number>(Date.now())
  const keystrokeBufferRef = useRef<string[]>([])

  // Sync external value changes
  useEffect(() => {
    if (value !== undefined && value !== code) {
      setCode(value)
    }
  }, [value])

  // Timeout for loading - if editor doesn't load within 10 seconds, show error
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setHasError(true)
        setIsLoading(false)
      }
    }, 10000)

    return () => clearTimeout(timer)
  }, [isLoading])

  // Handle window resize to ensure Monaco Editor resizes properly
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        editorRef.current.layout()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      // Clean up event listeners
      if (eventListenersRef.current) {
        eventListenersRef.current()
      }
    }
  }, [])

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monacoInstance: typeof import('monaco-editor')) => {
    editorRef.current = editor

    // Configure Monaco Editor with VSCode-like features
    monacoInstance.editor.defineTheme('vs-dark-custom', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
      }
    })

    // Set theme
    monacoInstance.editor.setTheme('vs-dark-custom')

    // Disable copy-paste functionality by overriding default commands
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyC, () => {
      // Do nothing - prevent copy
      return
    })
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyV, () => {
      // Do nothing - prevent paste
      return
    })
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyX, () => {
      // Do nothing - prevent cut
      return
    })

    // Prevent context menu
    editor.onContextMenu((e) => {
      e.event.preventDefault()
      e.event.stopPropagation()
    })

    // Add DOM event listeners to prevent copy/paste/cut
    const editorDomNode = editor.getDomNode()
    if (editorDomNode) {
      const preventCopyPaste = (e: Event) => {
        if (e.type === 'copy' || e.type === 'paste' || e.type === 'cut') {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
      }

      const preventContextMenu = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
      }

      editorDomNode.addEventListener('copy', preventCopyPaste, true)
      editorDomNode.addEventListener('paste', preventCopyPaste, true)
      editorDomNode.addEventListener('cut', preventCopyPaste, true)
      editorDomNode.addEventListener('contextmenu', preventContextMenu, true)

      // Store cleanup function
      eventListenersRef.current = () => {
        editorDomNode.removeEventListener('copy', preventCopyPaste, true)
        editorDomNode.removeEventListener('paste', preventCopyPaste, true)
        editorDomNode.removeEventListener('cut', preventCopyPaste, true)
        editorDomNode.removeEventListener('contextmenu', preventContextMenu, true)
      }
    }

    // Editor is loaded
    setIsLoading(false)
  }

  // Analyze typing speed and detect suspicious patterns
  const analyzeTypingSpeed = (newChars: string) => {
    const now = Date.now()
    const timeDiff = now - lastKeystrokeTimeRef.current
    const charCount = newChars.length

    // Calculate speed (characters per second)
    const speed = charCount / (timeDiff / 1000)

    // Flag as suspicious if speed is unrealistically high (> 10 chars/second for sustained input)
    const isSuspicious = speed > 10 && charCount > 5

    const metrics: TypingMetrics = {
      timestamp: now,
      charCount,
      speed,
      isSuspicious
    }

    typingMetricsRef.current.push(metrics)

    // Keep only last 100 metrics
    if (typingMetricsRef.current.length > 100) {
      typingMetricsRef.current = typingMetricsRef.current.slice(-100)
    }

    // Log suspicious activity
    if (isSuspicious) {
      console.warn('Suspicious typing detected:', metrics)
      // Send to backend for monitoring
      sendTypingMetrics(metrics)
    }

    lastKeystrokeTimeRef.current = now
  }

  // Send typing metrics to backend
  const sendTypingMetrics = async (metrics: TypingMetrics) => {
    try {
      await apiFetch('/api/monitoring/typing-metrics', {
        method: 'POST',
        body: {
          metrics,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      })
    } catch (error) {
      console.error('Failed to send typing metrics:', error)
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || ''
    const oldCode = code

    // Calculate the difference
    if (newCode.length > oldCode.length) {
      // Text was added
      const addedChars = newCode.slice(oldCode.length)
      analyzeTypingSpeed(addedChars)
    }

    setCode(newCode)
    if (onChange) {
      onChange(newCode)
    }
  }

  if (hasError) {
    return (
      <div className="code-editor-monaco" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#d4d4d4',
        fontSize: '14px',
        background: '#1e1e1e',
        border: '1px solid #3d3d3d',
        borderRadius: '4px',
        minHeight: '400px'
      }}>
        Failed to load code editor. Please check your internet connection and refresh the page.
      </div>
    )
  }

  return (
    <div className="code-editor-monaco">
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#d4d4d4',
          fontSize: '14px',
          zIndex: 10
        }}>
          Loading code editor...
        </div>
      )}
      <Editor
        height="100%"
        language={languageMap[defaultLanguage] || 'python'}
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: 'on',
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          renderWhitespace: 'selection',
          cursorBlinking: 'blink',
          cursorStyle: 'line',
          contextmenu: false, // Disable context menu (copy/paste options)
          mouseWheelZoom: true,
          multiCursorModifier: 'ctrlCmd',
          accessibilitySupport: 'auto',
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true
          },
          parameterHints: {
            enabled: true
          },
          hover: {
            enabled: true
          },
          bracketPairColorization: {
            enabled: true
          },
          guides: {
            bracketPairs: true,
            indentation: true
          },
          readOnly: disabled,
          // Disable copy-paste related features
          copyWithSyntaxHighlighting: false,
          selectionHighlight: false,
          occurrencesHighlight: "off",
          overviewRulerLanes: 0,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false
          }
        }}
        theme="vs-dark-custom"
      />
    </div>
  )
}
