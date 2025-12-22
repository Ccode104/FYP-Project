import { useState, useEffect, useRef, useMemo } from 'react'
import Editor from '@monaco-editor/react'
import './AIEnhancedCodeEditor.css'
import { useToast } from './ToastProvider'
import { apiFetch } from '../services/api'

interface AIEnhancedCodeEditorProps {
  questionId: number | string
  initialCode?: string
  language?: string
  onCodeChange?: (code: string, language: string) => void
  onSubmit?: (code: string, language: string) => void
  onRun?: (code: string, language: string) => void
  contestMode?: boolean
  allowAI?: boolean
  maxAIQueries?: number
  disableDistractionControl?: boolean
  complexity?: { time: string; space: string }
  onComplexityAnalysis?: (complexity: { time: string; space: string }) => void
}

interface ComplexityResult {
  time_complexity: string
  space_complexity: string
  analysis: string
}

interface AIResponse {
  type: 'explanation' | 'snippet' | 'debugging' | 'algorithm'
  content: string
}

const LANGUAGE_TEMPLATES: Record<string, string> = {
  python: `# Problem: [Problem Title]
# Write your solution below

def solve():
    # Your code here
    pass

if __name__ == "__main__":
    solve()
`,
  cpp: `#include <iostream>
#include <vector>
using namespace std;

// Problem: [Problem Title]
// Write your solution below

int main() {
    // Your code here
    
    return 0;
}
`,
  java: `import java.util.*;

// Problem: [Problem Title]
// Write your solution below

public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}
`,
  javascript: `// Problem: [Problem Title]
// Write your solution below

function solve() {
    // Your code here
}

solve();
`,
  csharp: `using System;
using System.Collections.Generic;

// Problem: [Problem Title]
// Write your solution below

class Solution {
    static void Main() {
        // Your code here
    }
}
`,
  go: `package main

import "fmt"

// Problem: [Problem Title]
// Write your solution below

func main() {
    // Your code here
}
`,
  rust: `// Problem: [Problem Title]
// Write your solution below

fn main() {
    // Your code here
}
`
}

export default function AIEnhancedCodeEditor({
  questionId,
  initialCode = '',
  language = 'python',
  onCodeChange,
  onSubmit,
  onRun,
  contestMode = false,
  allowAI = true,
  maxAIQueries = 10,
  disableDistractionControl = true,
  onComplexityAnalysis
}: AIEnhancedCodeEditorProps) {
  const toast = useToast()
  const push = (opts: { kind?: 'success' | 'error' | string; message?: string }) => {
    if (toast && typeof (toast as unknown).push === 'function') {
      (toast as unknown).push(opts)
    }
  }

  // State management
  const [code, setCode] = useState(initialCode || LANGUAGE_TEMPLATES[language] || '')
  const [currentLanguage, setCurrentLanguage] = useState(language)
  const [aiPanelOpen, setAiPanelOpen] = useState(!contestMode)
  const [aiQueries, setAiQueries] = useState(0)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [aiInputQuery, setAiInputQuery] = useState('')
  const [complexity, setComplexity] = useState<{ time: string; space: string } | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showComplexityWarning, setShowComplexityWarning] = useState(false)
  const [distractionMode, setDistractionMode] = useState(false)
  const editorRef = useRef<any>(null)
  const analysisTimeoutRef = useRef<NodeJS.Timeout>()

  // Handle code changes
  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
      onCodeChange?.(value, currentLanguage)
    }
  }

  // Handle language change
  const handleLanguageChange = (newLang: string) => {
    setCurrentLanguage(newLang)
    if (code.trim() === '' || code === LANGUAGE_TEMPLATES[language]) {
      setCode(LANGUAGE_TEMPLATES[newLang] || '')
    }
  }

  // Analyze code complexity
  const analyzeComplexity = async () => {
    if (!code.trim()) {
      push({ kind: 'error', message: 'Write some code first' })
      return
    }

    setAnalyzing(true)
    try {
      const result = await apiFetch<ComplexityResult>('/api/code-analysis/complexity', {
        method: 'POST',
        body: {
          code,
          language: currentLanguage,
          question_id: questionId
        }
      })

      setComplexity({
        time: result.time_complexity,
        space: result.space_complexity
      })

      onComplexityAnalysis?.(result as unknown as { time: string; space: string })

      // Check for TLE/MLE warnings
      if (
        result.time_complexity.includes('O(n²)') ||
        result.time_complexity.includes('O(n³)') ||
        result.space_complexity.includes('O(n²)')
      ) {
        setShowComplexityWarning(true)
      }

      push({ kind: 'success', message: 'Complexity analysis complete' })
    } catch (err: any) {
      push({ kind: 'error', message: err?.message || 'Complexity analysis failed' })
    } finally {
      setAnalyzing(false)
    }
  }

  // Auto-analyze complexity after code changes (debounced)
  useEffect(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current)
    }

    analysisTimeoutRef.current = setTimeout(() => {
      if (code.trim() && !disableDistractionControl) {
        analyzeComplexity()
      }
    }, 2000)

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current)
      }
    }
  }, [code])

  // Send AI query
  const handleAIQuery = async (queryType: 'explanation' | 'debugging' | 'hint' = 'hint') => {
    if (!allowAI) {
      push({ kind: 'error', message: 'AI assistance is disabled' })
      return
    }

    if (aiQueries >= maxAIQueries) {
      push({ kind: 'error', message: `AI query limit (${maxAIQueries}) reached` })
      return
    }

    if (!code.trim()) {
      push({ kind: 'error', message: 'Write some code first' })
      return
    }

    if (!aiInputQuery.trim() && queryType === 'debugging') {
      push({ kind: 'error', message: 'Please describe the issue' })
      return
    }

    setAiLoading(true)
    try {
      const response = await apiFetch<AIResponse>('/api/ai-assistant/query', {
        method: 'POST',
        body: {
          question_id: questionId,
          code,
          language: currentLanguage,
          query_type: queryType,
          user_query: aiInputQuery,
          contest_mode: contestMode
        }
      })

      setAiResponse(response)
      setAiQueries(prev => prev + 1)
      setAiInputQuery('')

      push({ kind: 'success', message: `AI Assistant: ${aiQueries + 1}/${maxAIQueries} queries used` })
    } catch (err: any) {
      push({ kind: 'error', message: err?.message || 'AI query failed' })
    } finally {
      setAiLoading(false)
    }
  }

  // Inject logical bug (for testing)
  const injectLogicalBug = async () => {
    if (!code.trim()) {
      push({ kind: 'error', message: 'Write some code first' })
      return
    }

    try {
      const result = await apiFetch<{ code: string; bug_description: string }>(
        '/api/code-analysis/inject-bug',
        {
          method: 'POST',
          body: {
            code,
            language: currentLanguage,
            question_id: questionId
          }
        }
      )

      setCode(result.code)
      push({
        kind: 'error',
        message: `🐛 Logical bug injected! ${result.bug_description}`
      })
    } catch (err: any) {
      push({ kind: 'error', message: err?.message || 'Bug injection failed' })
    }
  }

  const aiQuerysRemaining = maxAIQueries - aiQueries

  return (
    <div className={`ai-code-editor ${contestMode ? 'contest-mode' : ''} ${distractionMode ? 'distraction-mode' : ''}`}>
      {/* Header with controls */}
      <div className="editor-header">
        <div className="editor-title-section">
          <h3>Code Editor - Question {questionId}</h3>
          {contestMode && <span className="badge contest-badge">Contest Mode</span>}
          {distractionMode && <span className="badge distraction-badge">Focus Mode</span>}
        </div>

        <div className="editor-controls">
          {/* Language selector */}
          <select
            value={currentLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="language-select"
            title="Select programming language"
          >
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
            <option value="csharp">C#</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>

          {/* Action buttons */}
          <button className="btn-icon" onClick={() => analyzeComplexity()} title="Analyze Time/Space Complexity" disabled={analyzing}>
            {analyzing ? '⏳' : '📊'}
          </button>

          {allowAI && !distractionMode && (
            <button
              className="btn-icon ai-toggle"
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
              title={`AI Assistant (${aiQuerysRemaining} queries left)`}
            >
              🤖 ({aiQuerysRemaining})
            </button>
          )}

          {contestMode && (
            <button
              className={`btn-icon ${distractionMode ? 'active' : ''}`}
              onClick={() => setDistractionMode(!distractionMode)}
              title="Toggle Focus Mode"
            >
              👁️
            </button>
          )}

          <button className="btn btn-primary" onClick={() => onRun?.(code, currentLanguage)}>
            Run Code
          </button>

          <button className="btn btn-success" onClick={() => onSubmit?.(code, currentLanguage)}>
            Submit
          </button>
        </div>
      </div>

      {/* Complexity warning */}
      {showComplexityWarning && (
        <div className="complexity-warning">
          ⚠️ <strong>Complexity Warning:</strong> Your solution might be too slow or memory-intensive. Consider optimizing.
        </div>
      )}

      {/* Main editor area */}
      <div className="editor-main-container">
        {/* Code editor */}
        <div className="editor-column code-editor-container">
          <div className="editor-sub-header">
            <span className="editor-label">Code</span>
            {complexity && (
              <span className="complexity-badge">
                Time: {complexity.time} | Space: {complexity.space}
              </span>
            )}
          </div>
          <Editor
            ref={editorRef}
            height="100%"
            defaultLanguage={currentLanguage}
            language={currentLanguage}
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'Fira Code, monospace',
              formatOnPaste: true,
              formatOnType: true,
              wordWrap: 'on',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        </div>

        {/* AI Assistant Panel */}
        {allowAI && aiPanelOpen && !distractionMode && (
          <div className="ai-panel">
            <div className="ai-panel-header">
              <h4>🤖 AI Assistant</h4>
              <button className="close-btn" onClick={() => setAiPanelOpen(false)}>
                ✕
              </button>
            </div>

            {/* Query counter */}
            <div className="ai-query-counter">
              Queries used: {aiQueries}/{maxAIQueries}
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(aiQueries / maxAIQueries) * 100}%` }}></div>
              </div>
            </div>

            {/* AI Input */}
            <div className="ai-input-section">
              <textarea
                className="ai-input"
                placeholder="Ask a question or describe an issue..."
                value={aiInputQuery}
                onChange={(e) => setAiInputQuery(e.target.value)}
                disabled={aiLoading || aiQueries >= maxAIQueries}
                rows={3}
              />
              <div className="ai-button-group">
                <button
                  className="btn-small"
                  onClick={() => handleAIQuery('hint')}
                  disabled={aiLoading || aiQueries >= maxAIQueries}
                  title="Get a hint without full solution"
                >
                  {aiLoading ? 'Loading...' : '💡 Hint'}
                </button>
                <button
                  className="btn-small"
                  onClick={() => handleAIQuery('explanation')}
                  disabled={aiLoading || aiQueries >= maxAIQueries}
                  title="Explain the current code"
                >
                  {aiLoading ? 'Loading...' : '📖 Explain'}
                </button>
                <button
                  className="btn-small"
                  onClick={() => handleAIQuery('debugging')}
                  disabled={aiLoading || aiQueries >= maxAIQueries || !aiInputQuery.trim()}
                  title="Get debugging help"
                >
                  {aiLoading ? 'Loading...' : '🔍 Debug'}
                </button>
              </div>
            </div>

            {/* AI Response */}
            {aiResponse && (
              <div className="ai-response-section">
                <div className="response-label">{aiResponse.type}</div>
                <div className="ai-response-content">
                  {aiResponse.content}
                </div>
              </div>
            )}

            {aiQueries >= maxAIQueries && (
              <div className="ai-limit-message">
                ℹ️ You have reached your AI query limit. Focus on understanding and solving the problem!
              </div>
            )}
          </div>
        )}

        {/* Distraction Control Message */}
        {distractionMode && (
          <div className="distraction-overlay">
            <div className="distraction-message">
              <h3>Focus Mode Activated</h3>
              <p>🧠 Minimize distractions. Focus on solving the problem.</p>
              <p>All AI features are temporarily hidden. Click the 👁️ button to exit.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
