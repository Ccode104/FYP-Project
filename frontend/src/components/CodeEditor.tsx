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
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  // Sync external value changes
  useEffect(() => {
    if (value !== undefined && value !== code) {
      setCode(value)
    }
  }, [value])

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
  }

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || ''
    setCode(newCode)
    if (onChange) {
      onChange(newCode)
    }
  }

  return (
    <div className="code-editor-monaco">
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
          readOnly: disabled
        }}
        theme="vs-dark"
      />
    </div>
  )
}
