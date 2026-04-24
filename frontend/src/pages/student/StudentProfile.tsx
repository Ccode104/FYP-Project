import { useState, useEffect, useCallback } from 'react';
import { getUserProfile, updateUserProfile } from '../../features/users/api/users';
import type { UserProfile } from '../../features/users/api/users';
import { useToast } from '../../components/ToastProvider';
import { apiFetch } from '../../services/api';
import UserStats from '../../components/UserStats';
import Modal from '../../components/Modal';
import SupportTicketList from '../../components/SupportTicketList';
import SupportTicketForm from '../../components/SupportTicketForm';
import './StudentProfile.css';

export default function StudentProfile() {
  const { push } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', roll_number: '' });
  const [saving, setSaving] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(true);

  const checkGoogleStatus = async () => {
    try {
      setGoogleLoading(true);
      const data = await apiFetch<{ connected: boolean }>('/api/auth/google/status');
      setGoogleConnected(data.connected);
    } catch {
      setGoogleConnected(false);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const data = await apiFetch<{ authUrl: string }>('/api/auth/google');
      sessionStorage.setItem('google_oauth_return_url', window.location.href);
      const oauthWindow = window.open(data.authUrl, 'Google OAuth', 'width=500,height=600');
      const checkInterval = setInterval(async () => {
        try {
          const statusData = await apiFetch<{ connected: boolean }>('/api/auth/google/status');
          if (statusData.connected) {
            clearInterval(checkInterval);
            setGoogleConnected(true);
            oauthWindow?.close();
          }
        } catch {
          // Continue polling
        }
      }, 2000);
      setTimeout(() => clearInterval(checkInterval), 60000);
    } catch (err: unknown) {
      push({ kind: 'error', message: err?.message || 'Failed to connect Google account' });
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await apiFetch('/api/auth/google/disconnect', { method: 'POST' });
      setGoogleConnected(false);
      push({ kind: 'success', message: 'Google account disconnected' });
    } catch (err: unknown) {
      push({ kind: 'error', message: err?.message || 'Failed to disconnect Google account' });
    }
  };

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserProfile();
      setProfile(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      push({ kind: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    loadProfile();
    checkGoogleStatus();
  }, []);

  const handleEdit = () => {
    if (profile) {
      setEditForm({
        name: profile.name,
        email: profile.email,
        roll_number: profile.roll_number || '',
      });
      setEditModal(true);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates: Record<string, unknown> = {};
      if (editForm.name !== profile?.name) updates.name = editForm.name;
      if (editForm.email !== profile?.email) updates.email = editForm.email;
      if (editForm.roll_number !== profile?.roll_number) updates.roll_number = editForm.roll_number;

      if (Object.keys(updates).length === 0) {
        setEditModal(false);
        return;
      }

      await updateUserProfile(updates);
      push({ kind: 'success', message: 'Profile updated successfully' });
      setEditModal(false);
      loadProfile(); // Reload profile
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      push({ kind: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container container-wide profile-page">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container container-wide profile-page">
        <p>Unable to load profile</p>
      </div>
    );
  }

  return (
    <div className="container container-wide profile-page student-theme">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">{profile.name.charAt(0).toUpperCase()}</div>
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{profile.name}</h1>
          <div className="profile-role">
            <span className="role-badge student">Student</span>
          </div>
          <p className="profile-email">{profile.email}</p>
          <button className="btn btn-secondary" onClick={handleEdit}>
            Edit Profile
          </button>
        </div>
      </div>

      <div className="profile-content">
        {/* Basic Information */}
        <section className="profile-section">
          <h2>Basic Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Full Name</label>
              <span>{profile.name}</span>
            </div>
            <div className="info-item">
              <label>Email</label>
              <span>{profile.email}</span>
            </div>
            <div className="info-item">
              <label>Department</label>
              <span>{profile.department_name || 'Not assigned'}</span>
            </div>
            <div className="info-item">
              <label>Roll Number</label>
              <span>{profile.roll_number || 'Not set'}</span>
            </div>
            <div className="info-item">
              <label>Account Status</label>
              <span className={profile.is_active ? 'status-active' : 'status-inactive'}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="info-item">
              <label>Member Since</label>
              <span>{new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </section>

        {/* Google Account Integration */}
        <section className="profile-section">
          <h2>Google Account</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            Connect your Google account for submission features
          </p>
          <div className="info-grid">
            <div className="info-item">
              <label>Status</label>
              {googleLoading ? (
                <span>Checking...</span>
              ) : googleConnected ? (
                <span className="status-active">Connected</span>
              ) : (
                <span className="status-inactive">Not Connected</span>
              )}
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            {googleConnected ? (
              <button className="btn btn-secondary" onClick={handleDisconnectGoogle}>
                Disconnect Google Account
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleConnectGoogle}>
                Connect Google Account
              </button>
            )}
          </div>
        </section>

        {/* Enrolled Courses */}
        <section className="profile-section">
          <h2>Enrolled Courses</h2>
          {profile.enrolledCourses && profile.enrolledCourses.length > 0 ? (
            <div className="courses-list">
              {profile.enrolledCourses.map(course => (
                <div key={course.enrolled_at} className="course-item">
                  <div className="course-info">
                    <h3>
                      {course.course_code} - {course.course_title}
                    </h3>
                    <p>
                      Term: {course.term} {course.section ? `Section ${course.section}` : ''}
                    </p>
                    <p>Instructor: {course.faculty_name || 'TBA'}</p>
                    <p>
                      Enrolled: {course.enrolled_students}/{course.max_capacity || 'Unlimited'}
                    </p>
                  </div>
                  <div className="enrollment-date">
                    Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No courses enrolled yet.</p>
          )}
        </section>

        {/* Gamification Stats */}
        <section className="profile-section">
          <h2>Gamification Statistics</h2>
          <UserStats />
        </section>

        {/* Achievements */}
        {profile.achievements && profile.achievements.length > 0 && (
          <section className="profile-section">
            <h2>Achievements</h2>
            <div className="achievements-grid">
              {profile.achievements.map(achievement => (
                <div key={achievement.unlocked_at} className="achievement-card">
                  <div className="achievement-icon">{achievement.icon || '🏆'}</div>
                  <div className="achievement-info">
                    <h3>{achievement.name}</h3>
                    <p>{achievement.description}</p>
                    <span className={`rarity ${achievement.rarity}`}>{achievement.rarity}</span>
                    <small>
                      Unlocked: {new Date(achievement.unlocked_at).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Support Tickets */}
        <section className="profile-section">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2>Support Tickets</h2>
            <button className="btn btn-primary" onClick={() => setShowTicketForm(true)}>
              Create Ticket
            </button>
          </div>
          <SupportTicketList showAllTickets={false} />
        </section>
      </div>

      {/* Support Ticket Form Modal */}
      <Modal
        open={showTicketForm}
        onClose={() => setShowTicketForm(false)}
        title="Create Support Ticket"
      >
        <SupportTicketForm
          onTicketCreated={() => {
            setShowTicketForm(false);
            push({ kind: 'success', message: 'Support ticket created successfully' });
          }}
          onClose={() => setShowTicketForm(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Profile"
        actions={
          <>
            <button className="btn" onClick={() => setEditModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="form">
          <label className="field">
            <span className="label">Full Name</span>
            <input
              className="input"
              type="text"
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              value={editForm.email}
              onChange={e => setEditForm({ ...editForm, email: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="label">Roll Number</span>
            <input
              className="input"
              type="text"
              value={editForm.roll_number}
              onChange={e => setEditForm({ ...editForm, roll_number: e.target.value })}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
