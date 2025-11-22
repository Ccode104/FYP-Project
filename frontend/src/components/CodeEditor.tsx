import { useState, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
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

export default function CodeEditor({ defaultLanguage = 'python', disabled = false, value, onChange }: CodeEditorProps) {
  const [code, setCode] = useState(value || '')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

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
    return () => window.removeEventListener('resize', handleResize)
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

    // Editor is loaded
    setIsLoading(false)
  }

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || ''
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
          contextmenu: true,
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
