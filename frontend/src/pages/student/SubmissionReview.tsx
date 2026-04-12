import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCourse } from '../../context/CourseContext'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../services/api'
import TeacherCodeSubmissionViewer from '../../components/course/TeacherCodeSubmissionViewer'
import './CodeSubmissionView.css'

interface SubmissionData {
  id?: string | number
  code?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export default function SubmissionReview() {
  const { submissionId } = useParams()
  const { setCourseTitle } = useCourse()
  const toast = useToast()
  const [submission, setSubmission] = useState<SubmissionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const push = (opts: { kind?: 'success' | 'error' | string; message?: string }) => {
    if (toast && typeof (toast as unknown).push === 'function') {
      ;(toast as unknown).push(opts)
    } else {
      console.log(opts)
    }
  }

  const loadSubmission = useCallback(async () => {
    if (!submissionId) return
    setLoading(true)
    try {
      const data = await apiFetch<{ submission: SubmissionData }>(`/api/submissions/${submissionId}`)
      setSubmission(data.submission)
      setError(null)
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to load submission')
      setSubmission(null)
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    void loadSubmission()
  }, [loadSubmission])

  useEffect(() => {
    if (submission) {
      setCourseTitle(`Submission ${submission.id} - Review`)
    } else {
      setCourseTitle('Submission Review')
    }

    return () => {
      setCourseTitle(null)
    }
  }, [submission, setCourseTitle])


  const handleGrade = async (score: number, feedback: string) => {
    if (!submission?.id) return
    try {
      await apiFetch('/api/submissions/grade', {
        method: 'POST',
        body: {
          submission_id: submission.id,
          score,
          feedback
        }
      })
      push({ kind: 'success', message: 'Submission graded successfully' })
      await loadSubmission()
    } catch (err: unknown) {
      push({ kind: 'error', message: (err as Error)?.message || 'Failed to grade submission' })
    }
  }

  return (
    <div className="code-submission-view" style={{ minHeight: '100%' }}>
      {loading ? (
        <div className="code-submission-body">Loading submission...</div>
      ) : error ? (
        <div className="code-submission-body" style={{ color: '#dc2626' }}>{error}</div>
      ) : !submission ? (
        <div className="code-submission-body">No submission found.</div>
      ) : submission.code && submission.code.length > 0 ? (
        <TeacherCodeSubmissionViewer
          submission={submission}
          onGrade={handleGrade}
          push={push}
        />
      ) : (
        <div className="code-submission-body muted">No code submissions were found for this entry.</div>
      )}
    </div>
  )
}
