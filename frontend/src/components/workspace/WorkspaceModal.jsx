import React, { useState } from 'react';
import axios from 'axios';
import { 
  X, 
  Plus, 
  Code2, 
  Rocket, 
  Cpu, 
  Database, 
  Palette, 
  KeyRound, 
  Lock, 
  Globe, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const AVAILABLE_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', ext: '.js', tag: 'Node.js 20' },
  { id: 'python', name: 'Python', ext: '.py', tag: 'Python 3.12' },
  { id: 'cpp', name: 'C++', ext: '.cpp', tag: 'GCC 13' },
  { id: 'java', name: 'Java', ext: '.java', tag: 'OpenJDK 21' },
  { id: 'rust', name: 'Rust', ext: '.rs', tag: 'Rustc 1.75' },
  { id: 'go', name: 'Go', ext: '.go', tag: 'Go 1.22' }
];

const ACCENT_COLORS = [
  { id: 'purple', name: 'Purple', bg: 'rgba(147, 51, 234, 0.2)', border: '#9333EA' },
  { id: 'cyan', name: 'Cyan', bg: 'rgba(6, 182, 212, 0.2)', border: '#06B6D4' },
  { id: 'emerald', name: 'Emerald', bg: 'rgba(16, 185, 129, 0.2)', border: '#10B981' },
  { id: 'rose', name: 'Rose', bg: 'rgba(244, 63, 94, 0.2)', border: '#F43F5E' },
  { id: 'amber', name: 'Amber', bg: 'rgba(245, 158, 11, 0.2)', border: '#F59E0B' }
];

const AVAILABLE_ICONS = [
  { id: 'Rocket', label: 'Rocket', icon: Rocket },
  { id: 'Cpu', label: 'CPU', icon: Cpu },
  { id: 'Database', label: 'DB', icon: Database },
  { id: 'Palette', label: 'Palette', icon: Palette },
  { id: 'Code2', label: 'Code', icon: Code2 }
];

export const WorkspaceModal = ({ isOpen, onClose, onWorkspaceCreated, onWorkspaceJoined, initialTab = 'create' }) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'create' | 'join'
  
  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [brandColor, setBrandColor] = useState('purple');
  const [selectedIcon, setSelectedIcon] = useState('Rocket');
  const [isPublic, setIsPublic] = useState(false);
  
  // Join form state
  const [inviteCode, setInviteCode] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const joinInputRef = React.useRef(null);

  // Sync activeTab when modal opens or initialTab changes
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'create');
      setError('');
      setSuccess('');
    }
  }, [isOpen, initialTab]);

  // Close modal on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus join input when active tab changes to join
  React.useEffect(() => {
    if (isOpen && activeTab === 'join') {
      const timer = setTimeout(() => {
        if (joinInputRef.current) {
          joinInputRef.current.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');

    if (!title.trim()) {
      setError('Please provide a workspace title.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('ct-auth-token');

    try {
      const response = await axios.post(
        `${API_BASE}/workspaces`,
        {
          title: title.trim(),
          description: description.trim(),
          language,
          brandColor,
          icon: selectedIcon,
          isPublic
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSuccess('Workspace created successfully!');
      setTimeout(() => {
        if (onWorkspaceCreated) {
          onWorkspaceCreated(response.data.workspace);
        }
        onClose();
        setTitle('');
        setDescription('');
        setSuccess('');
      }, 700);

    } catch (err) {
      console.error('Workspace creation failed:', err);
      if (!token) {
        setError('Please log in first to create cloud workspaces.');
      } else {
        const msg = err.response?.data?.message || 'Failed to create workspace on server.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');

    const trimmedCode = inviteCode.trim().toUpperCase();

    if (!trimmedCode) {
      setError('Please enter a valid workspace invite code.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('ct-auth-token');

    if (!token) {
      setError('Please log in to join a workspace.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE}/workspaces/join`,
        { inviteCode: trimmedCode },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const msg = response.data?.message || 'Successfully joined workspace!';
      setSuccess(msg);

      setTimeout(() => {
        if (onWorkspaceJoined) {
          onWorkspaceJoined(response.data?.workspaceId);
        }
        onClose();
        setInviteCode('');
        setSuccess('');
      }, 800);

    } catch (err) {
      console.error('Join workspace failed:', err);
      if (err.response) {
        const status = err.response.status;
        const backendMsg = err.response.data?.message;

        if (status === 404) {
          setError('Workspace not found. Please check the code and try again.');
        } else if (status === 401) {
          setError('Please log in again to join a workspace.');
        } else {
          setError(backendMsg || 'Failed to join workspace. Please try again.');
        }
      } else {
        setError('Unable to connect to the server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ct-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="ct-workspace-modal-title">
      <div className="ct-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Top Header */}
        <div className="ct-modal-header">
          <div className="ct-modal-title-group">
            <div className="ct-modal-icon-badge">
              <Sparkles size={18} className="text-purple-400" />
            </div>
            <div>
              <h3 id="ct-workspace-modal-title" className="ct-modal-title">
                {activeTab === 'create' ? 'Create Collaborative Workspace' : 'Join Existing Workspace'}
              </h3>
              <p className="ct-modal-subtitle">
                {activeTab === 'create' 
                  ? 'Set up a real-time room with shared editor & isolated runtime'
                  : 'Enter an invitation code to collaborate with your team'}
              </p>
            </div>
          </div>

          <button className="ct-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="ct-modal-tabs">
          <button 
            type="button"
            className={`ct-modal-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => { setActiveTab('create'); setError(''); }}
          >
            <Plus size={15} />
            <span>New Workspace</span>
          </button>
          <button 
            type="button"
            className={`ct-modal-tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => { setActiveTab('join'); setError(''); }}
          >
            <KeyRound size={15} />
            <span>Join via Code</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="ct-modal-alert error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="ct-modal-alert success">
            <CheckCircle2 size={15} />
            <span>{success}</span>
          </div>
        )}

        {/* Tab 1: Create Workspace Form */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="ct-modal-form">
            {/* Title */}
            <div className="ct-form-group">
              <label className="ct-form-label">
                Workspace Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Consensus Engine"
                className="ct-form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="ct-form-group">
              <label className="ct-form-label">Description (Optional)</label>
              <input
                type="text"
                placeholder="Brief goal or notes for team members..."
                className="ct-form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
            </div>

            {/* Language Selection */}
            <div className="ct-form-group">
              <label className="ct-form-label">Runtime & Language</label>
              <div className="ct-lang-selector-grid">
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    className={`ct-lang-btn ${language === lang.id ? 'selected' : ''}`}
                    onClick={() => setLanguage(lang.id)}
                  >
                    <span className="ct-lang-name">{lang.name}</span>
                    <span className="ct-lang-tag">{lang.tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Theme & Icon Row */}
            <div className="ct-form-row">
              <div className="ct-form-group flex-1">
                <label className="ct-form-label">Accent Theme</label>
                <div className="ct-color-picker-row">
                  {ACCENT_COLORS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      className={`ct-color-btn ${brandColor === col.id ? 'active' : ''}`}
                      style={{ backgroundColor: col.bg, borderColor: col.border }}
                      onClick={() => setBrandColor(col.id)}
                      title={col.name}
                    >
                      <span className="ct-color-dot" style={{ backgroundColor: col.border }} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="ct-form-group flex-1">
                <label className="ct-form-label">Card Icon</label>
                <div className="ct-icon-picker-row">
                  {AVAILABLE_ICONS.map((ic) => {
                    const IconComp = ic.icon;
                    return (
                      <button
                        key={ic.id}
                        type="button"
                        className={`ct-icon-btn ${selectedIcon === ic.id ? 'active' : ''}`}
                        onClick={() => setSelectedIcon(ic.id)}
                        title={ic.label}
                      >
                        <IconComp size={15} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="ct-visibility-box">
              <div className="ct-vis-left">
                {isPublic ? <Globe size={18} className="text-cyan-400" /> : <Lock size={18} className="text-purple-400" />}
                <div>
                  <span className="ct-vis-title">{isPublic ? 'Public Workspace' : 'Private Workspace'}</span>
                  <p className="ct-vis-desc">
                    {isPublic ? 'Anyone with the invite code can view and participate.' : 'Only invited collaborators can access.'}
                  </p>
                </div>
              </div>
              <label className="ct-toggle-switch">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span className="ct-slider" />
              </label>
            </div>

            {/* Modal Actions */}
            <div className="ct-modal-footer">
              <button type="button" className="ct-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="ct-btn-primary"
                disabled={loading || !title.trim()}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                <span>{loading ? 'Initializing...' : 'Create Workspace'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Tab 2: Join Workspace Form */
          <form onSubmit={handleJoin} className="ct-modal-form">
            <div className="ct-form-group">
              <label htmlFor="ct-invite-code-input" className="ct-form-label">
                Workspace Invite Code <span className="text-red-400">*</span>
              </label>
              <div className="ct-input-code-wrap">
                <KeyRound size={16} className="ct-input-code-icon" />
                <input
                  id="ct-invite-code-input"
                  ref={joinInputRef}
                  type="text"
                  placeholder="CT-XXXXXX"
                  className="ct-form-input ct-code-input"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={16}
                  required
                  autoComplete="off"
                  disabled={loading}
                  aria-label="Workspace Invite Code"
                />
              </div>
              <p className="ct-form-hint">
                Ask your team lead or peer for their CodeTrail workspace room code (e.g. CT-A8F2K).
              </p>
            </div>

            <div className="ct-modal-footer">
              <button 
                type="button" 
                className="ct-btn-secondary" 
                onClick={() => {
                  setError('');
                  setSuccess('');
                  onClose();
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="ct-btn-primary"
                disabled={loading || !inviteCode.trim()}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                <span>{loading ? 'Joining...' : 'Join Workspace'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default WorkspaceModal;
