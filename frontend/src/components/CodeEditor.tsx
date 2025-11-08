import { useState } from 'react'
import './CodeEditor.css'

interface CodeEditorProps {
  onSubmit: (code: string, language: string) => void
  defaultLanguage?: string
  disabled?: boolean
}

export default function CodeEditor({ onSubmit, defaultLanguage = 'python', disabled = false }: CodeEditorProps) {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState(defaultLanguage)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      alert('Please write some code before submitting')
      return
    }
    onSubmit(code, language)
  }

  return (
    <form onSubmit={handleSubmit} className="code-editor-container">
      <div className="code-editor-header">
        <label className="field">
          <span className="label">Language:</span>
          <select 
            className="select" 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            disabled={disabled}
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="javascript">JavaScript</option>
            <option value="c">C</option>
          </select>
        </label>
      </div>
      <textarea
        className="code-editor-textarea"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={`Write your ${language} code here...`}
        disabled={disabled}
        spellCheck={false}
      />
      <div className="code-editor-footer">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={disabled || !code.trim()}
        >
          Submit Code
        </button>
        <span className="muted">
          Lines: {code.split('\n').length} | Characters: {code.length}
        </span>
      </div>
    </form>
  )
}
