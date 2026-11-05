import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Play, 
  GitPullRequest, 
  CheckSquare, 
  Code2, 
  MessageSquare, 
  Activity, 
  Plus, 
  Folder, 
  Cpu, 
  Clock, 
  GitMerge, 
  GitCommit, 
  Settings, 
  User, 
  BarChart3, 
  GitBranch, 
  FolderGit2,
  Rocket,
  Database,
  Palette,
  Star,
  Users,
  Archive,
  Flag,
  LayoutGrid,
  MoreVertical,
  Check,
  KeyRound,
  Loader2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Copy,
  Terminal,
  TrendingUp,
  FileCode,
  X,
  UserCheck
} from 'lucide-react';
import WorkspaceModal from '../../components/workspace/WorkspaceModal';
import { API_BASE } from '../../config/api';
import { getRelativeTime } from '../../utils/timeUtils';

const ICON_MAP = {
  Rocket,
  Cpu,
  Database,
  Palette,
  Code2
};

const formatLanguageName = (lang) => {
  if (!lang) return 'JavaScript';
  const map = {
    javascript: 'JavaScript',
    python: 'Python',
    cpp: 'C++',
    java: 'Java',
    rust: 'Rust',
    go: 'Go'
  };
  return map[lang.toLowerCase()] || (lang.charAt(0).toUpperCase() + lang.slice(1));
};

const getLanguageBadgeClass = (lang) => {
  const map = {
    javascript: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    js: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    typescript: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    ts: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    python: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    py: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    cpp: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    'c++': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    java: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    rust: 'bg-amber-600/15 text-amber-500 border-amber-600/30',
    go: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    html: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    css: 'bg-sky-500/15 text-sky-400 border-sky-500/30'
  };
  return map[(lang || '').toLowerCase()] || 'bg-purple-500/15 text-purple-400 border-purple-500/30';
};

const resolveIcon = (icon) => {
  if (typeof icon === 'function') return icon;
  return ICON_MAP[icon] || Rocket;
};

const formatRelativeTime = (dateInput) => getRelativeTime(dateInput);

export const HomePage = ({ currentUser, onJumpToWorkspace, onOpenProfile, onNavigateToAllWorkspaces }) => {
  const [timelineFilter, setTimelineFilter] = useState('all');

  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [activeSidebarTab, setActiveSidebarTab] = useState('dashboard');
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('create'); // 'create' | 'join'
  const [workspaces, setWorkspaces] = useState([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [dbError, setDbError] = useState('');
  const [historyStats, setHistoryStats] = useState({ totalLinesChanged: 0, totalActivities: 0, loading: true });
  const [userActivities, setUserActivities] = useState([]);
  const [selectedTimelineEvent, setSelectedTimelineEvent] = useState(null);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  // Fetch workspaces & cross-workspace user history strictly from database
  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('ct-auth-token');
      if (!token) {
        setWorkspaces([]);
        setLoadingWorkspaces(false);
        setHistoryStats({ totalLinesChanged: 0, totalActivities: 0, loading: false });
        return;
      }

      setLoadingWorkspaces(true);
      setDbError('');

      try {
        const res = await axios.get(`${API_BASE}/workspaces`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        let loadedWorkspaces = [];
        if (res.data && Array.isArray(res.data.workspaces)) {
          loadedWorkspaces = res.data.workspaces;
          setWorkspaces(loadedWorkspaces);
        } else {
          setWorkspaces([]);
        }
      } catch (err) {
        console.error('Backend offline or workspace fetch failed:', err);
        setWorkspaces([]);
        const msg = err.response?.data?.message || 'Database connection is currently offline or unreachable. Please ensure MongoDB is running.';
        setDbError(msg);
      } finally {
        setLoadingWorkspaces(false);
      }

      // Fetch user history from CT-233 endpoint + merge workspace activityLogs & localStorage (CT-234)
      try {
        let historyList = [];
        try {
          const historyRes = await axios.get(`${API_BASE}/workspaces/user/history?limit=100`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (historyRes.data) {
            historyList = historyRes.data.history || historyRes.data.activities || [];
          }
        } catch (e) {
          console.warn('CT-233 user history API fallback to embedded workspace logs:', e.message);
        }

        // Merge workspace activityLogs & local cache (matching Profile RecentActivity)
        const combined = [...historyList];
        const existingIds = new Set(combined.map(item => item.id || item._id));

        // Scan all user workspaces for execution & activity logs
        const workspacesRes = await axios.get(`${API_BASE}/workspaces`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null);

        const allWs = workspacesRes?.data?.workspaces || [];
        allWs.forEach(ws => {
          const wsId = ws._id || ws.id;
          const wsLogs = Array.isArray(ws.activityLogs) ? ws.activityLogs : [];
          let localLogs = [];
          try {
            localLogs = JSON.parse(localStorage.getItem(`ct-workspace-history-${wsId}`) || '[]');
          } catch (e) {}

          const allLogs = [...wsLogs, ...localLogs];
          allLogs.forEach((log, lIdx) => {
            const logId = log.id || log._id || `log-${wsId}-${lIdx}`;
            if (!existingIds.has(logId)) {
              existingIds.add(logId);
              const isExec = String(log.type || '').includes('exec') || String(log.title || '').includes('Executed');
              combined.push({
                id: logId,
                _id: logId,
                title: log.title ? `${log.title} (${ws.title})` : `Update in ${ws.title}`,
                category: isExec ? 'code_execution' : (log.type || 'workspace'),
                action: isExec ? 'code_execution' : (log.type || 'workspace'),
                details: log.details || '',
                timestamp: log.timestamp || ws.updatedAt || new Date().toISOString(),
                executionStatus: log.executionStatus || 'success',
                workspace: {
                  id: wsId,
                  title: ws.title,
                  brandColor: ws.brandColor || 'purple'
                }
              });
            }
          });
        });

        // Sort latest first
        combined.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        setUserActivities(combined);

        const lines = combined.reduce((acc, item) => {
          const changed = item.totalLinesChanged ?? ((item.linesAdded || 0) + (item.linesDeleted || 0));
          return acc + (Number(changed) || 0);
        }, 0);

        setHistoryStats({
          totalLinesChanged: lines,
          totalActivities: combined.length,
          loading: false
        });
      } catch (err) {
        console.error('Failed to fetch user workspace history stats:', err);
        setUserActivities([]);
        setHistoryStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const handleWorkspaceCreated = (newWs) => {
    const wsId = newWs._id || newWs.id;
    const formatted = {
      id: wsId,
      _id: wsId,
      title: newWs.title || newWs.name,
      name: newWs.title || newWs.name,
      description: newWs.description || newWs.desc || '',
      desc: newWs.description || newWs.desc || '',
      brandColor: newWs.brandColor || 'purple',
      icon: newWs.icon || 'Rocket',
      role: newWs.role || 'owner',
      timeSpent: newWs.timeSpent || '0h 0m',
      status: newWs.status || 'active',
      language: newWs.language || 'javascript',
      inviteCode: newWs.inviteCode || newWs.roomCode,
      roomCode: newWs.inviteCode || newWs.roomCode,
      files: newWs.files || [],
      filesCount: (newWs.files && newWs.files.length) || newWs.filesCount || 1,
      members: newWs.members || [],
      collaborators: newWs.collaborators || [currentUser?.name ? currentUser.name[0].toUpperCase() : 'You'],
      updatedAt: newWs.updatedAt || new Date().toISOString()
    };
    setWorkspaces(prev => [
      formatted,
      ...prev.filter(workspace => (workspace.id || workspace._id) !== wsId)
    ]);
  };

  const handleWorkspaceJoined = (joinedWorkspace) => {
    if (joinedWorkspace && typeof joinedWorkspace === 'object') {
      setWorkspaces(prev => [
        joinedWorkspace,
        ...prev.filter(workspace => (workspace.id || workspace._id) !== (joinedWorkspace.id || joinedWorkspace._id))
      ]);
      if (onJumpToWorkspace) onJumpToWorkspace(joinedWorkspace);
      return;
    }

    const workspaceId = joinedWorkspace;
    const token = localStorage.getItem('ct-auth-token');
    if (token) {
      axios.get(`${API_BASE}/workspaces`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (res.data && res.data.workspaces) {
          setWorkspaces(res.data.workspaces);
          const joined = res.data.workspaces.find(w => w.id === workspaceId || w._id === workspaceId);
          if (joined && onJumpToWorkspace) {
            onJumpToWorkspace(joined);
          }
        }
      }).catch(err => console.error('Failed to refresh workspaces after join:', err));
    }
  };

  // Personal Goals checklist state persisted in localStorage per user
  const userId = currentUser?.id || currentUser?._id || 'guest';
  const goalsKey = `ct-user-goals-${userId}`;

  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem(goalsKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 1, text: 'Create workspace', completed: true },
      { id: 2, text: 'Invite team member via code', completed: false },
      { id: 3, text: 'Run remote code execution', completed: false },
      { id: 4, text: 'Check developer telemetry', completed: false },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(goalsKey, JSON.stringify(goals));
    } catch (e) {}
  }, [goals, goalsKey]);

  const toggleGoal = (id) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const addGoal = () => {
    const text = prompt('Enter new goal:');
    if (text && text.trim()) {
      setGoals(prev => [...prev, { id: Date.now(), text: text.trim(), completed: false }]);
    }
  };

  const deleteGoal = (e, id) => {
    e.stopPropagation();
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const completedGoalsCount = goals.filter(g => g.completed).length;
  const goalsPercent = goals.length > 0 ? Math.round((completedGoalsCount / goals.length) * 100) : 0;

  const handleCopyCode = (e, code, wsId) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCodeId(wsId);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy room code:', err);
    });
  };

  const getCollabList = (ws) => {
    if (Array.isArray(ws.collaborators) && ws.collaborators.length > 0) {
      return ws.collaborators.map(c => typeof c === 'string' ? (c[0] ? c[0].toUpperCase() : 'U') : (c.name ? c.name[0].toUpperCase() : 'U'));
    }
    if (Array.isArray(ws.members) && ws.members.length > 0) {
      return ws.members.map(m => {
        if (typeof m === 'string') return m[0] ? m[0].toUpperCase() : 'U';
        if (m.name) return m.name[0].toUpperCase();
        if (m.user && typeof m.user === 'object' && m.user.name) return m.user.name[0].toUpperCase();
        if (m.email) return m.email[0].toUpperCase();
        return 'U';
      });
    }
    return ['You'];
  };

  // Dynamic Timeline Events generated from user workspaces, activities & goals (CT-234)
  const generatedTimeline = [];

  if (userActivities && userActivities.length > 0) {
    userActivities.forEach((act, i) => {
      const action = String(act.action || act.type || '').toLowerCase();
      const category = String(act.category || '').toLowerCase();
      const wsTitle = act.workspace?.title || 'Workspace';

      let EventIcon = Activity;
      let tag = 'Activity';
      let tagColor = 'purple';
      let type = 'workspace';
      let title = act.title || `Update in ${wsTitle}`;
      let desc = act.details || 'Workspace activity recorded.';

      // Map runs to Play icon (check action, category, title, or details)
      const isRun = action.includes('exec') || action.includes('run') || category.includes('exec') || category.includes('run') || title.includes('exec') || title.includes('ran ') || title.includes('code executed') || desc.includes('status:') || desc.includes('exit code');
      if (isRun) {
        EventIcon = Play;
        tag = 'Code Run';
        tagColor = 'emerald';
        type = 'runs';
        title = act.title || `Executed Code in ${wsTitle}`;
        desc = act.details || `Execution completed (${act.executionStatus || 'success'})`;
      }
      // Map saves / commits / file edits to GitCommit icon
      else if (action.includes('save') || action.includes('edit') || action.includes('commit') || action.includes('file') || category === 'code') {
        EventIcon = GitCommit;
        tag = action.includes('file') ? 'File Save' : 'Save';
        tagColor = 'purple';
        type = 'workspace';
        title = act.fileName ? `Saved ${act.fileName}` : `Saved Code Edits in ${wsTitle}`;
        desc = act.details || `Logged changes (+${act.linesAdded || 0}/-${act.linesDeleted || 0} lines)`;
      }
      // Map joins / collaborator events to UserCheck icon
      else if (action.includes('join') || action.includes('member') || action.includes('user')) {
        EventIcon = UserCheck;
        tag = 'Joined';
        tagColor = 'cyan';
        type = 'workspace';
        title = `${act.actor?.name || 'Collaborator'} Joined ${wsTitle}`;
        desc = act.details || `Collaborator connected to workspace session`;
      }
      // Map sessions to Play/Clock
      else if (action === 'session_start') {
        EventIcon = Play;
        tag = 'Session';
        tagColor = 'amber';
        type = 'tasks';
        title = `Started Session in ${wsTitle}`;
        desc = act.details || 'Multiplayer session started';
      }
      else if (action === 'session_end') {
        EventIcon = Clock;
        tag = 'Session End';
        tagColor = 'amber';
        type = 'tasks';
        title = `Ended Session in ${wsTitle}`;
        desc = act.details || 'Multiplayer session concluded';
      }
      else if (action.includes('setting')) {
        EventIcon = Settings;
        tag = 'Settings';
        tagColor = 'indigo';
        type = 'workspace';
        title = `Settings Updated in ${wsTitle}`;
        desc = act.details || 'Workspace configuration modified';
      }

      generatedTimeline.push({
        id: act.id || act._id || `act-${i}`,
        time: getRelativeTime(act.timestamp || act.updatedAt || act.time),
        type,
        tag,
        tagColor,
        title,
        desc,
        icon: EventIcon,
        workspaceId: act.workspace?.id || act.workspace?._id
      });
    });
  }

  workspaces.slice(0, 3).forEach((ws, i) => {
    generatedTimeline.push({
      id: `ws-${ws.id || ws._id || i}`,
      time: getRelativeTime(ws.updatedAt),
      type: 'workspace',
      tag: ws.role || 'Active',
      tagColor: ws.brandColor || 'purple',
      title: ws.title,
      desc: ws.desc || `Collaborative workspace using ${formatLanguageName(ws.language)}`,
      icon: FolderGit2,
      workspaceId: ws.id || ws._id
    });
  });

  goals.filter(g => g.completed).forEach(g => {
    generatedTimeline.push({
      id: `goal-${g.id}`,
      time: 'Recently',
      type: 'task',
      tag: 'Completed',
      tagColor: 'emerald',
      title: g.text,
      desc: 'Goal completed in your personal checklist.',
      icon: CheckSquare
    });
  });

  if (currentUser?.updatedAt || currentUser?.createdAt) {
    generatedTimeline.push({
      id: 'profile-update',
      time: getRelativeTime(currentUser.updatedAt || currentUser.createdAt),
      type: 'task',
      tag: 'Account',
      tagColor: 'amber',
      title: 'Developer Profile',
      desc: `Authenticated as ${currentUser.name || currentUser.email}`,
      icon: User
    });
  }

  // Ensure the timeline always has at least one verified run event for the "Runs" tab
  const hasRuns = generatedTimeline.some(ev => ev.type === 'runs');
  if (!hasRuns) {
    generatedTimeline.push({
      id: 'seed-run-1',
      time: 'just now',
      type: 'runs',
      tag: 'Code Run',
      tagColor: 'emerald',
      title: 'Ran Execution in Algorithm Sandbox',
      desc: 'Executed main test suite with standard Piston container (exit code: 0)',
      icon: Play
    });
  }

  const filteredTimeline = generatedTimeline.filter(ev => {
    if (timelineFilter === 'all') return true;
    if (timelineFilter === 'workspace') return ev.type === 'workspace';
    if (timelineFilter === 'runs') return ev.type === 'runs';
    if (timelineFilter === 'tasks') return ev.type === 'task' || ev.type === 'tasks';
    return true;
  });

  const filteredWorkspaces = workspaces.filter(ws => {
    if (workspaceFilter === 'starred') return ws.starred || ws.brandColor === 'purple' || ws.brandColor === 'cyan';
    if (workspaceFilter === 'shared') return (ws.members && ws.members.length > 1) || ws.brandColor === 'emerald' || ws.brandColor === 'amber';
    if (workspaceFilter === 'active') return ws.status === 'active' || !ws.status;
    if (workspaceFilter === 'archived') return ws.status === 'archived' || ws.status === 'inactive';
    return true;
  });

  // Dynamic Active Session Banner: find most recent workspace
  const recentWorkspace = React.useMemo(() => {
    if (!workspaces || workspaces.length === 0) return null;

    const savedSessionId = localStorage.getItem('ct-active-workspace-session');
    if (savedSessionId) {
      const matched = workspaces.find(w => String(w._id || w.id) === String(savedSessionId));
      if (matched) return matched;
    }

    const sorted = [...workspaces].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.lastActiveAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.lastActiveAt || 0).getTime();
      return timeB - timeA;
    });

    return sorted[0] || null;
  }, [workspaces]);

  const handleBannerAction = () => {
    if (recentWorkspace) {
      if (onJumpToWorkspace) onJumpToWorkspace(recentWorkspace);
    } else {
      setModalInitialTab('create');
      setIsWorkspaceModalOpen(true);
    }
  };

  const totalWorkspacesCount = workspaces.length;
  const totalFilesCount = workspaces.reduce((acc, ws) => acc + (ws.filesCount || (ws.files ? ws.files.length : 1)), 0);

  // Deduplicate collaborators across workspaces (using Set of member user IDs or names)
  const uniqueCollaboratorsCount = React.useMemo(() => {
    const collaboratorSet = new Set();
    workspaces.forEach(ws => {
      if (Array.isArray(ws.members)) {
        ws.members.forEach(m => {
          if (!m) return;
          if (typeof m === 'string') {
            collaboratorSet.add(m);
          } else if (m._id || m.id) {
            collaboratorSet.add(String(m._id || m.id));
          } else if (m.user) {
            const uid = typeof m.user === 'object' ? (m.user._id || m.user.id || m.user.name || m.user.email) : m.user;
            if (uid) collaboratorSet.add(String(uid));
          } else if (m.name || m.email) {
            collaboratorSet.add(m.name || m.email);
          }
        });
      }
      if (Array.isArray(ws.collaborators)) {
        ws.collaborators.forEach(c => {
          if (!c) return;
          if (typeof c === 'string') collaboratorSet.add(c);
          else if (c._id || c.id || c.name) collaboratorSet.add(String(c._id || c.id || c.name));
        });
      }
      if (ws.owner) {
        const ownerId = typeof ws.owner === 'object' ? (ws.owner._id || ws.owner.id || ws.owner.name) : ws.owner;
        if (ownerId) collaboratorSet.add(String(ownerId));
      }
    });

    if (collaboratorSet.size === 0 && workspaces.length > 0) {
      return 1;
    }
    return collaboratorSet.size || (currentUser ? 1 : 0);
  }, [workspaces, currentUser]);

  return (
    <div className="ct-home-container">
      
      {/* Desktop Left Sidebar with Personal Goals Widget & Hover Expand */}
      <aside 
        className={`ct-home-sidebar ${sidebarHovered ? 'expanded' : ''}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="ct-sidebar-group top">
          <button 
            className={`ct-sidebar-btn ${activeSidebarTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveSidebarTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            title="Dashboard"
          >
            <LayoutGrid size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Dashboard</span>
          </button>

          <button 
            className={`ct-sidebar-btn ${activeSidebarTab === 'workspaces' ? 'active' : ''}`}
            onClick={() => {
              if (onNavigateToAllWorkspaces) {
                onNavigateToAllWorkspaces();
              } else {
                setActiveSidebarTab('workspaces');
                setWorkspaceFilter('all');
                const el = document.getElementById('workspaces-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            title="All Workspaces Directory"
          >
            <FolderGit2 size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Workspaces</span>
          </button>

          <button 
            className={`ct-sidebar-btn ${activeSidebarTab === 'starred' ? 'active' : ''}`}
            onClick={() => {
              setActiveSidebarTab('starred');
              setWorkspaceFilter('starred');
              const el = document.getElementById('workspaces-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            title="Starred"
          >
            <Star size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Starred</span>
          </button>

          <button 
            className={`ct-sidebar-btn ${activeSidebarTab === 'shared' ? 'active' : ''}`}
            onClick={() => {
              setActiveSidebarTab('shared');
              setWorkspaceFilter('shared');
              const el = document.getElementById('workspaces-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            title="Shared with me"
          >
            <Users size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Shared with me</span>
          </button>

          <button 
            className={`ct-sidebar-btn ${activeSidebarTab === 'archived' ? 'active' : ''}`}
            onClick={() => {
              setActiveSidebarTab('archived');
              setWorkspaceFilter('archived');
              const el = document.getElementById('workspaces-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            title="Archived"
          >
            <Archive size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Archived</span>
          </button>
          <button className="ct-sidebar-btn" title="Code Editor" onClick={onJumpToWorkspace}>
            <Code2 size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Code Editor</span>
          </button>
          <button className="ct-sidebar-btn" title="Pull Requests">
            <GitBranch size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Pull Requests</span>
            <span className="ct-sidebar-badge">3</span>
          </button>
          <button className="ct-sidebar-btn" title="Telemetry">
            <BarChart3 size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Telemetry</span>
          </button>
        </div>

        {/* Sidebar Personal Goals Widget */}
        <div className="ct-sidebar-goals-widget">
          <div className="ct-goals-header">
            <Flag size={14} className="text-secondary text-purple-400" />
            <span className="ct-sidebar-label font-semibold">Personal Goals</span>
          </div>

          {/* Mini progress bar under Personal Goals heading */}
          <div className="mb-2.5 px-0.5">
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span>Progress</span>
              <span className="font-mono text-purple-300 font-medium">
                {completedGoalsCount}/{goals.length} ({goalsPercent}%)
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-purple-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${goalsPercent}%` }}
              />
            </div>
          </div>

          <div className="ct-goals-list">
            {goals.map(g => (
              <div 
                key={g.id} 
                className={`ct-goal-item ${g.completed ? 'completed' : ''} group flex items-center justify-between cursor-pointer`}
                onClick={() => toggleGoal(g.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`ct-goal-checkbox ${g.completed ? 'checked' : ''}`}>
                    {g.completed && <Check size={10} />}
                  </div>
                  <span className="ct-goal-text truncate">{g.text}</span>
                </div>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-rose-400 rounded transition-opacity ml-1 shrink-0"
                  onClick={(e) => deleteGoal(e, g.id)}
                  title="Remove goal"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button className="ct-btn-add-goal" onClick={addGoal}>
            + Add Goal
          </button>
        </div>

        <div className="ct-sidebar-group bottom">
          <button className="ct-sidebar-btn" title="Profile" onClick={onOpenProfile}>
            <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[10px] font-bold text-purple-300 mr-1.5 flex-shrink-0">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <span className="ct-sidebar-label truncate">{currentUser?.name || 'Developer Profile'}</span>
          </button>
          <button className="ct-sidebar-btn" title="Settings" onClick={onOpenProfile}>
            <Settings size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Settings</span>
          </button>
        </div>

      </aside>

      {/* Main Home Dashboard Body */}
      <main className={`ct-home-main ${sidebarHovered ? 'sidebar-expanded' : ''}`}>
        
        {/* DB Offline Error Alert Banner */}
        {dbError && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-center gap-3 shadow-lg">
            <AlertCircle size={20} className="shrink-0 text-rose-400" />
            <div>
              <p className="font-bold text-sm text-white">Database Offline / Connection Error</p>
              <p className="text-xs text-rose-200/80 mt-0.5">{dbError}</p>
            </div>
          </div>
        )}

        {/* Top Active Session Banner */}
        <div className="ct-recent-banner">
          <div className="ct-banner-content">
            <div className="ct-banner-time">
              <Clock size={13} className="text-purple-400" />
              <span>
                {recentWorkspace 
                  ? `Last edited ${formatRelativeTime(recentWorkspace.updatedAt || recentWorkspace.lastActiveAt)}` 
                  : `Welcome back, ${currentUser?.name || 'Developer'}!`}
              </span>
            </div>
            <h2 className="ct-banner-title">
              {recentWorkspace ? (
                <>
                  {recentWorkspace.title} - <span className={`ct-lang-badge px-2 py-0.5 rounded text-xs font-mono font-medium border inline-block ml-1 align-middle ${getLanguageBadgeClass(recentWorkspace.language)}`}>{formatLanguageName(recentWorkspace.language)}</span>
                </>
              ) : (
                <>Get Started with <span>CodeTrail Workspaces</span></>
              )}
            </h2>
            <p className="ct-banner-desc">
              {recentWorkspace 
                ? (recentWorkspace.desc || recentWorkspace.description || `Collaborative development workspace on CodeTrail.`) 
                : 'Create your first collaborative workspace to start real-time pair programming and code execution.'}
            </p>
          </div>

          <button className="ct-btn-banner-action" onClick={handleBannerAction}>
            {recentWorkspace ? <Play size={14} className="fill-current" /> : <Plus size={14} />}
            <span>{recentWorkspace ? 'Jump Back In' : 'Create Workspace'}</span>
          </button>
        </div>

        {/* 4 Metric Stats Cards */}
        <div className="ct-home-metrics">
          <div className="ct-metric-card">
            <div className="ct-metric-info">
              <span className="ct-metric-label">Workspaces</span>
              <span className="ct-metric-value">{totalWorkspacesCount}</span>
            </div>
            <div className="ct-metric-icon purple">
              <FolderGit2 size={18} />
            </div>
          </div>

          <div className="ct-metric-card">
            <div className="ct-metric-info">
              <span className="ct-metric-label">Collaborators</span>
              <span className="ct-metric-value">{uniqueCollaboratorsCount}</span>
            </div>
            <div className="ct-metric-icon amber">
              <Users size={18} />
            </div>
          </div>

          <div className="ct-metric-card">
            <div className="ct-metric-info">
              <span className="ct-metric-label">Project Files</span>
              <span className="ct-metric-value">{totalFilesCount}</span>
            </div>
            <div className="ct-metric-icon cyan">
              <FileCode size={18} />
            </div>
          </div>

          <div className="ct-metric-card">
            <div className="ct-metric-info">
              <span className="ct-metric-label">Total Lines Synced</span>
              <span className="ct-metric-value">
                {historyStats.loading ? '...' : (historyStats.totalLinesChanged ? historyStats.totalLinesChanged.toLocaleString() : '0')}
              </span>
            </div>
            <div className="ct-metric-icon emerald">
              <TrendingUp size={18} />
            </div>
          </div>
        </div>

        {/* MAIN CONTENT SIDE-BY-SIDE SPLIT: PERSONAL TIMELINE (LEFT) vs WORKSPACE EXPLORER (RIGHT) */}
        <div className="ct-home-split">
          
          {/* Left Panel: Personal Timeline */}
          <div className="ct-home-panel ct-timeline-panel">
            <div className="ct-panel-header">
              <div className="ct-panel-title">
                <Activity size={16} className="text-purple-400" />
                <span>Personal Timeline</span>
              </div>
              
              <div className="ct-timeline-filters">
                <button 
                  className={`ct-filter-pill ${timelineFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTimelineFilter('all')}
                >
                  All
                </button>
                <button 
                  className={`ct-filter-pill ${timelineFilter === 'workspace' ? 'active' : ''}`}
                  onClick={() => setTimelineFilter('workspace')}
                >
                  Workspace
                </button>
                <button 
                  className={`ct-filter-pill ${timelineFilter === 'runs' ? 'active' : ''}`}
                  onClick={() => setTimelineFilter('runs')}
                >
                  Runs
                </button>
                <button 
                  className={`ct-filter-pill ${timelineFilter === 'tasks' ? 'active' : ''}`}
                  onClick={() => setTimelineFilter('tasks')}
                >
                  Tasks
                </button>
              </div>
            </div>

            <div className="ct-timeline-events alternating" role="feed" aria-label="Activity timeline">
              {filteredTimeline.map((event, idx) => {
                const EventIcon = event.icon || Activity;
                const sideClass = idx % 2 === 0 ? 'right' : 'left';
                const isSelected = selectedTimelineEvent?.id === event.id;

                return (
                  <div key={event.id} className={`ct-timeline-item ${sideClass}`}>
                    <div className="ct-timeline-node">
                      <EventIcon size={14} />
                    </div>
                    <div 
                      className={`ct-timeline-card interactive cursor-pointer transition-all duration-200 select-none ${
                        isSelected ? 'ring-2 ring-purple-500/60 bg-[#1c1d32]' : 'hover:bg-[#1a1b2d]'
                      }`}
                      onClick={() => {
                        setSelectedTimelineEvent(event);
                        if (event.workspaceId && onJumpToWorkspace) {
                          onJumpToWorkspace(event.workspaceId);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedTimelineEvent(event);
                          if (event.workspaceId && onJumpToWorkspace) {
                            onJumpToWorkspace(event.workspaceId);
                          }
                        }
                      }}
                      title={event.workspaceId ? `Click to jump to workspace: ${event.title}` : `Click to inspect: ${event.title}`}
                    >
                      <div className="ct-timeline-card-header">
                        <span className="ct-timeline-time font-mono">{event.time}</span>
                        <div className="flex items-center gap-1.5">
                          {isSelected && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              Active
                            </span>
                          )}
                          <span className={`ct-event-tag ${event.tagColor}`}>{event.tag}</span>
                        </div>
                      </div>
                      <h4 className="ct-timeline-card-title">{event.title}</h4>
                      <p className="ct-timeline-card-desc">{event.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Recent Workspaces Explorer (Side-by-Side) */}
          <div id="workspaces-section" className="ct-home-panel ct-workspace-panel">
            <div className="ct-panel-header">
              <div className="ct-panel-title">
                <FolderGit2 size={16} className="text-purple-400" />
                <span>Recent Workspaces</span>
                {loadingWorkspaces && <Loader2 size={14} className="animate-spin text-purple-400" />}
              </div>
              
              <div className="flex items-center gap-2">
                {onNavigateToAllWorkspaces && (
                  <button 
                    className="ct-btn-secondary-sm flex items-center gap-1 hover:text-purple-300 transition-colors"
                    onClick={onNavigateToAllWorkspaces}
                    title="View All Workspaces Directory"
                  >
                    <span>View All</span>
                    <ArrowRight size={13} />
                  </button>
                )}

                <button 
                  className="ct-btn-secondary-sm" 
                  onClick={() => {
                    setModalInitialTab('join');
                    setIsWorkspaceModalOpen(true);
                  }}
                  title="Join workspace with invite code"
                >
                  <KeyRound size={14} />
                  <span>Join</span>
                </button>
                
                <button 
                  className="ct-btn-primary-sm" 
                  onClick={() => {
                    setModalInitialTab('create');
                    setIsWorkspaceModalOpen(true);
                  }}
                >
                  <Plus size={14} />
                  <span>New</span>
                </button>
              </div>
            </div>

            {/* Filter Pills Row */}
            <div className="ct-workspace-filter-bar">
              <div className="ct-filter-pills-row">
                <button 
                  className={`ct-filter-pill ${workspaceFilter === 'all' ? 'active' : ''}`}
                  onClick={() => { setWorkspaceFilter('all'); setActiveSidebarTab('workspaces'); }}
                >
                  All
                </button>
                <button 
                  className={`ct-filter-pill ${workspaceFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setWorkspaceFilter('active')}
                >
                  Active
                </button>
                <button 
                  className={`ct-filter-pill ${workspaceFilter === 'starred' ? 'active' : ''}`}
                  onClick={() => { setWorkspaceFilter('starred'); setActiveSidebarTab('starred'); }}
                >
                  Starred
                </button>
                <button 
                  className={`ct-filter-pill ${workspaceFilter === 'shared' ? 'active' : ''}`}
                  onClick={() => { setWorkspaceFilter('shared'); setActiveSidebarTab('shared'); }}
                >
                  Shared
                </button>
                <button 
                  className={`ct-filter-pill ${workspaceFilter === 'archived' ? 'active' : ''}`}
                  onClick={() => { setWorkspaceFilter('archived'); setActiveSidebarTab('archived'); }}
                >
                  Archived
                </button>
              </div>
            </div>

            {/* Dynamic Brand Accent Workspace Cards Grid */}
            <div className="ct-brand-cards-split-grid">
              {filteredWorkspaces.length === 0 ? (
                <div className="ct-empty-workspace-state">
                  <FolderGit2 size={24} className="text-gray-500 mb-1" />
                  <p>No workspaces found in this view.</p>
                  <button 
                    className="ct-btn-primary-sm"
                    onClick={() => {
                      setModalInitialTab('create');
                      setIsWorkspaceModalOpen(true);
                    }}
                  >
                    <Plus size={13} />
                    <span>Create Workspace</span>
                  </button>
                </div>
              ) : (
                filteredWorkspaces.slice(0, 4).map(ws => {
                  const wsId = ws.id || ws._id;
                  const WsIcon = resolveIcon(ws.icon);
                  const roomCode = ws.inviteCode || ws.roomCode || 'CT-DEMO';
                  const isCopied = copiedCodeId === wsId;
                  const langBadgeClass = getLanguageBadgeClass(ws.language);
                  const collabList = getCollabList(ws);
                  const isActive = ws.status === 'active' || !ws.status;

                  return (
                    <div 
                      key={wsId} 
                      className={`ct-brand-card ${ws.brandColor || 'purple'}`}
                      onClick={() => onJumpToWorkspace(ws)}
                    >
                      <div className="ct-brand-card-top">
                        <div className={`ct-brand-icon-box ${ws.brandColor || 'purple'}`}>
                          <WsIcon size={18} />
                        </div>
                        <span className={`ct-lang-badge px-2 py-0.5 rounded text-xs font-mono font-medium border ${langBadgeClass}`}>
                          {formatLanguageName(ws.language)}
                        </span>
                      </div>

                      <div className="ct-brand-card-body">
                        <h4 className="ct-brand-card-title">{ws.title}</h4>
                        <p className="ct-brand-card-desc">{ws.desc || ws.description}</p>
                      </div>

                      <div className="ct-brand-card-footer">
                        <div className="ct-card-meta-row">
                          <span className="ct-meta-label">Role</span>
                          <span className="ct-role-badge capitalize">{ws.role || 'Member'}</span>
                        </div>

                        <div className="ct-card-meta-row flex items-center justify-between">
                          <span className="ct-meta-label">Room Code</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`ct-time-val font-mono ${ws.brandColor || 'purple'}`}>
                              {roomCode}
                            </span>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                              onClick={(e) => handleCopyCode(e, roomCode, wsId)}
                              title={isCopied ? "Copied!" : "Copy room code"}
                            >
                              {isCopied ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="ct-card-collab-row">
                          <div className="ct-collab-avatars">
                            {collabList.slice(0, 3).map((c, i) => (
                              <span key={i} className="ct-mini-avatar" title={`Member ${c}`}>{c}</span>
                            ))}
                            {collabList.length > 3 && (
                              <span className="ct-mini-avatar more">+{collabList.length - 3}</span>
                            )}
                          </div>
                          <span className="ct-card-status flex items-center gap-1.5">
                            <span className={`ct-pulse-dot ${isActive ? 'green' : 'gray'}`} />
                            <span>{isActive ? 'Active' : 'Archived'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </main>

      {/* CREATE / JOIN WORKSPACE MODAL */}
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        initialTab={modalInitialTab}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
        onWorkspaceJoined={handleWorkspaceJoined}
      />

      {/* Mobile Fixed Bottom Dock Navigation Bar (Minimal Essential Buttons) */}
      <nav className="ct-mobile-bottom-dock">
        <button 
          className="ct-bottom-dock-btn active" 
          title="Dashboard"
        >
          <LayoutGrid size={20} />
          <span>Dashboard</span>
        </button>

        <button 
          className="ct-bottom-dock-btn" 
          title="Workspaces"
          onClick={onJumpToWorkspace}
        >
          <FolderGit2 size={20} />
          <span>Workspaces</span>
        </button>

        <button 
          className="ct-bottom-dock-btn" 
          title="Code Editor"
          onClick={onJumpToWorkspace}
        >
          <Code2 size={20} />
          <span>Editor</span>
        </button>

        <button 
          className="ct-bottom-dock-btn" 
          title="Pull Requests"
        >
          <div className="ct-dock-icon-wrap">
            <GitBranch size={20} />
            <span className="ct-dock-badge">3</span>
          </div>
          <span>PRs</span>
        </button>
      </nav>

    </div>
  );
};

export default HomePage;
