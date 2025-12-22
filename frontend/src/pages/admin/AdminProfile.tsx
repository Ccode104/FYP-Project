import { useState, useEffect } from 'react';
import { getUserProfile, updateUserProfile } from '../../services/users';
import type { UserProfile } from '../../services/users';
import { useToast } from '../../components/ToastProvider';
import Modal from '../../components/Modal';
import './AdminProfile.css';

export default function AdminProfile() {
  const { push } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getUserProfile();
      setProfile(data);
    } catch (err: unknown) {
      push({ kind: 'error', message: err?.message || 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (profile) {
      setEditForm({
        name: profile.name,
        email: profile.email,
      });
      setEditModal(true);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates: unknown = {};
      if (editForm.name !== profile?.name) updates.name = editForm.name;
      if (editForm.email !== profile?.email) updates.email = editForm.email;

      if (Object.keys(updates).length === 0) {
        setEditModal(false);
        return;
      }

      await updateUserProfile(updates);
      push({ kind: 'success', message: 'Profile updated successfully' });
      setEditModal(false);
      loadProfile();
    } catch (err: unknown) {
      push({ kind: 'error', message: err?.message || 'Failed to update profile' });
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
    <div className="container container-wide profile-page admin-theme">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{profile.name}</h1>
          <div className="profile-role">
            <span className="role-badge admin">Administrator</span>
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

        {/* System Overview */}
        {profile.systemStats && (
          <section className="profile-section">
            <h2>System Overview</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-value">{profile.systemStats.total_users}</div>
                  <div className="stat-label">Total Users</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎓</div>
                <div className="stat-content">
                  <div className="stat-value">{profile.systemStats.total_students}</div>
                  <div className="stat-label">Students</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👨‍🏫</div>
                <div className="stat-content">
                  <div className="stat-value">{profile.systemStats.total_faculty}</div>
                  <div className="stat-label">Faculty</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🧑‍💼</div>
                <div className="stat-content">
                  <div className="stat-value">{profile.systemStats.total_tas}</div>
                  <div className="stat-label">Teaching Assistants</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-content">
                  <div className="stat-value">{profile.systemStats.total_courses}</div>
                  <div className="stat-label">Courses</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🏫</div>
                <div className="stat-content">
                  <div className="stat-value">{profile.systemStats.total_offerings}</div>
                  <div className="stat-label">Course Offerings</div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Profile"
        actions={
          <>
            <button className="btn" onClick={() => setEditModal(false)}>Cancel</button>
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
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
