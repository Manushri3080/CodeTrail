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
  AlertTriangle,
  Bell,
  Shield,
  ShieldCheck,
  Eye,
  Edit3,
  Crown,
  CheckCircle2,
  XCircle,
  Info,
  Loader2
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { getRelativeTime } from '../../utils/timeUtils';

const AVAILABLE_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', ext: '.js' },
  { id: 'typescript', name: 'TypeScript', ext: '.ts' },
  { id: 'python', name: 'Python', ext: '.py' },
  { id: 'cpp', name: 'C++', ext: '.cpp' },
  { id: 'java', name: 'Java', ext: '.java' },
  { id: 'rust', name: 'Rust', ext: '.rs' },
  { id: 'go', name: 'Go', ext: '.go' }
];

export const ROLE_CONFIG = {
  owner: {
    id: 'owner',
    name: 'Owner',
    level: 4,
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    avatarGradient: 'from-purple-500 via-indigo-600 to-purple-700',
    dotColor: 'bg-purple-400',
    description: 'Full workspace authority: configure settings, manage all member roles, and archive/delete workspace.',
    keyCapabilities: [
      { label: 'Edit Files', allowed: true },
      { label: 'Run Sandbox Code', allowed: true },
      { label: 'Manage Settings', allowed: true },
      { label: 'Manage Roles', allowed: true },
      { label: 'Clear Logs', allowed: true },
      { label: 'Delete Workspace', allowed: true }
    ]
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    level: 3,
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    avatarGradient: 'from-blue-500 via-sky-600 to-indigo-700',
    dotColor: 'bg-blue-400',
    description: 'Operational manager: configure settings, manage files, and invite/assign Editor & Viewer roles.',
    keyCapabilities: [
      { label: 'Edit Files', allowed: true },
      { label: 'Run Sandbox Code', allowed: true },
      { label: 'Manage Settings', allowed: true },
      { label: 'Manage Roles (Ed/Vw)', allowed: true },
      { label: 'Clear Logs', allowed: true },
      { label: 'Delete Workspace', allowed: false }
    ]
  },
  editor: {
    id: 'editor',
    name: 'Editor',
    level: 2,
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    avatarGradient: 'from-emerald-500 via-teal-600 to-cyan-700',
    dotColor: 'bg-emerald-400',
    description: 'Active developer: full code editing and sandbox execution privileges in this workspace.',
    keyCapabilities: [
      { label: 'Edit Files', allowed: true },
      { label: 'Run Sandbox Code', allowed: true },
      { label: 'Manage Settings', allowed: false },
      { label: 'Manage Roles', allowed: false },
      { label: 'Clear Logs', allowed: false },
      { label: 'Delete Workspace', allowed: false }
    ]
  },
  viewer: {
    id: 'viewer',
    name: 'Viewer',
    level: 1,
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    avatarGradient: 'from-amber-500 via-orange-600 to-yellow-700',
    dotColor: 'bg-amber-400',
    description: 'Observer access: inspect files, view execution history, and review participant permissions.',
    keyCapabilities: [
      { label: 'Edit Files', allowed: false },
      { label: 'Run Sandbox Code', allowed: false },
      { label: 'Manage Settings', allowed: false },
      { label: 'Manage Roles', allowed: false },
      { label: 'Clear Logs', allowed: false },
      { label: 'Delete Workspace', allowed: false }
    ]
  }
};

export const WorkspaceSettingsModal = ({
  isOpen,
  onClose,
  workspace,
  onUpdateWorkspace,
  customFiles = [],
  initialTab = 'general',
  showToast = null
}) => {
  const wsId = workspace?._id || workspace?.id || 'demo-workspace';
  const workspaceRole = workspace?.role || 'viewer';
  const canManageSettings = ['owner', 'admin'].includes(workspaceRole);
  const canManageMembers = ['owner', 'admin'].includes(workspaceRole);
  const canClearHistory = ['owner', 'admin'].includes(workspaceRole);
  const currentUser = JSON.parse(localStorage.getItem('ct-auth-user')) || { id: 'usr-guest', name: 'Maryam Shaikh', role: 'admin' };
  const currentUserId = currentUser.id || currentUser._id || 'usr-guest';
  const token = localStorage.getItem('ct-auth-token');

  const [activeTab, setActiveTab] = useState(() => {
    try {
      if (initialTab && ['general', 'preferences', 'appearance', 'history', 'members', 'danger'].includes(initialTab)) {
        return initialTab;
      }
      const saved = localStorage.getItem(`ct-workspace-settings-activetab-${wsId}`);
      if (saved && ['general', 'preferences', 'appearance', 'history', 'members', 'danger'].includes(saved)) return saved;
    } catch (e) { }
    return 'general';
  });

  // Sync tab when modal opens or initialTab prop changes
  useEffect(() => {
    if (isOpen && initialTab && ['general', 'preferences', 'appearance', 'history', 'members', 'danger'].includes(initialTab)) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    try {
      localStorage.setItem(`ct-workspace-settings-activetab-${wsId}`, activeTab);
    } catch (e) { }
  }, [activeTab, wsId]);

  useEffect(() => {
    // Only Danger Zone requires member/settings management rights; Members/Permissions is open to all
    if (!canManageMembers && activeTab === 'danger') {
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
  const [isSaveError, setIsSaveError] = useState(false);

  // Workspace-Level Preferences State (TASK-3)
  const [allowAnonymousExecution, setAllowAnonymousExecution] = useState(!!workspace?.settings?.allowAnonymousExecution);
  const [autoSaveInterval, setAutoSaveInterval] = useState(workspace?.settings?.autoSaveInterval || 2500);
  const [tabSize, setTabSize] = useState(workspace?.settings?.tabSize || 2);
  const [wordWrap, setWordWrap] = useState(workspace?.settings?.wordWrap !== undefined ? workspace.settings.wordWrap : true);
  const [emailOnMemberJoin, setEmailOnMemberJoin] = useState(!!workspace?.settings?.notifications?.emailOnMemberJoin);
  const [executionFailureAlerts, setExecutionFailureAlerts] = useState(workspace?.settings?.notifications?.executionFailureAlerts !== undefined ? workspace.settings.notifications.executionFailureAlerts : true);
  const [sessionSummaryAlerts, setSessionSummaryAlerts] = useState(workspace?.settings?.notifications?.sessionSummaryAlerts !== undefined ? workspace.settings.notifications.sessionSummaryAlerts : true);

  // Sync state if incoming workspace prop changes
  useEffect(() => {
    if (workspace) {
      setTitle(workspace.title || workspace.name || 'Project Workspace');
      setDescription(workspace.description || workspace.desc || 'Collaborative development workspace on CodeTrail');
      setLanguage(workspace.language || 'javascript');
      setBrandColor(workspace.brandColor || 'purple');
      setBrandIcon(workspace.icon || 'Rocket');
      setIsPublic(!!workspace.settings?.isPublic);
      setAllowAnonymousExecution(!!workspace.settings?.allowAnonymousExecution);
      setAutoSaveInterval(workspace.settings?.autoSaveInterval || 2500);
      setTabSize(workspace.settings?.tabSize || 2);
      setWordWrap(workspace.settings?.wordWrap !== undefined ? workspace.settings.wordWrap : true);
      setEmailOnMemberJoin(!!workspace.settings?.notifications?.emailOnMemberJoin);
      setExecutionFailureAlerts(workspace.settings?.notifications?.executionFailureAlerts !== undefined ? workspace.settings.notifications.executionFailureAlerts : true);
      setSessionSummaryAlerts(workspace.settings?.notifications?.sessionSummaryAlerts !== undefined ? workspace.settings.notifications.sessionSummaryAlerts : true);
    }
  }, [workspace]);

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
    } catch (e) { }
  }, [isOpen, wsId]);

  // Dynamic Live Session Length / Time Spent Timer State
  const [sessionSeconds, setSessionSeconds] = useState(() => {
    try {
      const start = localStorage.getItem(`ct-workspace-session-start-${wsId}`);
      if (start) return Math.max(0, Math.floor((Date.now() - parseInt(start, 10)) / 1000));
    } catch (e) { }
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
  const [effectiveUserRole, setEffectiveUserRole] = useState(workspaceRole);
  const [roleDefinitions, setRoleDefinitions] = useState(null);
  const [memberUpdatingId, setMemberUpdatingId] = useState(null);

  // History Activity Log State
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'sessions' | 'files' | 'settings' | 'members'
  const [historyLogs, setHistoryLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(`ct-workspace-history-${wsId}`);
      if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
    } catch (e) { }

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
          if (memRes.data?.currentUserRole) {
            setEffectiveUserRole(memRes.data.currentUserRole);
          }
          if (memRes.data?.roleDefinitions) {
            setRoleDefinitions(memRes.data.roleDefinitions);
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
          const mRole = m.role || (idx === 0 ? 'owner' : 'editor');
          const isOwnerMember = idx === 0 || mRole === 'owner';
          const roleDef = ROLE_CONFIG[mRole] || ROLE_CONFIG.editor;

          return {
            id: userObj?._id || userObj?.id || `mem-${idx}`,
            _id: userObj?._id || userObj?.id || `mem-${idx}`,
            name: uName,
            email: uEmail,
            role: mRole,
            isOwner: isOwnerMember,
            status: idx === 0 ? 'online' : (idx === 1 ? 'online' : 'offline'),
            capabilities: {
              canViewWorkspace: true,
              canEditFiles: ['owner', 'admin', 'editor'].includes(mRole),
              canExecuteCode: ['owner', 'admin', 'editor'].includes(mRole),
              canManageSettings: ['owner', 'admin'].includes(mRole),
              canInviteMembers: ['owner', 'admin'].includes(mRole),
              canAssignRoles: ['owner', 'admin'].includes(mRole),
              canRemoveMembers: ['owner', 'admin'].includes(mRole),
              canClearHistory: ['owner', 'admin'].includes(mRole),
              canDeleteWorkspace: mRole === 'owner'
            },
            roleDetails: roleDef
          };
        });
        setMembersList(dynamicMembers);
      } else {
        const ownerDef = ROLE_CONFIG.owner;
        setMembersList([
          {
            id: 'owner-1',
            _id: 'owner-1',
            name: currentUser.name || 'Maryam Shaikh',
            email: currentUser.email || 'maryam@example.com',
            role: 'owner',
            isOwner: true,
            status: 'online',
            capabilities: {
              canViewWorkspace: true,
              canEditFiles: true,
              canExecuteCode: true,
              canManageSettings: true,
              canInviteMembers: true,
              canAssignRoles: true,
              canRemoveMembers: true,
              canClearHistory: true,
              canDeleteWorkspace: true
            },
            roleDetails: ownerDef
          }
        ]);
      }
    };

    fetchDynamicWorkspaceDataFromDB();
  }, [isOpen, wsId, token, workspace, currentUser.name, currentUser.email]);

  // Save history to localStorage cache
  useEffect(() => {
    try {
      localStorage.setItem(`ct-workspace-history-${wsId}`, JSON.stringify(historyLogs));
    } catch (e) { }
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
    } catch (e) { }
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
    } catch (e) { }

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
      setIsSaveError(true);
      setSaveMessage('Read-only access: only Owners and Admins can modify settings.');
      return;
    }
    if (!title || !title.trim()) {
      setIsSaveError(true);
      setSaveMessage('Workspace title is required.');
      return;
    }
    if (title.trim().length > 80) {
      setIsSaveError(true);
      setSaveMessage('Workspace title cannot exceed 80 characters.');
      return;
    }
    if (description && description.trim().length > 300) {
      setIsSaveError(true);
      setSaveMessage('Description cannot exceed 300 characters.');
      return;
    }

    setSaving(true);
    setIsSaveError(false);
    setSaveMessage('');

    const payload = {
      title: title.trim(),
      description: description.trim(),
      language,
      brandColor,
      icon: brandIcon,
      settings: {
        isPublic,
        allowAnonymousExecution,
        autoSaveInterval,
        tabSize,
        wordWrap,
        notifications: {
          emailOnMemberJoin,
          executionFailureAlerts,
          sessionSummaryAlerts
        }
      }
    };

    try {
      if (token && wsId && wsId !== 'demo-workspace') {
        await axios.patch(`${API_BASE}/workspaces/${wsId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      const updatedWs = {
        ...(workspace || {}),
        title: title.trim(),
        description: description.trim(),
        language,
        brandColor,
        icon: brandIcon,
        settings: {
          ...(workspace?.settings || {}),
          isPublic,
          allowAnonymousExecution,
          autoSaveInterval,
          tabSize,
          wordWrap,
          notifications: {
            emailOnMemberJoin,
            executionFailureAlerts,
            sessionSummaryAlerts
          }
        }
      };

      if (onUpdateWorkspace) onUpdateWorkspace(updatedWs);

      // Save to active workspace session in localStorage
      localStorage.setItem('ct-active-workspace-session', JSON.stringify(updatedWs));

      // Record activity log event in DB
      await addHistoryLog('settings', 'Settings Updated', `Updated workspace title to "${title.trim()}" and preferences.`);

      setIsSaveError(false);
      setSaveMessage('Workspace settings updated successfully!');

      if (typeof showToast === 'function') {
        showToast('Workspace settings updated successfully!', 'success');
      }

      // Automatically close modal after brief delay (500ms)
      setTimeout(() => {
        setSaveMessage('');
        if (onClose) onClose();
      }, 500);
    } catch (err) {
      console.warn('Save workspace settings error:', err.message);
      const errMsg = err.response?.data?.message || err.message || 'Failed to save workspace settings. Please try again.';
      setIsSaveError(true);
      setSaveMessage(errMsg);

      if (typeof showToast === 'function') {
        showToast(errMsg, 'error');
      }
      // Keep modal open so the user can see error and correct the issue
    } finally {
      setSaving(false);
    }
  };

  const handleChangeMemberRole = async (memberId, newRole) => {
    const member = membersList.find(m => m.id === memberId || m._id === memberId);
    if (!member) return;

    const currentRole = effectiveUserRole || workspaceRole;
    if (currentRole !== 'owner' && currentRole !== 'admin') {
      setSaveMessage('Unauthorized: only workspace owners and administrators can assign roles.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    if (currentRole === 'admin' && newRole === 'admin') {
      setSaveMessage('Unauthorized: only the workspace owner can assign administrator roles.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    if (currentRole === 'admin' && member.role === 'admin') {
      setSaveMessage('Unauthorized: administrators cannot modify another administrator.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    if (member.role === 'owner' || member.isOwner) {
      setSaveMessage('The workspace owner role cannot be modified.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setMemberUpdatingId(memberId);
    const prevRole = member.role;
    const fallbackDef = (roleDefinitions && roleDefinitions[newRole]) || ROLE_CONFIG[newRole];

    // Optimistic UI update
    setMembersList(prev => prev.map(m => {
      if (m.id === memberId || m._id === memberId) {
        return {
          ...m,
          role: newRole,
          capabilities: fallbackDef?.capabilities || m.capabilities,
          roleDetails: fallbackDef || m.roleDetails
        };
      }
      return m;
    }));

    try {
      if (token && wsId && wsId !== 'demo-workspace') {
        const res = await axios.patch(`${API_BASE}/workspaces/${wsId}/members/${memberId}`, {
          role: newRole
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.member) {
          setMembersList(prev => prev.map(m => (m.id === memberId || m._id === memberId) ? res.data.member : m));
        }
      }

      await addHistoryLog('member', 'Member Role Updated', `Changed ${member.name}'s role to ${newRole.toUpperCase()}.`);
      setSaveMessage(`Updated ${member.name}'s role to ${newRole.toUpperCase()}!`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.warn('Failed to update member role in DB:', err.message);
      // Revert on error
      setMembersList(prev => prev.map(m => {
        if (m.id === memberId || m._id === memberId) {
          const revertDef = (roleDefinitions && roleDefinitions[prevRole]) || ROLE_CONFIG[prevRole];
          return {
            ...m,
            role: prevRole,
            capabilities: revertDef?.capabilities || m.capabilities,
            roleDetails: revertDef || m.roleDetails
          };
        }
        return m;
      }));
      const errMsg = err.response?.data?.message || 'Failed to update member role.';
      setSaveMessage(errMsg);
      setTimeout(() => setSaveMessage(''), 4000);
    } finally {
      setMemberUpdatingId(null);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    const currentRole = effectiveUserRole || workspaceRole;
    if (currentRole !== 'owner' && currentRole !== 'admin') {
      setSaveMessage('Unauthorized: only workspace owners and administrators can invite members.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    if (!newMemberEmail.trim()) return;

    const email = newMemberEmail.trim().toLowerCase();
    if (currentRole === 'admin' && newMemberRole === 'admin') {
      setSaveMessage('Only the workspace owner can invite or appoint administrators.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

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
        setSaveMessage(`Successfully invited ${email} as ${newMemberRole.toUpperCase()}!`);
      } else {
        const nameStr = email.split('@')[0].replace(/[._-]/g, ' ');
        const memberName = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
        const fallbackDef = (roleDefinitions && roleDefinitions[newMemberRole]) || ROLE_CONFIG[newMemberRole];
        const newMember = {
          id: `mem-${Date.now()}`,
          _id: `mem-${Date.now()}`,
          name: memberName,
          email: email,
          role: newMemberRole,
          isOwner: false,
          status: 'offline',
          capabilities: fallbackDef?.capabilities || {
            canViewWorkspace: true,
            canEditFiles: ['owner', 'admin', 'editor'].includes(newMemberRole),
            canExecuteCode: ['owner', 'admin', 'editor'].includes(newMemberRole),
            canManageSettings: ['owner', 'admin'].includes(newMemberRole),
            canInviteMembers: ['owner', 'admin'].includes(newMemberRole),
            canAssignRoles: ['owner', 'admin'].includes(newMemberRole),
            canRemoveMembers: ['owner', 'admin'].includes(newMemberRole),
            canClearHistory: ['owner', 'admin'].includes(newMemberRole),
            canDeleteWorkspace: newMemberRole === 'owner'
          },
          roleDetails: fallbackDef
        };
        setMembersList(prev => [...prev, newMember]);
        await addHistoryLog(
          'member',
          'Member Invited',
          `Invited ${memberName} (${email}) as ${newMemberRole.toUpperCase()}.`
        );
        setSaveMessage(`Invited ${email} as ${newMemberRole.toUpperCase()}`);
      }
      setNewMemberEmail('');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.warn('Failed to add member to database:', err.message);
      setSaveMessage(err.response?.data?.message || 'Failed to invite member');
      setTimeout(() => setSaveMessage(''), 3500);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    const currentRole = effectiveUserRole || workspaceRole;
    if (currentRole !== 'owner' && currentRole !== 'admin') {
      setSaveMessage('Unauthorized: only workspace owners and administrators can remove members.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    const member = membersList.find(m => m.id === memberId || m._id === memberId);
    if (!member) return;

    if (member.role === 'owner' || member.isOwner) {
      setSaveMessage('The workspace owner cannot be removed.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    if (currentRole === 'admin' && member.role === 'admin') {
      setSaveMessage('Administrators cannot remove another administrator.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    if (window.confirm(`Are you sure you want to remove ${member.name} (${member.role.toUpperCase()}) from this workspace?`)) {
      setMembersList(prev => prev.filter(m => m.id !== memberId && m._id !== memberId));

      if (token && wsId && wsId !== 'demo-workspace') {
        try {
          await axios.delete(`${API_BASE}/workspaces/${wsId}/members/${memberId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) {
          console.warn('Failed to remove member from DB:', err.message);
          const errMsg = err.response?.data?.message || 'Failed to remove member.';
          setSaveMessage(errMsg);
          setTimeout(() => setSaveMessage(''), 3500);
        }
      }

      await addHistoryLog(
        'member',
        'Member Removed',
        `Removed ${member.name} (${member.email}) from workspace.`
      );
      setSaveMessage(`Removed ${member.name} from workspace.`);
      setTimeout(() => setSaveMessage(''), 3000);
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
    return getRelativeTime(isoString);
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
              onClick={() => setActiveTab('preferences')}
              className={`ct-settings-nav-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Settings size={16} className="text-blue-400" />
                <span>Preferences & Behavior</span>
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

            <button
              onClick={() => setActiveTab('members')}
              className={`ct-settings-nav-btn ${activeTab === 'members' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Users size={16} className="text-emerald-400" />
                <span>Participants & Permissions</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] text-gray-300 font-bold font-mono">
                {membersList.length}
              </span>
            </button>

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

            {/* RBAC Permission Banner (TASK-5) */}
            {!canManageSettings && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono mb-4">
                <AlertTriangle size={18} className="shrink-0 text-amber-400" />
                <div>
                  <span className="font-bold">Read-Only Mode: </span>
                  You have the <span className="underline font-bold uppercase">{workspaceRole}</span> role in this workspace. Modifying workspace details, configuration, and preferences requires Owner or Administrator privileges.
                </div>
              </div>
            )}

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
                      <div className="flex justify-between items-center mb-1">
                        <label className="ct-settings-label mb-0">Workspace Title</label>
                        <span className={`text-[10px] font-mono ${title.length > 80 ? 'text-rose-400 font-bold' : 'text-gray-400'}`}>
                          {title.length}/80
                        </span>
                      </div>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={!canManageSettings}
                        className="ct-settings-input disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="e.g. Python Telemetry ML Model"
                        maxLength={80}
                        required
                      />
                    </div>

                    <div className="ct-settings-field">
                      <div className="flex justify-between items-center mb-1">
                        <label className="ct-settings-label mb-0">Description</label>
                        <span className={`text-[10px] font-mono ${description.length > 300 ? 'text-rose-400 font-bold' : 'text-gray-400'}`}>
                          {description.length}/300
                        </span>
                      </div>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={!canManageSettings}
                        className="ct-settings-textarea disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Briefly describe what this workspace is built for..."
                        maxLength={300}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="ct-settings-field">
                        <label className="ct-settings-label">Primary Language</label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          disabled={!canManageSettings}
                          className="ct-settings-select disabled:opacity-60 disabled:cursor-not-allowed"
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

            {/* WORKSPACE PREFERENCES TAB (TASK-3) */}
            {activeTab === 'preferences' && (
              <form onSubmit={handleSaveGeneralSettings} className="flex flex-col gap-6">
                <div>
                  <h3 className="ct-settings-section-title">Workspace Preferences & Behavior</h3>
                  <p className="ct-settings-section-sub">Configure sandbox execution policies, editor sync behavior, and notification alerts.</p>
                </div>

                {/* 1. EXECUTION POLICIES */}
                <div className="ct-settings-card-section">
                  <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2.5">
                    <Zap size={16} className="text-amber-400" />
                    <span>Execution Engine Policies</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="space-y-1 pr-4">
                      <div className="text-xs font-bold font-mono text-white">Allow Anonymous & Viewer Execution</div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Allow guests and users with Viewer permissions to execute code within the Piston v2 multi-language sandbox.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={allowAnonymousExecution}
                        onChange={(e) => setAllowAnonymousExecution(e.target.checked)}
                        disabled={!canManageSettings}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50"></div>
                    </label>
                  </div>
                </div>

                {/* 2. EDITOR SYNCHRONIZATION & DEFAULTS */}
                <div className="ct-settings-card-section">
                  <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2.5">
                    <FileCode size={16} className="text-cyan-400" />
                    <span>Editor & Auto-Save Sync</span>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="ct-settings-field">
                        <label className="ct-settings-label">Auto-Save Frequency</label>
                        <select
                          value={autoSaveInterval}
                          onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                          disabled={!canManageSettings}
                          className="ct-settings-select disabled:opacity-60"
                        >
                          <option value={1000} className="bg-[#12131F] text-white">Aggressive (1.0s)</option>
                          <option value={2500} className="bg-[#12131F] text-white">Standard (2.5s - Recommended)</option>
                          <option value={5000} className="bg-[#12131F] text-white">Relaxed (5.0s)</option>
                          <option value={10000} className="bg-[#12131F] text-white">Infrequent (10.0s)</option>
                        </select>
                      </div>

                      <div className="ct-settings-field">
                        <label className="ct-settings-label">Default Tab Indentation</label>
                        <select
                          value={tabSize}
                          onChange={(e) => setTabSize(Number(e.target.value))}
                          disabled={!canManageSettings}
                          className="ct-settings-select disabled:opacity-60"
                        >
                          <option value={2} className="bg-[#12131F] text-white">2 Spaces (Modern JS/Python standard)</option>
                          <option value={4} className="bg-[#12131F] text-white">4 Spaces (C++/Java standard)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="space-y-1 pr-4">
                        <div className="text-xs font-bold font-mono text-white">Monaco Editor Word Wrap</div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Automatically soft-wrap code lines exceeding the viewport editor width.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={wordWrap}
                          onChange={(e) => setWordWrap(e.target.checked)}
                          disabled={!canManageSettings}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 disabled:opacity-50"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. NOTIFICATIONS & TELEMETRY ALERTS */}
                <div className="ct-settings-card-section">
                  <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2.5">
                    <Bell size={16} className="text-purple-400" />
                    <span>Notifications & Telemetry Alerts</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="pr-4">
                        <div className="text-xs font-bold font-mono text-white">Collaborator Join Notifications</div>
                        <div className="text-[11px] text-gray-400">Receive alert notifications when peers join via invite code.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailOnMemberJoin}
                        onChange={(e) => setEmailOnMemberJoin(e.target.checked)}
                        disabled={!canManageSettings}
                        className="w-4 h-4 accent-purple-600 rounded cursor-pointer disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="pr-4">
                        <div className="text-xs font-bold font-mono text-white">Execution Failure Alerts</div>
                        <div className="text-[11px] text-gray-400">Display diagnostic alert notifications when compile errors or execution crashes occur.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={executionFailureAlerts}
                        onChange={(e) => setExecutionFailureAlerts(e.target.checked)}
                        disabled={!canManageSettings}
                        className="w-4 h-4 accent-purple-600 rounded cursor-pointer disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="pr-4">
                        <div className="text-xs font-bold font-mono text-white">Session Contribution Summary</div>
                        <div className="text-[11px] text-gray-400">Prompt a contribution dossier summary report at the completion of active editing sessions.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={sessionSummaryAlerts}
                        onChange={(e) => setSessionSummaryAlerts(e.target.checked)}
                        disabled={!canManageSettings}
                        className="w-4 h-4 accent-purple-600 rounded cursor-pointer disabled:opacity-50"
                      />
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

            {/* 4. PARTICIPANTS & PERMISSIONS TAB */}
            {activeTab === 'members' && (
              <div className="ct-history-tab-wrap space-y-6">
                <div>
                  <h3 className="ct-settings-section-title">Workspace Participants & Permissions</h3>
                  <p className="ct-settings-section-sub">
                    Real-time directory of participants, assigned roles, and granular Role-Based Access Control (RBAC) capabilities.
                  </p>
                </div>

                {/* ROLE & AUTHORITY STATUS BANNER */}
                {(() => {
                  const currentRole = effectiveUserRole || workspaceRole;
                  if (currentRole === 'owner') {
                    return (
                      <div className="flex items-center gap-3.5 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs font-mono shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-300">
                          <Crown size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-white uppercase tracking-wider text-[11px]">
                            Workspace Owner Authority (Level 4)
                          </div>
                          <div className="text-gray-300 mt-0.5 leading-relaxed">
                            You have full administrative authority across this workspace. You can invite collaborators, assign or update any role (Admin, Editor, Viewer), configure settings, and manage workspace lifecycle.
                          </div>
                        </div>
                      </div>
                    );
                  } else if (currentRole === 'admin') {
                    return (
                      <div className="flex items-center gap-3.5 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs font-mono shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 text-blue-300">
                          <Shield size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-white uppercase tracking-wider text-[11px]">
                            Administrator Privileges (Level 3)
                          </div>
                          <div className="text-gray-300 mt-0.5 leading-relaxed">
                            You can invite collaborators and assign or modify Editor and Viewer roles. Only the Workspace Owner can appoint or modify Administrators.
                          </div>
                        </div>
                      </div>
                    );
                  } else if (currentRole === 'editor') {
                    return (
                      <div className="flex items-center gap-3.5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs font-mono shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-300">
                          <Edit3 size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-white uppercase tracking-wider text-[11px]">
                            Editor Access · Read-Only Directory (Level 2)
                          </div>
                          <div className="text-gray-300 mt-0.5 leading-relaxed">
                            You have full code editing and sandbox execution privileges in this workspace. Role assignments and participant permissions are read-only.
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center gap-3.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300">
                          <Eye size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-white uppercase tracking-wider text-[11px]">
                            Viewer Access · Read-Only Directory (Level 1)
                          </div>
                          <div className="text-gray-300 mt-0.5 leading-relaxed">
                            You have read-only access to view files, execution logs, and participant permissions. Role assignments require Owner or Administrator privileges.
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}

                {/* INVITE NEW MEMBER FORM (Authorized for Owner & Admin) */}
                {['owner', 'admin'].includes(effectiveUserRole || workspaceRole) && (
                  <form
                    onSubmit={handleAddMember}
                    className="rounded-xl bg-[#131422] border border-white/12 shadow-md p-4 sm:p-5"
                  >
                    <div className="text-xs font-bold text-white font-mono flex items-center gap-2 mb-3">
                      <UserCheck size={16} className="text-emerald-400" />
                      <span>Invite & Assign Participant</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="email"
                        placeholder="Enter collaborator email (e.g. alex@example.com)..."
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        className="ct-settings-input flex-1 w-full text-xs font-mono"
                        style={{ height: '40px', padding: '0 14px', fontSize: '12px' }}
                        required
                      />
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        className="bg-[#090A10] border border-white/15 rounded-xl text-xs text-white font-mono cursor-pointer focus:outline-none focus:border-purple-400 shrink-0 w-full sm:w-auto"
                        style={{ height: '40px', padding: '0 12px', fontSize: '12px', minWidth: '120px' }}
                      >
                        {(effectiveUserRole || workspaceRole) === 'owner' && (
                          <option value="admin">Admin (L3)</option>
                        )}
                        <option value="editor">Editor (L2)</option>
                        <option value="viewer">Viewer (L1)</option>
                      </select>
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-400/50 rounded-xl text-xs font-mono font-bold transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto shadow-md whitespace-nowrap disabled:opacity-50"
                        style={{ height: '40px', padding: '0 20px', fontSize: '12px', minWidth: '140px' }}
                      >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />}
                        <span>Invite Member</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* PARTICIPANTS DIRECTORY STREAM */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400 px-1">
                    <span className="font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                      <Users size={14} className="text-purple-400" />
                      <span>Workspace Participants ({membersList.length})</span>
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Hover on capabilities for detailed permissions
                    </span>
                  </div>

                  {membersList.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 text-gray-500 text-xs font-mono">
                      No participants found. Invite collaborators to join this workspace!
                    </div>
                  ) : (
                    membersList.map((member, mIdx) => {
                      const memberId = member.id || member._id || `mem-${mIdx}`;
                      const memberRole = (member.role || 'viewer').toLowerCase();
                      const isOwnerMember = member.isOwner || memberRole === 'owner';
                      const roleConfig = ROLE_CONFIG[memberRole] || ROLE_CONFIG.viewer;
                      const isMe = memberId === currentUserId || member.email === currentUser.email;
                      const currentRole = effectiveUserRole || workspaceRole;
                      const isUpdating = memberUpdatingId === memberId;

                      // Permission check: Can current user change this member's role?
                      const canChangeThisRole =
                        !isOwnerMember &&
                        ((currentRole === 'owner') || (currentRole === 'admin' && memberRole !== 'admin'));

                      // Permission check: Can current user remove this member?
                      const canRemoveThisMember =
                        !isOwnerMember &&
                        ((currentRole === 'owner') || (currentRole === 'admin' && memberRole !== 'admin'));

                      // Status dot styling
                      const isOnline = member.status === 'online' || isMe;
                      const isAway = member.status === 'away';
                      const statusDot = isOnline
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : isAway
                          ? 'bg-amber-400'
                          : 'bg-gray-500';

                      // Key capabilities indicators
                      const caps = member.capabilities || {
                        canEditFiles: ['owner', 'admin', 'editor'].includes(memberRole),
                        canExecuteCode: ['owner', 'admin', 'editor'].includes(memberRole),
                        canManageSettings: ['owner', 'admin'].includes(memberRole),
                        canAssignRoles: ['owner', 'admin'].includes(memberRole),
                        canClearHistory: ['owner', 'admin'].includes(memberRole),
                        canDeleteWorkspace: memberRole === 'owner'
                      };

                      return (
                        <div
                          key={memberId}
                          className="rounded-xl bg-[#131422] border border-white/12 shadow-sm p-4 sm:p-5 flex flex-col gap-3.5 transition-all hover:border-purple-500/40 hover:bg-[#161726]"
                        >
                          {/* TOP ROW: AVATAR, NAME, EMAIL, ROLE BADGE, ACTIONS */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="relative shrink-0">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleConfig.avatarGradient} text-white font-mono text-xs font-bold flex items-center justify-center shadow-md`}>
                                  {(member.name || 'M')[0].toUpperCase()}
                                </div>
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#131422] ${statusDot}`} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                                    {member.name}
                                  </span>
                                  {isMe && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40">
                                      You
                                    </span>
                                  )}
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${roleConfig.badgeBg}`}>
                                    {isOwnerMember ? <Crown size={11} /> : memberRole === 'admin' ? <Shield size={11} /> : memberRole === 'editor' ? <Edit3 size={11} /> : <Eye size={11} />}
                                    <span>{roleConfig.name}</span>
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
                                  {member.email}
                                </div>
                              </div>
                            </div>

                            {/* ROLE MANAGEMENT CONTROLS */}
                            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                              {isOwnerMember ? (
                                <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-200 border border-purple-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                                  <Crown size={13} className="text-purple-400" />
                                  <span>Owner (Protected)</span>
                                </span>
                              ) : canChangeThisRole ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={memberRole}
                                    onChange={(e) => handleChangeMemberRole(memberId, e.target.value)}
                                    disabled={isUpdating}
                                    className="bg-[#090A10] border border-white/20 hover:border-purple-400 rounded-xl text-white font-mono cursor-pointer focus:outline-none focus:border-purple-400 transition-all text-xs"
                                    style={{ height: '34px', padding: '0 10px' }}
                                    title={`Change ${member.name}'s role`}
                                  >
                                    {currentRole === 'owner' && (
                                      <option value="admin">Admin (L3)</option>
                                    )}
                                    <option value="editor">Editor (L2)</option>
                                    <option value="viewer">Viewer (L1)</option>
                                  </select>

                                  {isUpdating && (
                                    <Loader2 size={15} className="animate-spin text-purple-400" />
                                  )}

                                  {canRemoveThisMember && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMember(memberId)}
                                      className="rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center shadow-sm shrink-0"
                                      style={{ height: '34px', width: '34px' }}
                                      title={`Remove ${member.name} from workspace`}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              ) : currentRole === 'admin' && memberRole === 'admin' ? (
                                <span className="px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-200 border border-blue-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                                  <Shield size={13} className="text-blue-400" />
                                  <span>Admin (Protected)</span>
                                </span>
                              ) : (
                                <span className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border uppercase tracking-wider ${roleConfig.badgeBg}`}>
                                  {roleConfig.name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* GRANULAR CAPABILITY CHIPS */}
                          <div className="pt-2 border-t border-white/5 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mr-1">
                              Capabilities:
                            </span>

                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${caps.canEditFiles ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-white/[0.03] text-gray-500 border-white/5 line-through opacity-60'}`}>
                              {caps.canEditFiles ? <CheckCircle2 size={11} className="text-emerald-400" /> : <XCircle size={11} className="text-gray-500" />}
                              <span>Edit Files</span>
                            </span>

                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${caps.canExecuteCode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-white/[0.03] text-gray-500 border-white/5 line-through opacity-60'}`}>
                              {caps.canExecuteCode ? <CheckCircle2 size={11} className="text-emerald-400" /> : <XCircle size={11} className="text-gray-500" />}
                              <span>Run Sandbox Code</span>
                            </span>

                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${caps.canManageSettings ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-white/[0.03] text-gray-500 border-white/5 line-through opacity-60'}`}>
                              {caps.canManageSettings ? <CheckCircle2 size={11} className="text-blue-400" /> : <XCircle size={11} className="text-gray-500" />}
                              <span>Manage Settings</span>
                            </span>

                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${caps.canAssignRoles ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-white/[0.03] text-gray-500 border-white/5 line-through opacity-60'}`}>
                              {caps.canAssignRoles ? <CheckCircle2 size={11} className="text-purple-400" /> : <XCircle size={11} className="text-gray-500" />}
                              <span>Assign Roles</span>
                            </span>

                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${caps.canClearHistory ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : 'bg-white/[0.03] text-gray-500 border-white/5 line-through opacity-60'}`}>
                              {caps.canClearHistory ? <CheckCircle2 size={11} className="text-cyan-400" /> : <XCircle size={11} className="text-gray-500" />}
                              <span>Clear Logs</span>
                            </span>

                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${caps.canDeleteWorkspace ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-white/[0.03] text-gray-500 border-white/5 line-through opacity-60'}`}>
                              {caps.canDeleteWorkspace ? <CheckCircle2 size={11} className="text-rose-400" /> : <XCircle size={11} className="text-gray-500" />}
                              <span>Delete Workspace</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* ROLE-BASED ACCESS CONTROL (RBAC) REFERENCE GUIDE */}
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div className="flex items-center gap-2">
                    <Info size={16} className="text-purple-400" />
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Role-Based Access Control (RBAC) Reference Guide
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {Object.values(ROLE_CONFIG).map((rc) => (
                      <div
                        key={rc.id}
                        className="rounded-xl bg-[#11121F] border border-white/10 p-4 flex flex-col justify-between space-y-3 shadow-sm hover:border-purple-500/30 transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${rc.badgeBg}`}>
                              {rc.id === 'owner' ? <Crown size={11} /> : rc.id === 'admin' ? <Shield size={11} /> : rc.id === 'editor' ? <Edit3 size={11} /> : <Eye size={11} />}
                              <span>{rc.name}</span>
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 font-bold">
                              Level {rc.level}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 leading-relaxed">
                            {rc.description}
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                          {rc.keyCapabilities.map((kc, kidx) => (
                            <div key={kidx} className="flex items-center gap-1.5 text-[10px] font-mono">
                              {kc.allowed ? (
                                <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle size={11} className="text-rose-400/70 shrink-0" />
                              )}
                              <span className={kc.allowed ? 'text-gray-300' : 'text-gray-500 line-through'}>
                                {kc.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
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
                className={`rounded-full text-xs font-mono font-medium flex items-center justify-center gap-2 animate-fadeIn shadow-md ${
                  isSaveError 
                    ? 'bg-rose-500/25 text-rose-200 border border-rose-400/50' 
                    : 'bg-purple-500/25 text-purple-100 border border-purple-400/50'
                }`}
                style={{ padding: '5px 16px', minHeight: '32px', lineHeight: '1' }}
              >
                {isSaveError ? (
                  <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                ) : (
                  <Sparkles size={14} className="text-purple-300 shrink-0" />
                )}
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
