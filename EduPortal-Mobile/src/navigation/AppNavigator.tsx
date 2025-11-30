import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardPathForRole } from '../contexts/AuthContext'

// Import screens
import LoginScreen from '../screens/LoginScreen'
import StudentDashboard from '../screens/StudentDashboard'
import TeacherDashboard from '../screens/TeacherDashboard'
import TADashboard from '../screens/TADashboard'
import AdminDashboard from '../screens/AdminDashboard'

const Stack = createStackNavigator()

export default function AppNavigator() {
  const { user, loading } = useAuth()

  if (loading) {
    // You could return a loading screen here
    return null
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Authenticated user - show their dashboard
          <>
            {user.role === 'student' && (
              <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
            )}
            {user.role === 'teacher' && (
              <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
            )}
            {user.role === 'ta' && (
              <Stack.Screen name="TADashboard" component={TADashboard} />
            )}
            {user.role === 'admin' && (
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
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