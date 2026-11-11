import React, { useState, useEffect, useRef } from 'react';
import { Settings, KeyRound, Bell, LogOut, Lock, Check, AlertCircle, X, ShieldAlert, TrendingUp, Megaphone, Loader2 } from 'lucide-react';
import { API_BASE } from '../../config/api';

const DEFAULT_NOTIFICATIONS = {
  securityAlerts: true,
  weeklyProgress: true,
  platformNews: false
};

const NOTIFICATION_CATEGORIES = [
  {
    key: 'securityAlerts',
    title: 'Security & login alerts',
    description: 'Get immediate emails when critical security events or new logins occur',
    ariaLabel: 'Toggle Security Alerts',
    Icon: ShieldAlert
  },
  {
    key: 'weeklyProgress',
    title: 'Weekly learning & practice digest',
    description: 'Receive a weekly summary of your coding streak and completed modules',
    ariaLabel: 'Toggle Practice Digest',
    Icon: TrendingUp
  },
  {
    key: 'platformNews',
    title: 'Product updates & feature announcements',
    description: 'Stay up to date with new features, challenge sets, and platform releases',
    ariaLabel: 'Toggle Product News',
    Icon: Megaphone
  }
];

export const AccountSettings = ({ authProvider, onChangePassword, onLogout }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [submittingPass, setSubmittingPass] = useState(false);

  // MongoDB-backed Notification Preferences State
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const toastTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadNotificationPreferences = async () => {
      const token = localStorage.getItem('ct-auth-token');
      if (!token) {
        if (isMounted) {
          setLoadingPrefs(false);
          setPrefsLoaded(false);
          setNotifError('Sign in required to load and update notification preferences.');
        }
        return;
      }

      try {
        setLoadingPrefs(true);
        setNotifError('');
        const res = await fetch(`${API_BASE}/notifications/preferences`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Failed to load notification preferences.');
        }

        if (isMounted && data.preferences) {
          setNotifications({
            securityAlerts: Boolean(data.preferences.securityAlerts),
            weeklyProgress: Boolean(data.preferences.weeklyProgress),
            platformNews: Boolean(data.preferences.platformNews)
          });
          setPrefsLoaded(true);
        }
      } catch (err) {
        if (isMounted) {
          setPrefsLoaded(false);
          setNotifError(err.message || 'Unable to load saved notification preferences.');
        }
      } finally {
        if (isMounted) {
          setLoadingPrefs(false);
        }
      }
    };

    loadNotificationPreferences();

    return () => {
      isMounted = false;
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (msg) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg('');
    }, 2500);
  };

  const toggleNotification = async (key) => {
    if (loadingPrefs || savingKey || !prefsLoaded) {
      return;
    }

    const token = localStorage.getItem('ct-auth-token');
    if (!token) {
      setNotifError('Authentication required. Please sign in again.');
      return;
    }

    const nextValue = !notifications[key];
    setSavingKey(key);
    setNotifError('');
    setToastMsg('');

    try {
      const res = await fetch(`${API_BASE}/notifications/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ [key]: nextValue })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.preferences) {
        throw new Error(data.message || 'Failed to update notification preferences.');
      }

      setNotifications({
        securityAlerts: Boolean(data.preferences.securityAlerts),
        weeklyProgress: Boolean(data.preferences.weeklyProgress),
        platformNews: Boolean(data.preferences.platformNews)
      });
      showToast('Notification preferences saved!');
    } catch (err) {
      setNotifError(err.message || 'Failed to save notification preference. Changes were not persisted.');
    } finally {
      setSavingKey(null);
    }
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
          <div className="ct-settings-row flex-wrap gap-3">
            <div className="ct-settings-info">
              <div className="ct-settings-icon-box">
                <Bell size={16} />
              </div>
              <div>
                <h4 className="ct-settings-title">Email Notifications</h4>
                <p className="ct-settings-desc">Manage what emails you receive from CodeTrail</p>
              </div>
            </div>
            {loadingPrefs && (
              <span className="text-xs text-gray-300 bg-white/5 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5" role="status">
                <Loader2 size={12} className="animate-spin text-purple-400" />
                <span>Loading preferences...</span>
              </span>
            )}
            {!loadingPrefs && savingKey && (
              <span className="text-xs text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 flex items-center gap-1.5" role="status">
                <Loader2 size={12} className="animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {!loadingPrefs && !savingKey && toastMsg && (
              <span className="text-xs text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 flex items-center gap-1.5 animate-fade-in" role="status">
                <Check size={12} />
                <span>{toastMsg}</span>
              </span>
            )}
          </div>

          {notifError && (
            <div className="ct-alert error mt-3" role="alert">
              <AlertCircle size={15} />
              <span>{notifError}</span>
            </div>
          )}

          <div className="ct-notification-toggles">
            {NOTIFICATION_CATEGORIES.map((category) => {
              const CategoryIcon = category.Icon;
              const isEnabled = Boolean(notifications[category.key]);
              const isDisabled = loadingPrefs || Boolean(savingKey) || !prefsLoaded;

              return (
                <div key={category.key} className="ct-notification-card gap-3">
                  <div className="ct-notification-info">
                    <div className="ct-notification-icon-box">
                      <CategoryIcon size={16} />
                    </div>
                    <div>
                      <h5 className="ct-notification-name">{category.title}</h5>
                      <p className="ct-notification-sub">{category.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`ct-switch ${isEnabled ? 'active' : ''} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => toggleNotification(category.key)}
                    disabled={isDisabled}
                    aria-label={category.ariaLabel}
                    aria-pressed={isEnabled}
                    aria-busy={savingKey === category.key}
                  >
                    <span className="ct-switch-handle" />
                  </button>
                </div>
              );
            })}
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
