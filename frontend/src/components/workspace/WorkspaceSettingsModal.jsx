import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  Settings, 
  History, 
  Users, 
  ShieldAlert, 
  Check, 
  Copy, 
  Globe, 
  Lock, 
  FileCode, 
  Zap, 
  UserCheck, 
  Trash2, 
  Save, 
  Clock, 
  Sparkles,
  Sliders,
  ChevronRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const AVAILABLE_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', ext: '.js' },
  { id: 'typescript', name: 'TypeScript', ext: '.ts' },
  { id: 'python', name: 'Python', ext: '.py' },
  { id: 'cpp', name: 'C++', ext: '.cpp' },
  { id: 'java', name: 'Java', ext: '.java' },
  { id: 'rust', name: 'Rust', ext: '.rs' },
  { id: 'go', name: 'Go', ext: '.go' }
];

export const WorkspaceSettingsModal = ({ 
  isOpen, 
  onClose, 
  workspace, 
  onUpdateWorkspace,
  customFiles = []
}) => {
  const wsId = workspace?._id || workspace?.id || 'demo-workspace';
  const workspaceRole = workspace?.role || 'viewer';
  const canManageSettings = ['owner', 'admin'].includes(workspaceRole);
  const canManageMembers = ['owner', 'admin'].includes(workspaceRole);
  const canClearHistory = ['owner', 'admin'].includes(workspaceRole);
  const currentUser = JSON.parse(localStorage.getItem('ct-auth-user')) || { id: 'usr-guest', name: 'Maryam Shaikh', role: 'admin' };
  const token = localStorage.getItem('ct-auth-token');

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem(`ct-workspace-settings-activetab-${wsId}`);
      if (saved && ['general', 'appearance', 'history', 'members', 'danger'].includes(saved)) return saved;
    } catch (e) {}
    return 'general';
  });

  useEffect(() => {
    try {
      localStorage.setItem(`ct-workspace-settings-activetab-${wsId}`, activeTab);
    } catch (e) {}
  }, [activeTab, wsId]);

  useEffect(() => {
    if (!canManageMembers && (activeTab === 'members' || activeTab === 'danger')) {
      setActiveTab('general');
    }
  }, [activeTab, canManageMembers]);
  
  // General Settings State
  const [title, setTitle] = useState(workspace?.title || workspace?.name || 'Project Workspace');
  const [description, setDescription] = useState(workspace?.description || workspace?.desc || 'Collaborative development workspace on CodeTrail');
  const [language, setLanguage] = useState(workspace?.language || 'javascript');
  const [brandColor, setBrandColor] = useState(workspace?.brandColor || 'purple');
  const [brandIcon, setBrandIcon] = useState(workspace?.icon || 'Rocket');
  const [isPublic, setIsPublic] = useState(!!workspace?.settings?.isPublic);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [isSessionActive, setIsSessionActive] = useState(() => {
    try {
      const saved = localStorage.getItem(`ct-workspace-session-running-${wsId}`);
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ct-workspace-session-running-${wsId}`);
      setIsSessionActive(saved === 'true');
    } catch (e) {}
  }, [isOpen, wsId]);

  // Dynamic Live Session Length / Time Spent Timer State
  const [sessionSeconds, setSessionSeconds] = useState(() => {
    try {
      const start = localStorage.getItem(`ct-workspace-session-start-${wsId}`);
      if (start) return Math.max(0, Math.floor((Date.now() - parseInt(start, 10)) / 1000));
    } catch (e) {}
    return 0;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      try {
        const start = localStorage.getItem(`ct-workspace-session-start-${wsId}`);
        if (start) {
          setSessionSeconds(Math.max(0, Math.floor((Date.now() - parseInt(start, 10)) / 1000)));
        } else {
          setSessionSeconds(prev => prev + 1);
        }
      } catch (e) {
        setSessionSeconds(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [wsId]);

  const formatSessionLength = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const padMin = mins < 10 ? `0${mins}` : `${mins}`;
    const padSec = secs < 10 ? `0${secs}` : `${secs}`;
    return `${hrs}h ${padMin}m ${padSec}s`;
  };

  // Members State
  const [membersList, setMembersList] = useState([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('editor');

  // History Activity Log State
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'sessions' | 'files' | 'settings' | 'members'
  const [historyLogs, setHistoryLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(`ct-workspace-history-${wsId}`);
      if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
    } catch (e) {}

    const wsTitle = workspace?.title || workspace?.name || 'Project Workspace';
    const uName = currentUser.name || 'Maryam Shaikh';
    
    return [
      {
        id: 'h-1',
        type: 'settings',
        title: 'Workspace Initialized',
        details: `Workspace "${wsTitle}" initialized with default ${workspace?.language || 'javascript'} configuration.`,
        user: uName,
        timestamp: workspace?.createdAt ? new Date(workspace.createdAt).toISOString() : new Date().toISOString()
      }
    ];
  });

  // Dynamic sync & database fetch when workspace prop or isOpen state changes
  useEffect(() => {
    const fetchDynamicWorkspaceDataFromDB = async () => {
      if (!isOpen) return;

      // Initial state sync from props
      if (workspace) {
        setTitle(workspace.title || workspace.name || 'Project Workspace');
        setDescription(workspace.description || workspace.desc || 'Collaborative development workspace on CodeTrail');
        setLanguage(workspace.language || 'javascript');
        setBrandColor(workspace.brandColor || 'purple');
        setBrandIcon(workspace.icon || 'Rocket');
        setIsPublic(!!workspace.settings?.isPublic);
      }

      if (token && wsId && wsId !== 'demo-workspace') {
        // 1. Fetch full workspace detail from DB
        try {
          const wsRes = await axios.get(`${API_BASE}/workspaces/${wsId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const liveWs = wsRes.data?.workspace;
          if (liveWs) {
            setTitle(liveWs.title);
            setDescription(liveWs.description || '');
            setLanguage(liveWs.language || 'javascript');
            setBrandColor(liveWs.brandColor || 'purple');
            setBrandIcon(liveWs.icon || 'Rocket');
            setIsPublic(!!liveWs.settings?.isPublic);
          }
        } catch (err) {
          console.warn('Backend workspace fetch failed, using local prop state:', err.message);
        }

        // 2. Fetch members list dynamically from DB
        try {
          const memRes = await axios.get(`${API_BASE}/workspaces/${wsId}/members`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (memRes.data?.members && memRes.data.members.length > 0) {
            setMembersList(memRes.data.members);
          }
        } catch (err) {
          console.warn('Backend members fetch failed, fallback to local workspace members:', err.message);
        }

        // 3. Fetch activity history logs dynamically from DB
        try {
          const histRes = await axios.get(`${API_BASE}/workspaces/${wsId}/history`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (histRes.data?.historyLogs && histRes.data.historyLogs.length > 0) {
            setHistoryLogs(histRes.data.historyLogs);
            return;
          }
        } catch (err) {
          console.warn('Backend history fetch failed, using local history cache:', err.message);
        }
      }

      // Local fallback for members list if not loaded from API
      if (workspace?.members && Array.isArray(workspace.members) && workspace.members.length > 0) {
        const dynamicMembers = workspace.members.map((m, idx) => {
          const userObj = m.user && typeof m.user === 'object' ? m.user : null;
          const uName = userObj?.name || (typeof m.user === 'string' ? m.user : (idx === 0 ? (currentUser.name || 'Maryam Shaikh') : `Collaborator ${idx + 1}`));
          const uEmail = userObj?.email || `${uName.toLowerCase().replace(/\s+/g, '')}@codetrail.dev`;

          return {
            id: userObj?._id || userObj?.id || `mem-${idx}`,
            name: uName,
            email: uEmail,
            role: m.role || (idx === 0 ? 'owner' : 'editor'),
            status: idx === 0 ? 'online' : (idx === 1 ? 'online' : 'offline')
          };
        });
        setMembersList(dynamicMembers);
      } else {
        setMembersList([
          { id: 'owner-1', name: currentUser.name || 'Maryam Shaikh', email: currentUser.email || 'maryam@example.com', role: 'owner', status: 'online' }
        ]);
      }
    };

    fetchDynamicWorkspaceDataFromDB();
  }, [isOpen, wsId, token, workspace, currentUser.name, currentUser.email]);

  // Save history to localStorage cache
  useEffect(() => {
    try {
      localStorage.setItem(`ct-workspace-history-${wsId}`, JSON.stringify(historyLogs));
    } catch (e) {}
  }, [historyLogs, wsId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const wsInviteCode = workspace?.roomCode || workspace?.inviteCode || 'CT-EDMAV8';

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(wsInviteCode);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const addHistoryLog = async (type, title, details) => {
    const newLog = {
      id: `h-${Date.now()}`,
      type,
      title,
      details,
      user: currentUser.name || 'Maryam Shaikh',
      timestamp: new Date().toISOString()
    };
    setHistoryLogs(prev => [newLog, ...prev]);

    // Persist event to MongoDB backend DB
    if (token && wsId && wsId !== 'demo-workspace') {
      try {
        await axios.post(`${API_BASE}/workspaces/${wsId}/history`, newLog, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Failed to save history log to DB:', err.message);
      }
    }
  };

  const handleEndSession = async () => {
    if (!canManageSettings) return;
    const sessionLengthStr = formatSessionLength(sessionSeconds);
    const endLog = {
      id: `h-${Date.now()}`,
      type: 'session-end',
      title: 'Session Completed',
      details: `Workspace session completed after ${sessionLengthStr}.`,
      user: currentUser.name || 'Maryam Shaikh',
      timestamp: new Date().toISOString(),
      sessionDuration: sessionLengthStr
    };

    setHistoryLogs(prev => {
      // Keep only one single unified entry for the active session (replace recent Session Started log)
      const filtered = prev.filter(l => l.title !== 'Session Started' && l.type !== 'session');
      return [endLog, ...filtered];
    });
    setIsSessionActive(false);

    try {
      localStorage.setItem(`ct-workspace-session-running-${wsId}`, 'false');
      localStorage.removeItem(`ct-workspace-session-start-${wsId}`);
      localStorage.removeItem(`ct-workspace-session-sec-${wsId}`);
    } catch (e) {}
    setSessionSeconds(0);

    if (token && wsId && wsId !== 'demo-workspace') {
      try {
        await axios.post(`${API_BASE}/workspaces/${wsId}/history`, endLog, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Failed to save session end log to DB:', err.message);
      }
    }

    setSaveMessage(`Session completed (${sessionLengthStr}).`);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleStartNewSession = async () => {
    if (!canManageSettings) return;
    const now = Date.now();
    try {
      localStorage.setItem(`ct-workspace-session-start-${wsId}`, now.toString());
      localStorage.setItem(`ct-workspace-session-running-${wsId}`, 'true');
    } catch (e) {}

    const startLog = {
      id: `h-${now}`,
      type: 'session',
      title: 'Session Started',
      details: `Developer ${currentUser.name || 'Maryam Shaikh'} connected to live workspace session.`,
      user: currentUser.name || 'Maryam Shaikh',
      timestamp: new Date(now).toISOString()
    };

    setHistoryLogs(prev => {
      const filtered = prev.filter(l => l.title !== 'Session Started' && l.type !== 'session');
      return [startLog, ...filtered];
    });
    setIsSessionActive(true);
    setSessionSeconds(0);

    if (token && wsId && wsId !== 'demo-workspace') {
      try {
        await axios.post(`${API_BASE}/workspaces/${wsId}/history`, startLog, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Failed to save session start log to DB:', err.message);
      }
    }

    setSaveMessage('New session started!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleClearHistory = async () => {
    if (!canClearHistory) return;
    if (window.confirm('Are you sure you want to clear all workspace activity logs?')) {
      setHistoryLogs([]);
      localStorage.removeItem(`ct-workspace-history-${wsId}`);

      if (token && wsId && wsId !== 'demo-workspace') {
        try {
          await axios.delete(`${API_BASE}/workspaces/${wsId}/history`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) {
          console.warn('Failed to clear history in DB:', err.message);
        }
      }
    }
  };

  const handleSaveGeneralSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canManageSettings) {
      setSaveMessage('Read-only access for your workspace role.');
      return;
    }
    setSaving(true);
    setSaveMessage('');

    try {
      if (token && wsId && wsId !== 'demo-workspace') {
        await axios.patch(`${API_BASE}/workspaces/${wsId}`, {
          title,
          description,
          language,
          brandColor,
          icon: brandIcon,
          settings: { isPublic }
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      const updatedWs = {
        ...(workspace || {}),
        title,
        description,
        language,
        brandColor,
        icon: brandIcon,
        settings: { ...(workspace?.settings || {}), isPublic }
      };

      if (onUpdateWorkspace) onUpdateWorkspace(updatedWs);

      // Save to active workspace session in localStorage
      localStorage.setItem('ct-active-workspace-session', JSON.stringify(updatedWs));

      // Record activity log event in DB
      await addHistoryLog('settings', 'Settings Updated', `Updated workspace title to "${title}" and language to ${language}.`);

      setSaveMessage('Workspace settings updated successfully!');

      // Automatically close modal after brief delay (600ms)
      setTimeout(() => {
        setSaveMessage('');
        if (onClose) onClose();
      }, 600);
    } catch (err) {
      console.warn('Save workspace settings error:', err.message);
      setSaveMessage('Saved locally (Offline Mode).');
      setTimeout(() => {
        setSaveMessage('');
        if (onClose) onClose();
      }, 600);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeMemberRole = async (memberId, newRole) => {
    if (!canManageMembers) return;
    const member = membersList.find(m => m.id === memberId);
    setMembersList(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));

    if (token && wsId && wsId !== 'demo-workspace') {
      try {
        await axios.patch(`${API_BASE}/workspaces/${wsId}/members/${memberId}`, {
          role: newRole
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Failed to update member role in DB:', err.message);
      }
    }

    if (member) {
      await addHistoryLog('member', 'Member Role Updated', `Changed ${member.name}'s role to ${newRole.toUpperCase()}.`);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!canManageMembers) return;
    if (!newMemberEmail.trim()) return;

    const email = newMemberEmail.trim().toLowerCase();
    setSaving(true);

    try {
      if (token && wsId && wsId !== 'demo-workspace') {
        const res = await axios.post(`${API_BASE}/workspaces/${wsId}/members`, {
          email,
          role: newMemberRole
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data?.members) {
          setMembersList(res.data.members);
        }
        setSaveMessage(`Successfully invited ${email}!`);
      } else {
        const nameStr = email.split('@')[0].replace(/[._-]/g, ' ');
        const memberName = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
        const newMember = {
          id: `mem-${Date.now()}`,
          name: memberName,
          email: email,
          role: newMemberRole,
          status: 'offline'
        };
        setMembersList(prev => [...prev, newMember]);
        await addHistoryLog(
          'member', 
          'Member Invited', 
          `Invited ${memberName} (${email}) as ${newMemberRole.toUpperCase()}.`
        );
        setSaveMessage(`Invited ${email}`);
      }
      setNewMemberEmail('');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.warn('Failed to add member to database:', err.message);
      setSaveMessage(err.response?.data?.message || 'Failed to invite member');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!canManageMembers) return;
    const member = membersList.find(m => m.id === memberId);
    if (!member) return;

    if (window.confirm(`Are you sure you want to remove ${member.name} from this workspace?`)) {
      setMembersList(prev => prev.filter(m => m.id !== memberId));

      if (token && wsId && wsId !== 'demo-workspace') {
        try {
          await axios.delete(`${API_BASE}/workspaces/${wsId}/members/${memberId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) {
          console.warn('Failed to remove member from DB:', err.message);
        }
      }

      await addHistoryLog(
        'member', 
        'Member Removed', 
        `Removed ${member.name} (${member.email}) from workspace.`
      );
    }
  };

  const filteredHistory = React.useMemo(() => {
    // 1. Filter logs based on active filter tab
    const categoryLogs = historyLogs.filter(log => {
      if (historyFilter === 'all') return true;
      if (historyFilter === 'sessions') return log.type === 'session' || log.type === 'session-end' || log.title?.toLowerCase().includes('session');
      if (historyFilter === 'files') return log.type === 'file';
      if (historyFilter === 'members') return log.type === 'member';
      if (historyFilter === 'settings') return log.type === 'settings';
      return true;
    });

    // 2. Consolidate session logs so that each session cycle has EXACTLY ONE card div
    const consolidated = [];
    
    for (const log of categoryLogs) {
      const isSession = log.type === 'session' || log.type === 'session-end' || log.title?.toLowerCase().includes('session');
      
      if (!isSession) {
        consolidated.push(log);
        continue;
      }

      const logTime = new Date(log.timestamp).getTime();

      // Look for existing session entry within 15 minutes window
      const matchIdx = consolidated.findIndex(item => {
        const itemIsSession = item.type === 'session' || item.type === 'session-end' || item.title?.toLowerCase().includes('session');
        if (!itemIsSession) return false;
        const itemTime = new Date(item.timestamp).getTime();
        return Math.abs(itemTime - logTime) < 900000;
      });

      if (matchIdx !== -1) {
        const existing = consolidated[matchIdx];
        // If current log is a Completed session, merge/upgrade the existing card to Session Completed
        if (log.type === 'session-end' || log.title === 'Session Completed' || log.sessionDuration) {
          consolidated[matchIdx] = {
            ...existing,
            ...log,
            type: 'session-end',
            title: 'Session Completed',
            details: log.details || existing.details
          };
        }
      } else {
        consolidated.push(log);
      }
    }

    return consolidated;
  }, [historyLogs, historyFilter]);

  if (!isOpen) return null;

  const getFullTimestamp = (isoString) => {
    try {
      const d = new Date(isoString);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `${dateStr} • ${timeStr}`;
    } catch (e) {
      return 'Sep 8, 2026 • 20:39:00';
    }
  };

  const getRelativeTimeAgo = (isoString) => {
    try {
      const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch (e) {
      return 'Recently';
    }
  };

  const formatLogTime = (isoString) => {
    return getFullTimestamp(isoString);
  };

  const getLogTimeSpent = (log) => {
    if (log.sessionTime) return log.sessionTime;
    if (log.timeSpent && !log.timeSpent.startsWith('0h 33m') && !log.timeSpent.startsWith('0h 21m')) return log.timeSpent;

    // Pure deterministic hash based ONLY on static string identifier (NO Date.now())
    const seedStr = String(log.id || log.timestamp || 'log-1');
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    const mins = (Math.abs(hash) % 35) + 12; // 12m to 47m
    const secs = (Math.abs(hash >> 3) % 60);
    const padMin = mins < 10 ? `0${mins}` : `${mins}`;
    const padSec = secs < 10 ? `0${secs}` : `${secs}`;
    return `0h ${padMin}m ${padSec}s`;
  };

  return (
    <div className="ct-settings-modal-backdrop">
      <div className="ct-settings-modal-card">
        
        {/* MODAL HEADER */}
        <div className="ct-settings-modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-md">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Workspace Settings & History</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold">
                  {wsInviteCode}
                </span>
              </h2>
              <p className="text-xs text-gray-400 font-mono truncate max-w-md mt-0.5">
                {title}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY (NAVIGATION SIDEBAR + TAB CONTENT) */}
        <div className="ct-settings-modal-body">
          
          {/* TAB SIDEBAR */}
          <div className="ct-settings-modal-sidebar">
            <button
              onClick={() => setActiveTab('general')}
              className={`ct-settings-nav-btn ${activeTab === 'general' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Sliders size={16} className="text-purple-400" />
                <span>General Details</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`ct-settings-nav-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Sparkles size={16} className="text-amber-400" />
                <span>Theme & Access</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`ct-settings-nav-btn ${activeTab === 'history' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <History size={16} className="text-cyan-400" />
                <span>Activity History</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] text-gray-300 font-bold font-mono">
                {historyLogs.length}
              </span>
            </button>

            {canManageMembers && <button
              onClick={() => setActiveTab('members')}
              className={`ct-settings-nav-btn ${activeTab === 'members' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Users size={16} className="text-emerald-400" />
                <span>Members & Roles</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] text-gray-300 font-bold font-mono">
                {membersList.length}
              </span>
            </button>}

            {canManageMembers && <button
              onClick={() => setActiveTab('danger')}
              className={`ct-settings-nav-btn danger ${activeTab === 'danger' ? 'active' : ''}`}
              style={{ marginTop: 'auto' }}
            >
              <div className="flex items-center gap-3">
                <ShieldAlert size={16} className="text-rose-400" />
                <span>Danger Zone</span>
              </div>
            </button>}
          </div>

          {/* TAB CONTENT VIEW */}
          <div className="ct-settings-modal-content">
            
            {/* 1. GENERAL DETAILS TAB */}
            {activeTab === 'general' && (
              <form onSubmit={handleSaveGeneralSettings} className="flex flex-col gap-6">
                <div>
                  <h3 className="ct-settings-section-title">General Details & Metadata</h3>
                  <p className="ct-settings-section-sub">Configure workspace title, description, language runtime, and invite code.</p>
                </div>

                <div className="ct-settings-card-section">
                  <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2.5">
                    <Sliders size={16} className="text-purple-400" />
                    <span>Workspace Basic Information</span>
                  </div>

                  <div className="space-y-5">
                    <div className="ct-settings-field">
                      <label className="ct-settings-label">Workspace Title</label>
                      <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="ct-settings-input"
                        placeholder="e.g. Python Telemetry ML Model"
                        required
                      />
                    </div>

                    <div className="ct-settings-field">
                      <label className="ct-settings-label">Description</label>
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="ct-settings-textarea"
                        placeholder="Briefly describe what this workspace is built for..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="ct-settings-field">
                        <label className="ct-settings-label">Primary Language</label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="ct-settings-select"
                        >
                          {AVAILABLE_LANGUAGES.map(lang => (
                            <option key={lang.id} value={lang.id} className="bg-[#12131F] text-white">
                              {lang.name} ({lang.ext})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="ct-settings-field">
                        <label className="ct-settings-label">Room Invite Code</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="text"
                            value={wsInviteCode}
                            readOnly
                            className="ct-settings-input text-purple-300 font-bold tracking-wider select-all flex-1 min-w-0"
                          />
                          <button
                            type="button"
                            onClick={handleCopyInvite}
                            className="px-7 py-3 h-[46px] min-w-[125px] bg-purple-600/35 hover:bg-purple-500/50 text-purple-100 border border-purple-400/60 rounded-xl text-xs font-mono font-bold leading-none transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-md whitespace-nowrap"
                          >
                            {copiedInvite ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                            <span>{copiedInvite ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* 2. THEME & ACCESS CONTROL TAB */}
            {activeTab === 'appearance' && (
              <form onSubmit={handleSaveGeneralSettings} className="flex flex-col gap-6">
                <div>
                  <h3 className="ct-settings-section-title">Theme Accent & Access Privileges</h3>
                  <p className="ct-settings-section-sub">Customize brand styling swatches and workspace visibility settings.</p>
                </div>

                {/* CARD 1: WORKSPACE METADATA QUICK STATS */}
                <div className="ct-settings-card-section">
                  <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2.5">
                    <Sliders size={16} className="text-purple-400" />
                    <span>Workspace Metadata Overview</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 font-mono text-xs">
                    <div className="ct-stat-grid-box">
                      <span className="text-[11px] text-purple-300 font-bold uppercase tracking-wider">Workspace ID</span>
                      <span className="font-bold text-white truncate text-xs">{wsId}</span>
                    </div>
                    <div className="ct-stat-grid-box">
                      <span className="text-[11px] text-cyan-300 font-bold uppercase tracking-wider">Files Count</span>
                      <span className="font-bold text-white text-xs">{customFiles.length || workspace?.filesCount || (workspace?.files ? workspace.files.length : 1)} Files</span>
                    </div>
                    <div className="ct-stat-grid-box">
                      <span className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider">Collaborators</span>
                      <span className="font-bold text-white text-xs">{membersList.length} Members</span>
                    </div>
                    <div className="ct-stat-grid-box">
                      <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">Time Spent</span>
                      <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                        <Clock size={14} className="text-amber-400 shrink-0" />
                        <span>{formatSessionLength(sessionSeconds)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD 2: BRAND ACCENT COLOR SELECTION */}
                <div className="ct-settings-card-section">
                  <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2.5">
                    <Sparkles size={16} className="text-purple-400" />
                    <span>Workspace Theme Accent Color</span>
                  </div>
                  <div className="ct-swatch-row">
                    {[
                      { id: 'purple', label: 'Purple Glow', bg: 'bg-purple-600' },
                      { id: 'cyan', label: 'Cyan Pulse', bg: 'bg-cyan-600' },
                      { id: 'emerald', label: 'Emerald Mint', bg: 'bg-emerald-600' },
                      { id: 'amber', label: 'Amber Gold', bg: 'bg-amber-600' },
                      { id: 'rose', label: 'Rose Velvet', bg: 'bg-rose-600' },
                      { id: 'blue', label: 'Deep Blue', bg: 'bg-blue-600' }
                    ].map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setBrandColor(c.id)}
                        className={`ct-swatch-btn ${c.bg} ${brandColor === c.id ? `ring-2 ring-white ring-offset-2 ring-offset-[#0D0E15] scale-110` : 'opacity-70 hover:opacity-100'}`}
                        title={c.label}
                      >
                        {brandColor === c.id && <Check size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CARD 3: VISIBILITY TOGGLE GRID */}
                <div className="ct-settings-card-section">
                  <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2.5">
                    <Lock size={16} className="text-purple-400" />
                    <span>Workspace Access Level</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`ct-access-card ${!isPublic ? 'bg-purple-600/25 border-purple-500/60 shadow-lg' : 'bg-white/[0.03] border-white/10 hover:bg-white/5'}`}
                    >
                      <Lock size={22} className={!isPublic ? 'text-purple-400 shrink-0 mt-0.5' : 'text-gray-500 shrink-0 mt-0.5'} />
                      <div>
                        <div className="text-xs font-bold font-mono text-white">Private Workspace</div>
                        <div className="text-[11px] text-gray-400 mt-1 leading-relaxed">Only invited members with code can enter.</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`ct-access-card ${isPublic ? 'bg-cyan-600/25 border-cyan-500/60 shadow-lg' : 'bg-white/[0.03] border-white/10 hover:bg-white/5'}`}
                    >
                      <Globe size={22} className={isPublic ? 'text-cyan-400 shrink-0 mt-0.5' : 'text-gray-500 shrink-0 mt-0.5'} />
                      <div>
                        <div className="text-xs font-bold font-mono text-white">Public Workspace</div>
                        <div className="text-[11px] text-gray-400 mt-1 leading-relaxed">Visible on CodeTrail public rooms.</div>
                      </div>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* 3. ACTIVITY HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="ct-history-tab-wrap space-y-5">
                <div className="ct-history-header-row">
                  <div>
                    <h3 className="ct-settings-section-title">Workspace Activity History</h3>
                    <p className="ct-settings-section-sub">Chronological audit trail of all workspace events & sessions.</p>
                  </div>

                  <div className="flex items-center shrink-0" style={{ gap: '10px' }}>
                    {isSessionActive ? (
                      <>
                        <span 
                          className="rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/40 text-[11px] font-mono font-bold flex items-center justify-center whitespace-nowrap shadow-sm"
                          style={{ padding: '6px 16px', minHeight: '34px', gap: '8px' }}
                        >
                          <Clock size={14} className="text-amber-400 shrink-0" />
                          <span>Active: {formatSessionLength(sessionSeconds)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleEndSession}
                          className="rounded-full bg-amber-600/30 hover:bg-amber-500/45 text-amber-100 border border-amber-400/50 text-[11px] font-mono font-bold transition-all shrink-0 flex items-center justify-center cursor-pointer whitespace-nowrap shadow-sm hover:scale-[1.02]"
                          style={{ padding: '6px 16px', minHeight: '34px', gap: '8px' }}
                          title="End session & log completed time spent"
                        >
                          <Zap size={14} className="text-amber-300 shrink-0" />
                          <span>End Session</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <span 
                          className="rounded-full bg-gray-500/15 text-gray-300 border border-gray-400/30 text-[11px] font-mono font-semibold flex items-center justify-center whitespace-nowrap shadow-sm"
                          style={{ padding: '6px 16px', minHeight: '34px', gap: '8px' }}
                        >
                          <Clock size={14} className="text-gray-400 shrink-0" />
                          <span>No Active Session</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleStartNewSession}
                          className="rounded-full bg-purple-600/30 hover:bg-purple-500/45 text-purple-100 border border-purple-400/50 text-[11px] font-mono font-bold transition-all shrink-0 flex items-center justify-center cursor-pointer whitespace-nowrap shadow-sm hover:scale-[1.02]"
                          style={{ padding: '6px 16px', minHeight: '34px', gap: '8px' }}
                          title="Start live workspace session"
                        >
                          <Zap size={14} className="text-purple-300 shrink-0" />
                          <span>Start Session</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="ct-btn-clear-history"
                    >
                      <Trash2 size={14} />
                      <span>Clear History</span>
                    </button>
                  </div>
                </div>

                {/* FILTER PILLS */}
                <div className="ct-history-filter-bar">
                  {['all', 'sessions', 'files', 'members', 'settings'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setHistoryFilter(cat)}
                      className={`ct-history-filter-pill ${historyFilter === cat ? 'active' : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* LOGS STREAM */}
                <div className="ct-history-stream">
                  {filteredHistory.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 text-gray-500 font-mono text-xs">
                      No activity logs found for this filter.
                    </div>
                  ) : (
                    (() => {
                      const firstSessionIdx = historyLogs.findIndex(l => l.type === 'session' || l.title === 'Session Started');
                      return filteredHistory.map(log => {
                        let IconComp = Sliders;
                        let badgeColor = 'purple';
                        if (log.type === 'session' || log.type === 'session-end') {
                          IconComp = Zap;
                          badgeColor = 'amber';
                        } else if (log.type === 'file') {
                          IconComp = FileCode;
                          badgeColor = 'yellow';
                        } else if (log.type === 'member') {
                          IconComp = UserCheck;
                          badgeColor = 'cyan';
                        }

                        const isLatestActiveSession = isSessionActive && firstSessionIdx !== -1 && historyLogs[firstSessionIdx]?.id === log.id;

                        return (
                          <div 
                            key={log.id}
                            className="ct-history-card-box"
                          >
                            <div className={`ct-history-icon-badge ${badgeColor}`}>
                              <IconComp size={20} />
                            </div>

                            <div className="ct-history-content">
                              <div className="ct-history-top-row">
                                <span className="ct-history-log-title">{log.title}</span>
                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span 
                                    className="rounded-full bg-purple-500/25 text-purple-200 border border-purple-400/40 text-[11px] font-mono font-semibold flex items-center justify-center whitespace-nowrap shadow-sm"
                                    style={{ padding: '3px 10px', height: '24px', lineHeight: '1' }}
                                  >
                                    {getRelativeTimeAgo(log.timestamp)}
                                  </span>
                                  <span className="ct-history-log-time">
                                    <Clock size={13} className="shrink-0 text-gray-400" />
                                    <span>{getFullTimestamp(log.timestamp)}</span>
                                  </span>
                                </div>
                              </div>
                              <p className="ct-history-log-details">{log.details}</p>
                              <div className="ct-history-card-footer text-xs font-mono text-gray-300">
                                <div 
                                  className="ct-history-actor flex items-center rounded-full bg-white/[0.05] border border-white/12 text-[11px] font-mono whitespace-nowrap shadow-sm"
                                  style={{ padding: '4px 14px', height: '32px', gap: '8px' }}
                                >
                                  <span className="text-purple-400 font-semibold tracking-wide">Actor:</span>
                                  <strong 
                                    className="text-white font-bold bg-white/10 border border-white/10 flex items-center justify-center"
                                    style={{ padding: '2px 10px', height: '22px', borderRadius: '6px', lineHeight: '1' }}
                                  >
                                    {log.user}
                                  </strong>
                                </div>

                                {log.sessionDuration ? (
                                  <div 
                                    className="rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40 text-[11px] font-mono font-semibold flex items-center justify-center whitespace-nowrap shadow-sm"
                                    style={{ padding: '4px 14px', height: '30px', gap: '6px', lineHeight: '1' }}
                                  >
                                    <Clock size={13} className="text-amber-400 shrink-0" />
                                    <span>Session Duration: {log.sessionDuration}</span>
                                  </div>
                                ) : isLatestActiveSession ? (
                                  <div 
                                    className="rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40 text-[11px] font-mono font-semibold flex items-center justify-center whitespace-nowrap shadow-sm"
                                    style={{ padding: '4px 14px', height: '30px', gap: '6px', lineHeight: '1' }}
                                  >
                                    <Clock size={13} className="text-amber-400 shrink-0" />
                                    <span>Active Session: {formatSessionLength(sessionSeconds)}</span>
                                  </div>
                                ) : (
                                  <div 
                                    className="rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/40 text-[11px] font-mono font-semibold flex items-center justify-center whitespace-nowrap shadow-sm"
                                    style={{ padding: '4px 14px', height: '30px', gap: '6px', lineHeight: '1' }}
                                  >
                                    <span>Event: Logged</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>
            )}

            {/* 4. MEMBERS & ROLES TAB */}
            {activeTab === 'members' && (
              <div className="ct-history-tab-wrap space-y-5">
                <div>
                  <h3 className="ct-settings-section-title">Workspace Members & Permissions</h3>
                  <p className="ct-settings-section-sub">Manage member access levels and role privileges dynamically.</p>
                </div>

                {/* INVITE NEW MEMBER FORM */}
                <form 
                  onSubmit={handleAddMember} 
                  className="rounded-xl bg-[#131422] border border-white/12 shadow-md"
                  style={{ padding: '16px 20px' }}
                >
                  <div className="text-xs font-bold text-white font-mono flex items-center gap-2" style={{ marginBottom: '12px' }}>
                    <UserCheck size={16} className="text-emerald-400" />
                    <span>Invite Dynamic Member</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input 
                      type="email"
                      placeholder="Enter collaborator email..."
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="ct-settings-input flex-1 w-full text-xs font-mono"
                      style={{ height: '38px', padding: '0 14px', fontSize: '12px' }}
                      required
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="bg-[#090A10] border border-white/15 rounded-xl text-xs text-white font-mono cursor-pointer focus:outline-none focus:border-purple-400 shrink-0 w-full sm:w-auto"
                      style={{ height: '38px', padding: '0 12px', fontSize: '12px', minWidth: '110px' }}
                    >
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-400/50 rounded-xl text-xs font-mono font-bold transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto shadow-md whitespace-nowrap"
                      style={{ height: '38px', padding: '0 18px', fontSize: '12px', minWidth: '130px' }}
                    >
                      Invite Member
                    </button>
                  </div>
                </form>

                <div className="ct-members-stream space-y-3">
                  {membersList.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl bg-white/[0.02] border border-white/10 text-gray-500 text-xs font-mono">
                      No members added yet. Invite collaborators above!
                    </div>
                  ) : (
                    membersList.map(member => (
                      <div 
                        key={member.id}
                        className="rounded-xl bg-[#131422] border border-white/12 shadow-sm flex items-center justify-between gap-3 transition-all hover:border-purple-500/40 hover:bg-[#171829]"
                        style={{ padding: '10px 16px' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                            {member.name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white truncate">{member.name}</span>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${member.status === 'online' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : member.status === 'away' ? 'bg-amber-400' : 'bg-gray-500'}`} />
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono truncate mt-0.5">{member.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {member.role === 'owner' ? (
                            <span 
                              className="rounded-full bg-purple-500/25 text-purple-200 border border-purple-400/50 text-[11px] font-mono font-bold flex items-center justify-center whitespace-nowrap shadow-sm"
                              style={{ padding: '4px 14px', height: '28px', lineHeight: '1' }}
                            >
                              Owner
                            </span>
                          ) : (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}
                                className="bg-[#090A10] border border-white/15 rounded-lg text-white font-mono cursor-pointer focus:outline-none focus:border-purple-400 leading-none"
                                style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                              >
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.id)}
                                className="rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center shadow-sm shrink-0"
                                style={{ height: '28px', width: '28px' }}
                                title="Remove member"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 5. DANGER ZONE TAB */}
            {activeTab === 'danger' && (
              <div className="ct-history-tab-wrap space-y-5">
                <div>
                  <h3 className="text-base font-bold text-rose-400 mb-1">Danger Zone</h3>
                  <p className="ct-settings-section-sub">Irreversible workspace management actions.</p>
                </div>

                <div className="ct-danger-stream space-y-3">
                  <div 
                    className="rounded-xl bg-rose-500/[0.06] border border-rose-500/30 shadow-md flex items-center justify-between gap-4 transition-all hover:bg-rose-500/[0.1]"
                    style={{ padding: '14px 18px' }}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">Clear Activity History</h4>
                      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">Wipe all audit logs for this workspace session.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="bg-rose-600/30 hover:bg-rose-500/40 text-rose-200 border border-rose-500/50 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2 shadow-sm"
                      style={{ height: '34px', padding: '0 16px', minWidth: '110px' }}
                    >
                      Clear Logs
                    </button>
                  </div>

                  <div 
                    className="rounded-xl bg-amber-500/[0.06] border border-amber-500/30 shadow-md flex items-center justify-between gap-4 transition-all hover:bg-amber-500/[0.1]"
                    style={{ padding: '14px 18px' }}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">Archive Workspace</h4>
                      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">Mark workspace as read-only archive mode.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert('Workspace archived.')}
                      className="bg-amber-600/30 hover:bg-amber-500/40 text-amber-200 border border-amber-500/50 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2 shadow-sm"
                      style={{ height: '34px', padding: '0 16px', minWidth: '110px' }}
                    >
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* COMMON MODAL FOOTER BAR */}
        <div className="ct-settings-modal-footer">
          <div className="flex items-center">
            {saveMessage && (
              <div 
                className="rounded-full bg-purple-500/25 text-purple-100 border border-purple-400/50 text-xs font-mono font-medium flex items-center justify-center gap-2 animate-fadeIn shadow-md"
                style={{ padding: '5px 16px', minHeight: '32px', lineHeight: '1' }}
              >
                <Sparkles size={14} className="text-purple-300 shrink-0" />
                <span className="whitespace-nowrap">{saveMessage}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="ct-settings-cancel-btn"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSaveGeneralSettings}
              disabled={saving || !canManageSettings}
              className="ct-settings-save-btn"
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WorkspaceSettingsModal;
