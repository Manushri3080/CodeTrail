import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import ProfileHeader from './ProfileHeader';
import PersonalInfo from './PersonalInfo';
import ProfileStats from './ProfileStats';
import RecentActivity from './RecentActivity';
import AccountSettings from './AccountSettings';
import EditProfileModal from './EditProfileModal';

export const ProfilePage = ({ currentUser, setCurrentUser, onLogout, onBackToHome }) => {
  const [profile, setProfile] = useState(currentUser || null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  const [timeTick, setTimeTick] = useState(Date.now());
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    role: '',
    bio: '',
    avatar: ''
  });

  // Live timer interval to re-render relative time every 10 seconds (e.g. "just now" -> "1 minute ago" -> "2 minutes ago")
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Profile Data on Mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMsg('');
    const token = localStorage.getItem('ct-auth-token');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const userObj = {
          ...data.user,
          updatedAt: data.user.updatedAt || data.user.createdAt || new Date().toISOString()
        };
        setProfile(userObj);
        setStats(data.stats);
        setActivity(data.recentActivity);
        
        // Update local storage user if updated
        localStorage.setItem('ct-auth-user', JSON.stringify(userObj));
        if (setCurrentUser) setCurrentUser(userObj);

        setFormData({
          name: userObj.name || '',
          username: userObj.username || '',
          role: userObj.role || 'learner',
          bio: userObj.bio || '',
          avatar: userObj.avatar || ''
        });
      } else {
        if (res.status === 401) {
          localStorage.removeItem('ct-auth-token');
        }
        // Fallback to local storage state
        const localUser = JSON.parse(localStorage.getItem('ct-auth-user')) || currentUser;
        if (localUser) {
          const userObj = {
            ...localUser,
            updatedAt: localUser.updatedAt || localUser.createdAt || new Date().toISOString()
          };
          setProfile(userObj);
          setFormData({
            name: userObj.name || '',
            username: userObj.username || (userObj.email ? userObj.email.split('@')[0] : ''),
            role: userObj.role || 'learner',
            bio: userObj.bio || '',
            avatar: userObj.avatar || ''
          });
        }
      }
    } catch (err) {
      console.warn('Backend server offline or unreachable, using client state:', err);
      const localUser = JSON.parse(localStorage.getItem('ct-auth-user')) || currentUser;
      if (localUser) {
        const userObj = {
          ...localUser,
          updatedAt: localUser.updatedAt || localUser.createdAt || new Date().toISOString()
        };
        setProfile(userObj);
        setFormData({
          name: userObj.name || '',
          username: userObj.username || (userObj.email ? userObj.email.split('@')[0] : ''),
          role: userObj.role || 'learner',
          bio: userObj.bio || '',
          avatar: userObj.avatar || ''
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = () => {
    setFormData({
      name: profile?.name || '',
      username: profile?.username || '',
      role: profile?.role || 'learner',
      bio: profile?.bio || '',
      avatar: profile?.avatar || ''
    });
    setEditModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const token = localStorage.getItem('ct-auth-token');

    let savedOnBackend = false;

    if (token) {
      try {
        const res = await fetch('http://localhost:5000/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        if (res.ok) {
          const data = await res.json();
          const userObj = {
            ...data.user,
            updatedAt: data.user.updatedAt || new Date().toISOString()
          };
          setProfile(userObj);
          localStorage.setItem('ct-auth-user', JSON.stringify(userObj));
          if (setCurrentUser) setCurrentUser(userObj);
          setSuccessMsg('Profile updated successfully!');
          setEditModalOpen(false);
          savedOnBackend = true;
        } else if (res.status === 401) {
          localStorage.removeItem('ct-auth-token');
        }
      } catch (backendErr) {
        console.warn('Backend update failed, falling back to local storage:', backendErr);
      }
    }

    if (!savedOnBackend) {
      // Client fallback update
      const updated = {
        ...profile,
        ...formData,
        updatedAt: new Date().toISOString()
      };
      setProfile(updated);
      localStorage.setItem('ct-auth-user', JSON.stringify(updated));
      if (setCurrentUser) setCurrentUser(updated);
      setSuccessMsg('Profile updated successfully!');
      setEditModalOpen(false);
    }

    setSaving(false);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    const token = localStorage.getItem('ct-auth-token');
    if (!token) throw new Error('Authentication token missing');

    const res = await fetch('http://localhost:5000/api/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Password update failed');
    }
    return data;
  };

  if (loading) {
    return (
      <div className="ct-profile-loading-screen">
        <Loader2 size={32} className="animate-spin text-purple-400 mb-3" />
        <p className="ct-loading-text">Loading Developer Profile...</p>
      </div>
    );
  }

  return (
    <div className="ct-profile-page-container">
      <div className="ct-container">
        
        {/* Navigation Breadcrumb */}
        <div className="ct-profile-top-bar">
          <button className="ct-btn-back" onClick={onBackToHome}>
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {errorMsg && (
          <div className="ct-alert error mb-6">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="ct-alert success mb-6">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Profile Header */}
        <ProfileHeader 
          profile={profile}
          onOpenEditModal={handleOpenEditModal}
        />

        {/* 2. Coding Statistics Grid */}
        <div className="ct-profile-section">
          <h2 className="ct-profile-section-title">Developer Activity & Performance</h2>
          <ProfileStats stats={stats} />
        </div>

        {/* 3. Main Split Section: Personal Info vs Recent Activity */}
        <div className="ct-profile-split-grid">
          <div className="ct-profile-left">
            <PersonalInfo 
              profile={profile}
              onOpenEditModal={handleOpenEditModal}
            />
          </div>

          <div className="ct-profile-right">
            <RecentActivity activities={activity} userUpdatedAt={profile?.updatedAt} />
          </div>
        </div>

        {/* 4. Account Settings */}
        <div className="ct-profile-section mt-10 pt-4">
          <AccountSettings 
            authProvider={profile?.authProvider}
            onChangePassword={handleChangePassword}
            onLogout={onLogout}
          />
        </div>


        {/* 5. Interactive Edit Profile Modal Popup */}
        <EditProfileModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          profile={profile}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSaveProfile}
          saving={saving}
        />

      </div>
    </div>
  );
};

export default ProfilePage;
