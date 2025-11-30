import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import { useAuth } from '../contexts/AuthContext'

interface UserProfile {
  id: number
  name: string
  email: string
  role: string
  profile?: {
    bio?: string
    phone?: string
    department?: string
  }
}

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    email: '',
    bio: '',
    phone: '',
    department: '',
  })

  useEffect(() => {
    if (user) {
      setProfile(user as UserProfile)
      setEditedProfile({
        name: user.name || '',
        email: user.email || '',
        bio: user.profile?.bio || '',
        phone: user.profile?.phone || '',
        department: user.profile?.department || '',
      })
    }
  }, [user])

  const handleSave = () => {
    // Here you would call an API to update the profile
    Alert.alert('Success', 'Profile updated successfully!')
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedProfile({
      name: profile?.name || '',
      email: profile?.email || '',
      bio: profile?.profile?.bio || '',
      phone: profile?.profile?.phone || '',
      department: profile?.profile?.department || '',
    })
    setIsEditing(false)
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>Loading profile...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <View style={styles.content}>
        {!isEditing ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{profile.name}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{profile.email}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Role</Text>
              <Text style={styles.value}>{profile.role}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <Text style={styles.value}>{profile.profile?.bio || 'Not set'}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{profile.profile?.phone || 'Not set'}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Department</Text>
              <Text style={styles.value}>{profile.profile?.department || 'Not set'}</Text>
            </View>

            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.editText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={editedProfile.name}
                onChangeText={(text) => setEditedProfile(prev => ({ ...prev, name: text }))}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={editedProfile.email}
                onChangeText={(text) => setEditedProfile(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editedProfile.bio}
                onChangeText={(text) => setEditedProfile(prev => ({ ...prev, bio: text }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={editedProfile.phone}
                onChangeText={(text) => setEditedProfile(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Department</Text>
              <TextInput
                style={styles.input}
                value={editedProfile.department}
                onChangeText={(text) => setEditedProfile(prev => ({ ...prev, department: text }))}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#666',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  input: {
    fontSize: 16,
    color: '#333',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  editText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})