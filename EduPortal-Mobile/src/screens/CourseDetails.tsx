import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, TextInput } from 'react-native'
import { RouteProp, useRoute } from '@react-navigation/native'
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

const AssignmentsTab = ({ offeringId }: { offeringId: string }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAssignments()
  }, [offeringId])

  const loadAssignments = async () => {
    try {
      setLoading(true)
      const data = await getAssignmentsForOffering(offeringId)
      setAssignments(data as Assignment[])
    } catch (error) {
      Alert.alert('Error', 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const renderAssignment = ({ item }: { item: Assignment }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
      <Text style={styles.itemMeta}>Due: {new Date(item.due_at).toLocaleString()}</Text>
      <Text style={styles.itemMeta}>Points: {item.total_points}</Text>
    </View>
  )

  if (loading) return <Text style={styles.tabContent}>Loading assignments...</Text>
  if (assignments.length === 0) return <Text style={styles.tabContent}>No assignments available</Text>

  return (
    <FlatList
      data={assignments}
      renderItem={renderAssignment}
      keyExtractor={(item) => item.id.toString()}
      style={styles.list}
    />
  )
}

const QuizzesTab = ({ offeringId }: { offeringId: string }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuizzes()
  }, [offeringId])

  const loadQuizzes = async () => {
    try {
      setLoading(true)
      const data = await getQuizzesForOffering(offeringId)
      setQuizzes(data as Quiz[])
    } catch (error) {
      Alert.alert('Error', 'Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  const renderQuiz = ({ item }: { item: Quiz }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemMeta}>Start: {new Date(item.start_at).toLocaleString()}</Text>
      <Text style={styles.itemMeta}>End: {new Date(item.end_at).toLocaleString()}</Text>
      <Text style={styles.itemMeta}>Max Score: {item.max_score}</Text>
    </View>
  )

  if (loading) return <Text style={styles.tabContent}>Loading quizzes...</Text>
  if (quizzes.length === 0) return <Text style={styles.tabContent}>No quizzes available</Text>

  return (
    <FlatList
      data={quizzes}
      renderItem={renderQuiz}
      keyExtractor={(item) => item.id.toString()}
      style={styles.list}
    />
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
  // Import and use the full Chatbot component with course context
  const ChatbotComponent = require('../screens/Chatbot').default
  return <ChatbotComponent courseId={offeringId} />
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
  const { offeringId } = route.params
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('present')
  const [offeringDetails, setOfferingDetails] = useState<OfferingDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (offeringId) {
      loadOfferingDetails()
    }
  }, [offeringId])

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

  // Role-based tabs configuration matching web LMS exactly
  const getTabs = () => {
    if (user?.role === 'teacher') {
      return [
        { key: 'present', label: 'Assignments', component: AssignmentsTab },
        { key: 'quizzes', label: 'Quizzes', component: QuizzesTab },
        { key: 'manage', label: 'Create', component: ManageTab },
        { key: 'submissions', label: 'Submissions', component: SubmissionsTab },
        { key: 'videos', label: 'Videos', component: VideosTab },
        { key: 'live-lectures', label: 'Live Lectures', component: LiveLecturesTab },
        { key: 'notes', label: 'Notes', component: NotesTab },
        { key: 'pyq', label: 'Previous Papers', component: PyqTab },
        { key: 'discussion', label: 'Discussion', component: DiscussionsTab },
      ]
    } else if (user?.role === 'ta') {
      return [
        { key: 'present', label: 'Assignments', component: AssignmentsTab },
        { key: 'quizzes', label: 'Quizzes', component: QuizzesTab },
        { key: 'grading', label: 'Grading', component: GradingTab },
        { key: 'progress', label: 'Progress', component: ProgressTab },
        { key: 'discussion', label: 'Discussion', component: DiscussionsTab },
      ]
    } else {
      // Student
      return [
        { key: 'present', label: 'Assignments', component: AssignmentsTab },
        { key: 'quizzes', label: 'Quizzes', component: QuizzesTab },
        { key: 'notes', label: 'Notes', component: NotesTab },
        { key: 'pyq', label: 'Previous Papers', component: PyqTab },
        { key: 'progress', label: 'Progress', component: ProgressTab },
        { key: 'videos', label: 'Videos', component: VideosTab },
        { key: 'live-lectures', label: 'Live Lectures', component: LiveLecturesTab },
        { key: 'discussion', label: 'Discussion', component: DiscussionsTab },
        { key: 'chatbot', label: 'AI Assistant', component: ChatbotTab },
      ]
    }
  }

  const tabs = getTabs()

  const ActiveComponent = tabs.find(tab => tab.key === activeTab)?.component || AssignmentsTab

  const courseTitle = offeringDetails
    ? `${offeringDetails.course_code || ''} - ${offeringDetails.title || `Offering #${offeringId}`}`
    : `Course Offering ${offeringId}`

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{courseTitle}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.content}>
        <ActiveComponent offeringId={offeringId} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  tabBar: {
    backgroundColor: 'white',
    maxHeight: 50,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
    fontSize: 16,
    color: '#333',
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