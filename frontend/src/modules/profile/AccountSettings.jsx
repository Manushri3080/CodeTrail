import React, { useState } from 'react';
import { Settings, KeyRound, Bell, LogOut, Lock, Check, AlertCircle, X, ShieldAlert, TrendingUp, Megaphone } from 'lucide-react';

export const AccountSettings = ({ authProvider, onChangePassword, onLogout }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [submittingPass, setSubmittingPass] = useState(false);

  // Persistent Email Notification Preferences State
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('ct-notification-prefs');
    return saved ? JSON.parse(saved) : {
      securityAlerts: true,
      weeklyProgress: true,
      platformNews: false
    };
  });

  const [toastMsg, setToastMsg] = useState('');

  const toggleNotification = (key) => {
    setNotifications(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('ct-notification-prefs', JSON.stringify(updated));
      setToastMsg('Notification preferences updated!');
      setTimeout(() => setToastMsg(''), 2500);
      return updated;
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (passData.newPassword !== passData.confirmPassword) {
      setPassError('New passwords do not match');
      return;
    }

    if (passData.newPassword.length < 6) {
      setPassError('New password must be at least 6 characters');
      return;
    }

    try {
      setSubmittingPass(true);
      await onChangePassword(passData.currentPassword, passData.newPassword);
      setPassSuccess('Password updated successfully!');
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPassSuccess('');
      }, 1500);
    } catch (err) {
      setPassError(err.message || 'Failed to update password');
    } finally {
      setSubmittingPass(false);
    }
  };

  return (
    <div className="ct-profile-card">
      <div className="ct-card-header-bar">
        <div className="ct-card-title-group">
          <Settings size={18} className="text-purple-400" />
          <h3 className="ct-card-heading">Account Settings</h3>
        </div>
      </div>

      <div className="ct-card-body">
        <div className="ct-settings-list">
          
          {/* Change Password Row */}
          <div className="ct-settings-row">
            <div className="ct-settings-info">
              <div className="ct-settings-icon-box">
                <KeyRound size={16} />
              </div>
              <div>
                <h4 className="ct-settings-title">Security & Password</h4>
                <p className="ct-settings-desc">
                  {authProvider === 'google' 
                    ? 'Your account is authenticated via Google OAuth' 
                    : 'Update your account password regularly to keep your account secure'}
                </p>
              </div>
            </div>

            <button
              className="ct-btn-secondary"
              onClick={() => setShowPasswordModal(true)}
              disabled={authProvider === 'google'}
              title={authProvider === 'google' ? 'Not available for Google accounts' : 'Change Password'}
            >
              <Lock size={14} />
              <span>Change Password</span>
            </button>
          </div>

          {/* Email Preferences Row */}
          <div className="ct-settings-row">
            <div className="ct-settings-info">
              <div className="ct-settings-icon-box">
                <Bell size={16} />
              </div>
              <div>
                <h4 className="ct-settings-title">Email Notifications</h4>
                <p className="ct-settings-desc">Manage what emails you receive from CodeTrail</p>
              </div>
            </div>
            {toastMsg && (
              <span className="text-xs text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 flex items-center gap-1.5 animate-fade-in">
                <Check size={12} />
                <span>{toastMsg}</span>
              </span>
            )}
          </div>

          <div className="ct-notification-toggles">
            {/* Toggle Item 1: Security */}
            <div className="ct-notification-card">
              <div className="ct-notification-info">
                <div className="ct-notification-icon-box">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h5 className="ct-notification-name">Security & login alerts</h5>
                  <p className="ct-notification-sub">Get immediate emails when critical security events or new logins occur</p>
                </div>
              </div>
              <button
                type="button"
                className={`ct-switch ${notifications.securityAlerts ? 'active' : ''}`}
                onClick={() => toggleNotification('securityAlerts')}
                aria-label="Toggle Security Alerts"
              >
                <span className="ct-switch-handle" />
              </button>
            </div>

            {/* Toggle Item 2: Practice Digest */}
            <div className="ct-notification-card">
              <div className="ct-notification-info">
                <div className="ct-notification-icon-box">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h5 className="ct-notification-name">Weekly learning & practice digest</h5>
                  <p className="ct-notification-sub">Receive a weekly summary of your coding streak and completed modules</p>
                </div>
              </div>
              <button
                type="button"
                className={`ct-switch ${notifications.weeklyProgress ? 'active' : ''}`}
                onClick={() => toggleNotification('weeklyProgress')}
                aria-label="Toggle Practice Digest"
              >
                <span className="ct-switch-handle" />
              </button>
            </div>

            {/* Toggle Item 3: Product News */}
            <div className="ct-notification-card">
              <div className="ct-notification-info">
                <div className="ct-notification-icon-box">
                  <Megaphone size={16} />
                </div>
                <div>
                  <h5 className="ct-notification-name">Product updates & feature announcements</h5>
                  <p className="ct-notification-sub">Stay up to date with new features, challenge sets, and platform releases</p>
                </div>
              </div>
              <button
                type="button"
                className={`ct-switch ${notifications.platformNews ? 'active' : ''}`}
                onClick={() => toggleNotification('platformNews')}
                aria-label="Toggle Product News"
              >
                <span className="ct-switch-handle" />
              </button>
            </div>
          </div>

          {/* Logout Row */}
          <div className="ct-settings-row danger-zone">
            <div className="ct-settings-info">
              <div className="ct-settings-icon-box danger">
                <LogOut size={16} />
              </div>
              <div>
                <h4 className="ct-settings-title text-red-400">Account Session</h4>
                <p className="ct-settings-desc">Sign out of your active CodeTrail developer session</p>
              </div>
            </div>

            <button
              className="ct-btn-logout-danger"
              onClick={() => setShowLogoutModal(true)}
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>

        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="ct-modal-backdrop" onClick={() => setShowPasswordModal(false)}>
          <div className="ct-modal-card" onClick={e => e.stopPropagation()}>
            <div className="ct-modal-header">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-purple-400" />
                <h3 className="ct-modal-title">Change Password</h3>
              </div>
              <button className="ct-btn-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="ct-modal-body">
              {passError && (
                <div className="ct-alert error">
                  <AlertCircle size={15} />
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div className="ct-alert success">
                  <Check size={15} />
                  <span>{passSuccess}</span>
                </div>
              )}

              <div className="ct-form-group">
                <label className="ct-form-label">Current Password</label>
                <input
                  type="password"
                  value={passData.currentPassword}
                  onChange={e => setPassData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="ct-form-input"
                  required
                />
              </div>

              <div className="ct-form-group">
                <label className="ct-form-label">New Password</label>
                <input
                  type="password"
                  value={passData.newPassword}
                  onChange={e => setPassData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="At least 6 characters"
                  className="ct-form-input"
                  required
                />
              </div>

              <div className="ct-form-group">
                <label className="ct-form-label">Confirm New Password</label>
                <input
                  type="password"
                  value={passData.confirmPassword}
                  onChange={e => setPassData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                  className="ct-form-input"
                  required
                />
              </div>

              <div className="ct-modal-actions">
                <button
                  type="button"
                  className="ct-btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ct-btn-primary"
                  disabled={submittingPass}
                >
                  {submittingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal Popup Card */}
      {showLogoutModal && (
        <div className="ct-modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="ct-modal-card ct-logout-modal-card max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="ct-modal-header py-3 px-5 border-b border-[var(--ct-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <LogOut size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Confirm Logout</h3>
                  <p className="text-[11px] text-gray-400">End developer session</p>
                </div>
              </div>
              <button className="ct-btn-close" onClick={() => setShowLogoutModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="ct-modal-body p-5 flex flex-col gap-4 text-center">
              <p className="text-xs text-gray-300 leading-relaxed">
                Are you sure you want to log out of your <strong className="text-white">CodeTrail</strong> account?
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  className="ct-btn-secondary text-xs py-2 px-4"
                  onClick={() => setShowLogoutModal(false)}
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>
                
                <button
                  type="button"
                  className="ct-btn-logout-confirm"
                  onClick={() => {
                    setShowLogoutModal(false);
                    if (onLogout) onLogout();
                  }}
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
