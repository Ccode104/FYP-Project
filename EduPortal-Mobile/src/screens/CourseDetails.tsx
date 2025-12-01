import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, TextInput, Modal } from 'react-native'
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/navigation'
import { listDiscussionMessages, DiscussionMessage } from '../services/discussion'
import { getVideosByCourseOffering } from '../services/videos'
import { getQuizzesForOffering } from '../services/quizzes'
import { getAssignmentsForOffering } from '../services/assignments'
import { apiFetch } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getMyProgress } from '../services/progress'
import { createAssignment, getAssignmentSubmissions, gradeSubmission } from '../services/assignments'
import { getTAAssignments, getGradingSubmissions, submitGrading } from '../services/ta'
import SidebarNav from '../components/SidebarNav'
import QuizCard from '../components/QuizCard'
import AssignmentCard from '../components/AssignmentCard'
import MobileCodeEditor from '../components/MobileCodeEditor'

interface Assignment {
  id: number
  title: string
  description?: string
  due_at: string
  total_points: number
}

interface Quiz {
  id: number
  title: string
  start_at: string
  end_at: string
  max_score: number
}

interface Video {
  id: number
  title: string
  description?: string
  url: string
}

const AssignmentsTab = ({ offeringId, navigation }: { offeringId: string; navigation: any }) => {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<any[]>([])
  const [mySubmissions, setMySubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [codeEditorVisible, setCodeEditorVisible] = useState(false)
  const [selectedCodeAssignment, setSelectedCodeAssignment] = useState<any>(null)

  useEffect(() => {
    loadAssignments()
  }, [offeringId, user])

  const loadAssignments = async () => {
    try {
      setLoading(true)

      const assignmentsData = await getAssignmentsForOffering(offeringId)

      const safeAssignments = Array.isArray(assignmentsData) ? assignmentsData : []
      setAssignments(safeAssignments)

      // Load student's submissions if user is student and authenticated
      if (user?.role === 'student' && user?.id && user?.email) {
        try {
          const submissions = await apiFetch<any[]>(`/student/courses/${offeringId}/submissions`)
          setMySubmissions(submissions || [])
        } catch (submissionsError: any) {
          console.error('Failed to load submissions:', submissionsError?.message || submissionsError)
          // Don't show alert for submissions loading failure, just log it
          setMySubmissions([])
        }
      } else {
        setMySubmissions([])
      }
    } catch (error: any) {
      console.error('❌ [ERROR] Failed to load assignments:', error)
      console.error('❌ [ERROR] Assignment loading error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        status: error?.status
      })
      Alert.alert('Error', 'Failed to load assignments')
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  // Process assignments with submission status
  const processedAssignments = assignments
    .filter((assignment: any) => assignment && typeof assignment === 'object') // Filter out null/undefined/invalid objects
    .map((assignment: any) => {
      const submission = mySubmissions.find((s: any) => s?.assignment_id === assignment.id)
      return {
        ...assignment,
        isSubmitted: !!submission,
        // Ensure assignment_type exists with fallback
        assignment_type: assignment.assignment_type || 'file'
      }
    })
    .filter(Boolean) // Remove any remaining invalid assignments

  if (loading) return <Text style={styles.tabContent}>Loading assignments...</Text>
  if (!Array.isArray(processedAssignments) || processedAssignments.length === 0) return <Text style={styles.tabContent}>No assignments available</Text>

  const handleAssignmentAction = (assignment: any) => {
    if (assignment?.is_quiz) {
      // Navigate to quiz
      Alert.alert('Start Quiz', `Quiz ${assignment?.quiz_id} would start here`)
    } else if (assignment?.assignment_type === 'code') {
      // Open code editor
      setSelectedCodeAssignment(assignment)
      setCodeEditorVisible(true)
    } else if (assignment?.assignment_type === 'pdf' || assignment?.assignment_type === 'ppt' || assignment?.assignment_type === 'mixed') {
      // Navigate to submission screen
      navigation.navigate('AssignmentSubmission', { assignment })
    }
  }


  const handleCodeEditorClose = () => {
    setCodeEditorVisible(false)
    setSelectedCodeAssignment(null)
  }

  const handleCodeSubmissionSuccess = () => {
    // Reload assignments to update submission status
    loadAssignments()
    handleCodeEditorClose()
  }

  return (
    <>
      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 20 }}>
        {processedAssignments.map((assignment: any) => {
          if (!assignment || typeof assignment !== 'object') return null;
          return (
            <AssignmentCard
              key={assignment.id || Math.random()}
              assignment={assignment}
              userRole={user?.role}
              onPress={() => {
                // Handle different assignment types for press action
                if (user?.role === 'student' && (assignment?.assignment_type === 'pdf' || assignment?.assignment_type === 'ppt' || assignment?.assignment_type === 'mixed')) {
                  navigation.navigate('AssignmentSubmission', { assignment })
                }
              }}
              onAction={() => handleAssignmentAction(assignment)}
              onViewDetails={() => {
                // Navigate to detailed assignment view
                navigation.navigate('AssignmentDetails', { assignmentId: assignment?.id?.toString() || '' })
              }}
              actionLabel={
                assignment?.is_quiz ? 'Start Quiz' :
                assignment?.assignment_type === 'code' ? (assignment?.isSubmitted ? 'View Submission' : 'Code Editor') :
                assignment?.assignment_type === 'pdf' ? 'Submit PDF' :
                assignment?.assignment_type === 'ppt' ? 'Submit PPT' :
                assignment?.assignment_type === 'mixed' ? 'Submit Repository' : 'View Details'
              }
            />
          );
        })}
      </ScrollView>


      {/* Code Editor Modal */}
      <Modal
        visible={codeEditorVisible}
        animationType="slide"
        onRequestClose={handleCodeEditorClose}
      >
        {selectedCodeAssignment && (
          <MobileCodeEditor
            assignmentId={selectedCodeAssignment.id}
            assignmentTitle={selectedCodeAssignment.title}
            onClose={handleCodeEditorClose}
            onSuccess={handleCodeSubmissionSuccess}
          />
        )}
      </Modal>
    </>
  )
}

const QuizzesTab = ({ offeringId }: { offeringId: string }) => {
  const { user } = useAuth()
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [myQuizAttempts, setMyQuizAttempts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuizzes()
  }, [offeringId, user])

  const loadQuizzes = async () => {
    try {
      setLoading(true)
      const quizzesData = await getQuizzesForOffering(offeringId)
      setQuizzes(Array.isArray(quizzesData) ? quizzesData : [])

      // Load student's quiz attempts if user is student
      if (user?.role === 'student' && user?.id) {
        try {
          const attempts = await apiFetch<any[]>(`/api/students/${user.id}/quiz-attempts`)
          setMyQuizAttempts(attempts || [])
        } catch (attemptsError) {
          console.error('Failed to load quiz attempts:', attemptsError)
          setMyQuizAttempts([])
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load quizzes')
      setQuizzes([])
    } finally {
      setLoading(false)
    }
  }

  // Process quizzes with attempt status
  const processedQuizzes = quizzes.map((quiz: any) => {
    const quizAttempts = myQuizAttempts.filter((a: any) => a.quiz_id === quiz.id)
    const hasViolatedAttempt = quizAttempts.some((a: any) => a.violated)
    return {
      id: quiz.id,
      title: quiz.title,
      due_at: quiz.end_at || quiz.due_at,
      release_at: quiz.start_at,
      is_quiz: true,
      quiz_id: quiz.id,
      is_proctored: quiz.is_proctored,
      time_limit: quiz.time_limit,
      isSubmitted: quizAttempts.length > 0,
      isViolated: hasViolatedAttempt
    }
  })

  if (loading) return <Text style={styles.tabContent}>Loading quizzes...</Text>
  if (processedQuizzes.length === 0) return <Text style={styles.tabContent}>No quizzes available</Text>

  return (
    <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 20 }}>
      {processedQuizzes.map((quiz: any) => (
        <QuizCard
          key={quiz.id}
          quiz={quiz}
          userRole={user?.role}
          onStartQuiz={() => {
            // Navigate to quiz (placeholder for now)
            Alert.alert('Start Quiz', `Quiz ${quiz.quiz_id} would start here`)
          }}
          onViewResults={() => {
            // Find the attempt and show results
            const attempt = myQuizAttempts.find((a: any) => a.quiz_id === quiz.quiz_id)
            if (attempt) {
              // This would need to be handled by parent component
              Alert.alert('View Results', 'Results modal would open here')
            }
          }}
        />
      ))}
    </ScrollView>
  )
}

const DiscussionsTab = ({ offeringId }: { offeringId: string }) => {
  const [messages, setMessages] = useState<DiscussionMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDiscussions()
  }, [offeringId])

  const loadDiscussions = async () => {
    try {
      setLoading(true)
      const data = await listDiscussionMessages(offeringId)
      setMessages(data)
    } catch (error) {
      Alert.alert('Error', 'Failed to load discussions')
    } finally {
      setLoading(false)
    }
  }

  const renderMessage = ({ item }: { item: DiscussionMessage }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>{item.author_name || 'Anonymous'}</Text>
      <Text style={styles.itemDescription}>{item.content}</Text>
      <Text style={styles.itemMeta}>{new Date(item.created_at).toLocaleString()}</Text>
    </View>
  )

  if (loading) return <Text style={styles.tabContent}>Loading discussions...</Text>
  if (messages.length === 0) return <Text style={styles.tabContent}>No discussions yet</Text>

  return (
    <FlatList
      data={messages}
      renderItem={renderMessage}
      keyExtractor={(item) => item.id.toString()}
      style={styles.list}
    />
  )
}

const VideosTab = ({ offeringId }: { offeringId: string }) => {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVideos()
  }, [offeringId])

  const loadVideos = async () => {
    try {
      setLoading(true)
      const data = await getVideosByCourseOffering(offeringId)
      setVideos(data)
    } catch (error) {
      Alert.alert('Error', 'Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  const renderVideo = ({ item }: { item: Video }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
      <TouchableOpacity style={styles.playButton}>
        <Text style={styles.playText}>Play Video</Text>
      </TouchableOpacity>
    </View>
  )

  if (loading) return <Text style={styles.tabContent}>Loading videos...</Text>
  if (videos.length === 0) return <Text style={styles.tabContent}>No videos available</Text>

  return (
    <FlatList
      data={videos}
      renderItem={renderVideo}
      keyExtractor={(item) => item.id.toString()}
      style={styles.list}
    />
  )
}

const ResourcesTab = ({ offeringId }: { offeringId: string }) => {
  // Placeholder for now - would need to implement resources API
  return <Text style={styles.tabContent}>Resources for offering {offeringId}</Text>
}

const PyqTab = ({ offeringId }: { offeringId: string }) => {
  const [pyqs, setPyqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPyqs()
  }, [offeringId])

  const loadPyqs = async () => {
    try {
      setLoading(true)
      const data = await apiFetch(`/courses/${offeringId}/pyqs`)
      setPyqs((data as any[]) || [])
    } catch (error) {
      Alert.alert('Error', 'Failed to load PYQs')
    } finally {
      setLoading(false)
    }
  }

  const renderPyq = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
      <TouchableOpacity style={styles.downloadButton}>
        <Text style={styles.downloadText}>Download</Text>
      </TouchableOpacity>
    </View>
  )

  if (loading) return <Text style={styles.tabContent}>Loading PYQs...</Text>
  if (pyqs.length === 0) return <Text style={styles.tabContent}>No previous year questions available</Text>

  return (
    <FlatList
      data={pyqs}
      renderItem={renderPyq}
      keyExtractor={(item) => item.id.toString()}
      style={styles.list}
    />
  )
}

const NotesTab = ({ offeringId }: { offeringId: string }) => {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotes()
  }, [offeringId])

  const loadNotes = async () => {
    try {
      setLoading(true)
      const data = await apiFetch(`/courses/${offeringId}/notes`)
      setNotes((data as any[]) || [])
    } catch (error) {
      Alert.alert('Error', 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  const renderNote = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
      <TouchableOpacity style={styles.downloadButton}>
        <Text style={styles.downloadText}>Download</Text>
      </TouchableOpacity>
    </View>
  )

  if (loading) return <Text style={styles.tabContent}>Loading notes...</Text>
  if (notes.length === 0) return <Text style={styles.tabContent}>No course notes available</Text>

  return (
    <FlatList
      data={notes}
      renderItem={renderNote}
      keyExtractor={(item) => item.id.toString()}
      style={styles.list}
    />
  )
}

const ProgressTab = ({ offeringId }: { offeringId: string }) => {
  const { user } = useAuth()
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProgress()
  }, [offeringId, user])

  const loadProgress = async () => {
    try {
      setLoading(true)
      if (user?.role === 'student') {
        const data = await getMyProgress()
        setProgress(data)
      } else {
        // For teachers/TAs, show basic course info
        setProgress({ courseName: `Course ${offeringId}`, totalStudents: 0, assignmentsSubmitted: 0 })
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load progress')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Text style={styles.tabContent}>Loading progress...</Text>
  if (!progress) return <Text style={styles.tabContent}>No progress data available</Text>

  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressTitle}>Course Progress</Text>
      {user?.role === 'student' ? (
        <View>
          <Text style={styles.progressItem}>Assignments Completed: {progress.assignmentsCompleted || 0}</Text>
          <Text style={styles.progressItem}>Quizzes Taken: {progress.quizzesCompleted || 0}</Text>
          <Text style={styles.progressItem}>Overall Grade: {progress.overallGrade || 'N/A'}</Text>
        </View>
      ) : (
        <View>
          <Text style={styles.progressItem}>Total Students: {progress.totalStudents || 0}</Text>
          <Text style={styles.progressItem}>Assignments Submitted: {progress.assignmentsSubmitted || 0}</Text>
          <Text style={styles.progressItem}>Average Grade: {progress.averageGrade || 'N/A'}</Text>
        </View>
      )}
    </View>
  )
}

const ChatbotTab = ({ offeringId }: { offeringId: string }) => {
  // Use mobile-optimized chatbot with security guardrails
  const MobileChatbot = require('../components/MobileChatbot').default
  return <MobileChatbot courseId={offeringId} />
}

const LiveLecturesTab = ({ offeringId }: { offeringId: string }) => {
  const [lectures, setLectures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLectures()
  }, [offeringId])

  const loadLectures = async () => {
    try {
      setLoading(true)
      const data = await apiFetch(`/live-lectures/course/${offeringId}`)
      setLectures((data as any).lectures || [])
    } catch (error) {
      Alert.alert('Error', 'Failed to load live lectures')
    } finally {
      setLoading(false)
    }
  }

  const renderLecture = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
      <Text style={styles.itemMeta}>Scheduled: {new Date(item.scheduled_at).toLocaleString()}</Text>
      <Text style={styles.itemMeta}>Status: {item.status}</Text>
      {item.status === 'live' && (
        <TouchableOpacity style={styles.joinButton}>
          <Text style={styles.joinText}>Join Lecture</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  if (loading) return <Text style={styles.tabContent}>Loading live lectures...</Text>
  if (lectures.length === 0) return <Text style={styles.tabContent}>No live lectures scheduled</Text>

  return (
    <FlatList
      data={lectures}
      renderItem={renderLecture}
      keyExtractor={(item) => item.id.toString()}
      style={styles.list}
    />
  )
}

const ManageTab = ({ offeringId }: { offeringId: string }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [totalPoints, setTotalPoints] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreateAssignment = async () => {
    if (!title.trim() || !dueDate) {
      Alert.alert('Error', 'Please fill in title and due date')
      return
    }

    setLoading(true)
    try {
      await createAssignment({
        title: title.trim(),
        description: description.trim(),
        dueDate,
        offeringId,
        totalPoints: totalPoints ? parseInt(totalPoints) : undefined
      })

      Alert.alert('Success', 'Assignment created successfully')
      setTitle('')
      setDescription('')
      setDueDate('')
      setTotalPoints('')
    } catch (error) {
      Alert.alert('Error', 'Failed to create assignment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.manageContainer}>
      <Text style={styles.manageTitle}>Create New Assignment</Text>

      <TextInput
        style={styles.input}
        placeholder="Assignment Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Assignment Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <TextInput
        style={styles.input}
        placeholder="Due Date (YYYY-MM-DD)"
        value={dueDate}
        onChangeText={setDueDate}
      />

      <TextInput
        style={styles.input}
        placeholder="Total Points (optional)"
        value={totalPoints}
        onChangeText={setTotalPoints}
        keyboardType="numeric"
      />

      <TouchableOpacity
        style={[styles.createButton, (!title.trim() || !dueDate || loading) && styles.disabledButton]}
        onPress={handleCreateAssignment}
        disabled={!title.trim() || !dueDate || loading}
      >
        <Text style={styles.createButtonText}>
          {loading ? 'Creating...' : 'Create Assignment'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const SubmissionsTab = ({ offeringId }: { offeringId: string }) => {
  const [assignments, setAssignments] = useState<any[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAssignments()
  }, [offeringId])

  const loadAssignments = async () => {
    try {
      setLoading(true)
      const data = await apiFetch(`/courses/${offeringId}/assignments`) as any[]
      setAssignments(data || [])
    } catch (error) {
      Alert.alert('Error', 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const loadSubmissions = async (assignmentId: string) => {
    try {
      const data = await getAssignmentSubmissions(assignmentId) as any
      setSubmissions(data.submissions || [])
      setSelectedAssignment(assignments.find(a => a.id.toString() === assignmentId))
    } catch (error) {
      Alert.alert('Error', 'Failed to load submissions')
    }
  }

  const renderAssignment = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.assignmentItem}
      onPress={() => loadSubmissions(item.id.toString())}
    >
      <Text style={styles.assignmentTitle}>{item.title}</Text>
      <Text style={styles.assignmentMeta}>Due: {new Date(item.due_date).toLocaleDateString()}</Text>
    </TouchableOpacity>
  )

  const renderSubmission = ({ item }: { item: any }) => (
    <View style={styles.submissionItem}>
      <Text style={styles.submissionStudent}>{item.student_name}</Text>
      <Text style={styles.submissionDate}>Submitted: {new Date(item.submitted_at).toLocaleDateString()}</Text>
      <Text style={styles.submissionStatus}>Status: {item.status}</Text>
      {item.grade && <Text style={styles.submissionGrade}>Grade: {item.grade}</Text>}
    </View>
  )

  if (loading) return <Text style={styles.tabContent}>Loading assignments...</Text>

  if (selectedAssignment) {
    return (
      <View style={styles.submissionsContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedAssignment(null)}
        >
          <Text style={styles.backText}>← Back to Assignments</Text>
        </TouchableOpacity>

        <Text style={styles.submissionsTitle}>Submissions for: {selectedAssignment.title}</Text>

        {submissions.length === 0 ? (
          <Text style={styles.noSubmissions}>No submissions yet</Text>
        ) : (
          <FlatList
            data={submissions}
            renderItem={renderSubmission}
            keyExtractor={(item) => item.id.toString()}
            style={styles.submissionsList}
          />
        )}
      </View>
    )
  }

  return (
    <View style={styles.assignmentsContainer}>
      <Text style={styles.assignmentsTitle}>Select an assignment to view submissions</Text>
      {assignments.length === 0 ? (
        <Text style={styles.noAssignments}>No assignments found</Text>
      ) : (
        <FlatList
          data={assignments}
          renderItem={renderAssignment}
          keyExtractor={(item) => item.id.toString()}
          style={styles.assignmentsList}
        />
      )}
    </View>
  )
}

const GradingTab = ({ offeringId }: { offeringId: string }) => {
  const [assignments, setAssignments] = useState<any[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAssignments()
  }, [offeringId])

  const loadAssignments = async () => {
    try {
      setLoading(true)
      const data = await getTAAssignments() as any
      // Filter assignments for this course offering
      const filteredAssignments = data.assignments?.filter((a: any) => a.course_offering_id.toString() === offeringId) || []
      setAssignments(filteredAssignments)
    } catch (error) {
      Alert.alert('Error', 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const loadSubmissions = async (assignmentId: string) => {
    try {
      const data = await getGradingSubmissions(assignmentId) as any
      setSubmissions(data.submissions || [])
      setSelectedAssignment(assignments.find(a => a.id.toString() === assignmentId))
    } catch (error) {
      Alert.alert('Error', 'Failed to load submissions')
    }
  }

  const handleGradeSubmission = async (submissionId: string, grade: string, feedback: string) => {
    if (!grade.trim()) {
      Alert.alert('Error', 'Please enter a grade')
      return
    }

    try {
      await submitGrading({
        submissionId,
        overallComments: feedback.trim() || undefined
      })
      Alert.alert('Success', 'Grade submitted successfully')
      // Reload submissions to update the list
      if (selectedAssignment) {
        loadSubmissions(selectedAssignment.id.toString())
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit grade')
    }
  }

  const renderAssignment = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.assignmentItem}
      onPress={() => loadSubmissions(item.id.toString())}
    >
      <Text style={styles.assignmentTitle}>{item.title}</Text>
      <Text style={styles.assignmentMeta}>Due: {new Date(item.due_date).toLocaleDateString()}</Text>
    </TouchableOpacity>
  )

  const renderSubmission = ({ item }: { item: any }) => (
    <View style={styles.submissionItem}>
      <Text style={styles.submissionStudent}>{item.student_name}</Text>
      <Text style={styles.submissionDate}>Submitted: {new Date(item.submitted_at).toLocaleDateString()}</Text>

      <View style={styles.gradingContainer}>
        <TextInput
          style={styles.gradeInput}
          placeholder="Grade"
          keyboardType="numeric"
          onSubmitEditing={(e) => handleGradeSubmission(item.id.toString(), e.nativeEvent.text, '')}
        />
        <TouchableOpacity
          style={styles.gradeButton}
          onPress={() => {
            // For simplicity, just grade with empty feedback
            const gradeInput = '' // Would need to get from state
            handleGradeSubmission(item.id.toString(), gradeInput, '')
          }}
        >
          <Text style={styles.gradeButtonText}>Submit Grade</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  if (loading) return <Text style={styles.tabContent}>Loading assignments...</Text>

  if (selectedAssignment) {
    return (
      <View style={styles.gradingContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedAssignment(null)}
        >
          <Text style={styles.backText}>← Back to Assignments</Text>
        </TouchableOpacity>

        <Text style={styles.gradingTitle}>Grade Submissions for: {selectedAssignment.title}</Text>

        {submissions.length === 0 ? (
          <Text style={styles.noSubmissions}>No submissions to grade</Text>
        ) : (
          <FlatList
            data={submissions}
            renderItem={renderSubmission}
            keyExtractor={(item) => item.id.toString()}
            style={styles.submissionsList}
          />
        )}
      </View>
    )
  }

  return (
    <View style={styles.assignmentsContainer}>
      <Text style={styles.assignmentsTitle}>Select an assignment to grade submissions</Text>
      {assignments.length === 0 ? (
        <Text style={styles.noAssignments}>No assignments assigned for grading</Text>
      ) : (
        <FlatList
          data={assignments}
          renderItem={renderAssignment}
          keyExtractor={(item) => item.id.toString()}
          style={styles.assignmentsList}
        />
      )}
    </View>
  )
}

type CourseDetailsRouteProp = RouteProp<RootStackParamList, 'CourseDetails'>

interface OfferingDetails {
  id: number
  course_code: string
  title: string
  description?: string
}

export default function CourseDetails() {
  const route = useRoute<CourseDetailsRouteProp>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const { offeringId } = route.params
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('present')
  const [offeringDetails, setOfferingDetails] = useState<OfferingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (offeringId) {
      loadOfferingDetails()
    }
  }, [offeringId])

  useEffect(() => {
    // Set the navigation title when offering details are loaded
    if (offeringDetails) {
      const title = `${offeringDetails.course_code || ''} - ${offeringDetails.title || `Offering #${offeringId}`}`
      navigation.setOptions({
        title: title,
      })
    }
  }, [offeringDetails, offeringId, navigation])

  const loadOfferingDetails = async () => {
    try {
      setLoading(true)
      const details = await apiFetch<OfferingDetails>(`/student/courses/${offeringId}`)
      setOfferingDetails(details)
    } catch (error) {
      console.error('Failed to load offering details:', error)
      Alert.alert('Error', 'Failed to load course details')
    } finally {
      setLoading(false)
    }
  }

  // Role-based sidebar tabs configuration
  const getSidebarTabs = () => {
    if (user?.role === 'teacher') {
      return [
        { id: 'present', label: 'Assignments', icon: '📝' },
        { id: 'quizzes', label: 'Quizzes', icon: '📋' },
        { id: 'manage', label: 'Create', icon: '➕' },
        { id: 'submissions', label: 'Submissions', icon: '📥' },
        { id: 'videos', label: 'Videos', icon: '🎥' },
        { id: 'live-lectures', label: 'Live Lectures', icon: '📹' },
        { id: 'notes', label: 'Notes', icon: '📄' },
        { id: 'pyq', label: 'Previous Papers', icon: '📚' },
        { id: 'discussion', label: 'Discussion', icon: '💬' },
      ]
    } else if (user?.role === 'ta') {
      return [
        { id: 'present', label: 'Assignments', icon: '📝' },
        { id: 'quizzes', label: 'Quizzes', icon: '📋' },
        { id: 'grading', label: 'Grading', icon: '📊' },
        { id: 'progress', label: 'Progress', icon: '📈' },
        { id: 'discussion', label: 'Discussion', icon: '💬' },
      ]
    } else {
      // Student
      return [
        { id: 'present', label: 'Assignments', icon: '📝' },
        { id: 'quizzes', label: 'Quizzes', icon: '📋' },
        { id: 'notes', label: 'Notes', icon: '📄' },
        { id: 'pyq', label: 'Previous Papers', icon: '📚' },
        { id: 'progress', label: 'Progress', icon: '📈' },
        { id: 'videos', label: 'Videos', icon: '🎥' },
        { id: 'live-lectures', label: 'Live Lectures', icon: '📹' },
        { id: 'discussion', label: 'Discussion', icon: '💬' },
        { id: 'chatbot', label: 'AI Assistant', icon: '🤖' },
      ]
    }
  }

  // Role-based component mapping
  const getTabComponents = () => {
    if (user?.role === 'teacher') {
      return {
        present: (props: any) => <AssignmentsTab {...props} navigation={navigation} />,
        quizzes: QuizzesTab,
        manage: ManageTab,
        submissions: SubmissionsTab,
        videos: VideosTab,
        'live-lectures': LiveLecturesTab,
        notes: NotesTab,
        pyq: PyqTab,
        discussion: DiscussionsTab,
      }
    } else if (user?.role === 'ta') {
      return {
        present: (props: any) => <AssignmentsTab {...props} navigation={navigation} />,
        quizzes: QuizzesTab,
        grading: GradingTab,
        progress: ProgressTab,
        discussion: DiscussionsTab,
      }
    } else {
      // Student
      return {
        present: (props: any) => <AssignmentsTab {...props} navigation={navigation} />,
        quizzes: QuizzesTab,
        notes: NotesTab,
        pyq: PyqTab,
        progress: ProgressTab,
        videos: VideosTab,
        'live-lectures': LiveLecturesTab,
        discussion: DiscussionsTab,
        chatbot: ChatbotTab,
      }
    }
  }

  const sidebarTabs = getSidebarTabs()
  const tabComponents = getTabComponents()

  const ActiveComponent = tabComponents[activeTab as keyof typeof tabComponents] || AssignmentsTab

  const courseTitle = offeringDetails
    ? `${offeringDetails.course_code || ''} - ${offeringDetails.title || `Offering #${offeringId}`}`
    : `Course Offering ${offeringId}`

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  // Get the display name for the current tab
  const getCurrentTabName = () => {
    const tab = sidebarTabs.find(t => t.id === activeTab)
    return tab ? tab.label : 'Content'
  }

  return (
    <View style={styles.container}>
      <SidebarNav
        tabs={sidebarTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(false)} // Close sidebar when toggled
      />

      <View style={styles.content}>
        <View style={styles.tabHeader}>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => setSidebarOpen(!sidebarOpen)}
          >
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.tabHeaderText}>{getCurrentTabName()}</Text>
          <View style={{ width: 40 }} /> {/* Spacer for balance */}
        </View>

        <View style={styles.tabContent}>
          <ActiveComponent offeringId={offeringId} navigation={navigation} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  tabHeader: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hamburgerButton: {
    padding: 8,
  },
  hamburgerIcon: {
    fontSize: 20,
    color: '#333',
  },
  tabHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  tabContent: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  itemMeta: {
    fontSize: 12,
    color: '#999',
  },
  playButton: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  playText: {
    color: 'white',
    fontWeight: '600',
  },
  downloadButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  downloadText: {
    color: 'white',
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  joinText: {
    color: 'white',
    fontWeight: '600',
  },
  manageContainer: {
    flex: 1,
    padding: 20,
  },
  manageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    padding: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  progressItem: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555',
  },
  assignmentsContainer: {
    flex: 1,
    padding: 20,
  },
  assignmentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  assignmentsList: {
    flex: 1,
  },
  assignmentItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  assignmentMeta: {
    fontSize: 14,
    color: '#666',
  },
  submissionsContainer: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    marginBottom: 15,
  },
  backText: {
    color: '#007bff',
    fontSize: 16,
  },
  submissionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  submissionsList: {
    flex: 1,
  },
  submissionItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submissionStudent: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  submissionDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  submissionStatus: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 3,
  },
  submissionGrade: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  noAssignments: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  noSubmissions: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  gradingContainer: {
    flex: 1,
    padding: 20,
  },
  gradingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  gradeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    flex: 1,
    fontSize: 16,
  },
  gradeButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  gradeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
})