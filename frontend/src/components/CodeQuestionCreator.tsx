import { useState } from 'react'
import { useToast } from './ToastProvider'

interface TestCase {
  id: string
  is_sample: boolean
  input_text: string
  expected_text: string
  input_file?: File | null
  expected_file?: File | null
}

interface CodeQuestionCreatorProps {
  courseOfferingId: string
  onComplete: () => void
}

export default function CodeQuestionCreator({ courseOfferingId, onComplete }: CodeQuestionCreatorProps) {
  const toast = useToast()
  let push: (opts: { kind?: 'success' | 'error' | string; message?: string }) => void = (opts) => {
    if (!opts) return
    const kind = (opts as any)?.kind
    const msg = (opts as any)?.message ?? opts
    if (kind === 'error') console.error(msg)
    else if (kind === 'success') console.log(msg)
    else console.log(msg)
  }
  if (toast && typeof (toast as any).push === 'function') {
    push = (toast as any).push
  }

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [constraints, setConstraints] = useState('')
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: '1', is_sample: true, input_text: '', expected_text: '' }
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addTestCase = () => {
    setTestCases([...testCases, {
      id: Date.now().toString(),
      is_sample: false,
      input_text: '',
      expected_text: ''
    }])
  }

  const removeTestCase = (id: string) => {
    setTestCases(testCases.filter(tc => tc.id !== id))
  }

  const updateTestCase = (id: string, field: keyof TestCase, value: any) => {
    setTestCases(testCases.map(tc => 
      tc.id === id ? { ...tc, [field]: value } : tc
    ))
  }

  const handleFileRead = (file: File | null): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!file) {
        resolve(null)
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        resolve(result)
      }
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    })
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      push({ kind: 'error', message: 'Question title is required' })
      return
    }
    if (!description.trim()) {
      push({ kind: 'error', message: 'Question description is required' })
      return
    }
    if (testCases.length === 0) {
      push({ kind: 'error', message: 'Add at least one test case' })
      return
    }

    // Validate test cases
    for (const tc of testCases) {
      if (!tc.input_text && !tc.input_file) {
        push({ kind: 'error', message: 'Each test case must have input (text or file)' })
        return
      }
      if (!tc.expected_text && !tc.expected_file) {
        push({ kind: 'error', message: 'Each test case must have expected output (text or file)' })
        return
      }
    }

    setIsSubmitting(true)
    try {
      // Prepare test cases with file contents
      const testCasesWithFiles = await Promise.all(
        testCases.map(async (tc) => {
          const inputFileContent = tc.input_file ? await handleFileRead(tc.input_file) : null
          const expectedFileContent = tc.expected_file ? await handleFileRead(tc.expected_file) : null

          return {
            is_sample: tc.is_sample,
            input_text: tc.input_text || null,
            expected_text: tc.expected_text || null,
            input_file: inputFileContent ? {
              data: inputFileContent,
              filename: tc.input_file.name,
              encoding: 'utf-8'
            } : null,
            expected_file: expectedFileContent ? {
              data: expectedFileContent,
              filename: tc.expected_file.name,
              encoding: 'utf-8'
            } : null
          }
        })
      )

      const { apiFetch } = await import('../services/api')
      await apiFetch('/api/code-questions', {
        method: 'POST',
        body: {
          title,
          description,
          constraints: constraints || null,
          course_offering_id: Number(courseOfferingId),
          test_cases: testCasesWithFiles
        }
      })

      push({ kind: 'success', message: 'Code question created successfully' })
      onComplete()
    } catch (e: any) {
      push({ kind: 'error', message: e?.message || 'Failed to create code question' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="form" style={{ maxWidth: 900 }}>
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <h4 style={{ marginTop: 0 }}>Code Question Details</h4>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Question Title *</div>
          <input
            className="input"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Find Maximum Element in Array"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Question Description *</div>
          <textarea
            className="input"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 120 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the problem statement, what the code should do..."
            rows={5}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Constraints</div>
          <textarea
            className="input"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 72 }}
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="e.g., 1 ≤ n ≤ 1000, Time limit: 1 second"
            rows={3}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ marginTop: 0 }}>Test Cases</h4>
          <button className="btn" onClick={addTestCase}>Add Test Case</button>
        </div>

        {testCases.map((tc, idx) => (
          <div key={tc.id} className="card" style={{ marginBottom: 16, padding: 16, backgroundColor: '#f8f9fa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong>Test Case {idx + 1}</strong>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={tc.is_sample}
                    onChange={(e) => updateTestCase(tc.id, 'is_sample', e.target.checked)}
                  />
                  <span>Sample Test Case</span>
                </label>
                {testCases.length > 1 && (
                  <button className="btn" onClick={() => removeTestCase(tc.id)}>Remove</button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
              <div>
                <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Input (Text)</div>
                <textarea
                  className="input"
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 80, fontFamily: 'monospace' }}
                  value={tc.input_text}
                  onChange={(e) => updateTestCase(tc.id, 'input_text', e.target.value)}
                  placeholder="Enter input text..."
                  rows={4}
                />
              </div>
              <div>
                <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Expected Output (Text)</div>
                <textarea
                  className="input"
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 80, fontFamily: 'monospace' }}
                  value={tc.expected_text}
                  onChange={(e) => updateTestCase(tc.id, 'expected_text', e.target.value)}
                  placeholder="Enter expected output text..."
                  rows={4}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Input File (Alternative)</div>
                <input
                  type="file"
                  className="input"
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                  onChange={(e) => updateTestCase(tc.id, 'input_file', e.target.files?.[0] || null)}
                  accept=".txt,.in"
                />
                {tc.input_file && <div style={{ marginTop: 4, fontSize: '0.9em', color: '#666' }}>Selected: {tc.input_file.name}</div>}
              </div>
              <div>
                <div style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Expected Output File (Alternative)</div>
                <input
                  type="file"
                  className="input"
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
                  onChange={(e) => updateTestCase(tc.id, 'expected_file', e.target.files?.[0] || null)}
                  accept=".txt,.out"
                />
                {tc.expected_file && <div style={{ marginTop: 4, fontSize: '0.9em', color: '#666' }}>Selected: {tc.expected_file.name}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onComplete}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Question'}
        </button>
      </div>
    </div>
  )
}

