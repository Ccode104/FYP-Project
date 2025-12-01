import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { AuthProvider } from './src/contexts/AuthContext'
import { ThemeProvider } from './src/contexts/ThemeContext'
import AppNavigator from './src/navigation/AppNavigator'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
