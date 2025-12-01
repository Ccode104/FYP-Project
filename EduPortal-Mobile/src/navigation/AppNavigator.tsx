 import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardPathForRole } from '../contexts/AuthContext'
import { RootStackParamList } from '../types/navigation'

// Import screens
import LoginScreen from '../screens/LoginScreen'
import StudentDashboard from '../screens/StudentDashboard'
import TeacherDashboard from '../screens/TeacherDashboard'
import TADashboard from '../screens/TADashboard'
import AdminDashboard from '../screens/AdminDashboard'
import CoursesScreen from '../screens/CoursesScreen'
import AssignmentsScreen from '../screens/AssignmentsScreen'
import QuizzesScreen from '../screens/QuizzesScreen'
import ProgressScreen from '../screens/ProgressScreen'
import DiscussionForum from '../screens/DiscussionForum'
import Messaging from '../screens/Messaging'
import Achievements from '../screens/Achievements'
import LiveLectures from '../screens/LiveLectures'
import Videos from '../screens/Videos'
import Resources from '../screens/Resources'
import SupportTickets from '../screens/SupportTickets'
import Viva from '../screens/Viva'
import Chatbot from '../screens/Chatbot'
import Leaderboard from '../screens/Leaderboard'
import Profile from '../screens/Profile'
import CourseDetails from '../screens/CourseDetails'
import AssignmentDetails from '../screens/AssignmentDetails'
import AssignmentSubmissionScreen from '../screens/AssignmentSubmissionScreen'
import QuizTakeScreen from '../screens/QuizTakeScreen'

const Stack = createStackNavigator<RootStackParamList>()

export default function AppNavigator() {
  const { user, loading } = useAuth()

  if (loading) {
    // You could return a loading screen here
    return null
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {user ? (
          // Authenticated user - show their dashboard
          <>
            {user.role === 'student' && (
              <>
                <Stack.Screen name="StudentDashboard" component={StudentDashboard} options={{ headerShown: false }} />
                <Stack.Screen name="Courses" component={CoursesScreen} />
                <Stack.Screen name="Assignments" component={AssignmentsScreen} />
                <Stack.Screen name="Quizzes" component={QuizzesScreen} />
                <Stack.Screen name="Progress" component={ProgressScreen} />
                <Stack.Screen name="DiscussionForum" component={DiscussionForum} />
                <Stack.Screen name="Messaging" component={Messaging} />
                <Stack.Screen name="Achievements" component={Achievements} />
                <Stack.Screen name="LiveLectures" component={LiveLectures} />
                <Stack.Screen name="Videos" component={Videos} />
                <Stack.Screen name="Resources" component={Resources} />
                <Stack.Screen name="SupportTickets" component={SupportTickets} />
                <Stack.Screen name="Viva" component={Viva} />
                <Stack.Screen name="Chatbot" component={Chatbot} />
                <Stack.Screen name="Leaderboard" component={Leaderboard} />
                <Stack.Screen name="Profile" component={Profile} />
                <Stack.Screen name="CourseDetails" component={CourseDetails} />
                <Stack.Screen name="AssignmentDetails" component={AssignmentDetails} />
                <Stack.Screen name="AssignmentSubmission" component={AssignmentSubmissionScreen} />
                <Stack.Screen name="QuizTake" component={QuizTakeScreen} />
              </>
            )}
            {user.role === 'teacher' && (
              <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} options={{ headerShown: false }} />
            )}
            {user.role === 'ta' && (
              <Stack.Screen name="TADashboard" component={TADashboard} options={{ headerShown: false }} />
            )}
            {user.role === 'admin' && (
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }} />
            )}
          </>
        ) : (
          // Not authenticated - show login
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}