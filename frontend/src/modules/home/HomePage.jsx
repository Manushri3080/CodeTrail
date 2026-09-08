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
  ArrowRight
} from 'lucide-react';
import WorkspaceModal from '../../components/workspace/WorkspaceModal';

const API_BASE = 'http://localhost:5000/api';

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

const resolveIcon = (icon) => {
  if (typeof icon === 'function') return icon;
  return ICON_MAP[icon] || Rocket;
};

const INITIAL_FALLBACK_WORKSPACES = [
  {
    id: 'ws-1',
    title: 'Project Alpha',
    desc: 'Next.js core application with React server components.',
    brandColor: 'purple',
    icon: 'Rocket',
    role: 'Lead',
    timeSpent: '14h 30m',
    status: 'active',
    collaborators: ['A', 'S', '+3']
  },
  {
    id: 'ws-2',
    title: 'Microservices Beta',
    desc: 'Go based gRPC services with Docker containerization.',
    brandColor: 'cyan',
    icon: 'Cpu',
    role: 'Collaborator',
    timeSpent: '8h 15m',
    status: 'active',
    collaborators: ['M', 'E']
  },
  {
    id: 'ws-3',
    title: 'Data Pipeline V2',
    desc: 'Apache Airflow DAGs for customer analytics processing.',
    brandColor: 'emerald',
    icon: 'Database',
    role: 'Maintainer',
    timeSpent: '2h 45m',
    status: 'archived',
    collaborators: ['A', '+1']
  },
  {
    id: 'ws-4',
    title: 'Component Lib',
    desc: 'Shared UI components for all internal dashboards.',
    brandColor: 'rose',
    icon: 'Palette',
    role: 'Contributor',
    timeSpent: '0h 0m',
    status: 'archived',
    collaborators: ['S']
  }
];

const formatRelativeTime = (dateInput) => {
  if (!dateInput) return 'Recently';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Recently';
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const HomePage = ({ currentUser, onJumpToWorkspace, onOpenProfile, onNavigateToAllWorkspaces }) => {
  const [timelineFilter, setTimelineFilter] = useState('all');

  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [activeSidebarTab, setActiveSidebarTab] = useState('dashboard');
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('create'); // 'create' | 'join'
  const [workspaces, setWorkspaces] = useState([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  // Fetch workspaces on mount or currentUser update
  useEffect(() => {
    const fetchWorkspaces = async () => {
      const token = localStorage.getItem('ct-auth-token');
      if (!token) {
        setWorkspaces(INITIAL_FALLBACK_WORKSPACES);
        setLoadingWorkspaces(false);
        return;
      }

      try {
        setLoadingWorkspaces(true);
        const res = await axios.get(`${API_BASE}/workspaces`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data && Array.isArray(res.data.workspaces)) {
          setWorkspaces(res.data.workspaces);
        } else {
          setWorkspaces(INITIAL_FALLBACK_WORKSPACES);
        }
      } catch (err) {
        console.warn('Backend offline or workspace fetch failed, using fallback:', err.message);
        setWorkspaces(INITIAL_FALLBACK_WORKSPACES);
      } finally {
        setLoadingWorkspaces(false);
      }
    };

    fetchWorkspaces();
  }, [currentUser]);

  const handleWorkspaceCreated = (newWs) => {
    const formatted = {
      id: newWs._id || newWs.id,
      title: newWs.title,
      desc: newWs.description,
      brandColor: newWs.brandColor || 'purple',
      icon: newWs.icon || 'Rocket',
      role: 'Lead',
      timeSpent: '0h 0m',
      status: newWs.status || 'active',
      language: newWs.language,
      inviteCode: newWs.inviteCode,
      collaborators: [currentUser?.name ? currentUser.name[0].toUpperCase() : 'You']
    };
    setWorkspaces(prev => [formatted, ...prev]);
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

  // Dynamic Timeline Events generated from user workspaces & goals
  const generatedTimeline = [];

  workspaces.slice(0, 3).forEach((ws, i) => {
    generatedTimeline.push({
      id: `ws-${ws.id || ws._id || i}`,
      time: formatRelativeTime(ws.updatedAt),
      type: 'workspace',
      tag: ws.role || 'Active',
      tagColor: ws.brandColor || 'purple',
      title: ws.title,
      desc: ws.desc || `Collaborative workspace using ${formatLanguageName(ws.language)}`,
      icon: FolderGit2
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
      time: formatRelativeTime(currentUser.updatedAt || currentUser.createdAt),
      type: 'task',
      tag: 'Account',
      tagColor: 'amber',
      title: 'Developer Profile',
      desc: `Authenticated as ${currentUser.name || currentUser.email}`,
      icon: User
    });
  }

  if (generatedTimeline.length === 0) {
    generatedTimeline.push({
      id: 'welcome-event',
      time: 'Just now',
      type: 'task',
      tag: 'Welcome',
      tagColor: 'purple',
      title: 'Welcome to CodeTrail',
      desc: 'Create your first collaborative workspace to get started.',
      icon: Rocket
    });
  }

  const filteredTimeline = generatedTimeline.filter(ev => {
    if (timelineFilter === 'all') return true;
    if (timelineFilter === 'workspace') return ev.type === 'workspace';
    if (timelineFilter === 'tasks') return ev.type === 'task';
    return true;
  });

  const filteredWorkspaces = workspaces.filter(ws => {
    if (workspaceFilter === 'starred') return ws.starred || ws.brandColor === 'purple' || ws.brandColor === 'cyan';
    if (workspaceFilter === 'shared') return (ws.members && ws.members.length > 1) || ws.brandColor === 'emerald' || ws.brandColor === 'amber';
    if (workspaceFilter === 'active') return ws.status === 'active' || !ws.status;
    if (workspaceFilter === 'archived') return ws.status === 'archived' || ws.status === 'inactive';
    return true;
  });

  // Calculate dynamic active session & stats
  const activeWorkspace = workspaces.find(w => w.status === 'active') || workspaces[0];

  const handleBannerAction = () => {
    if (activeWorkspace) {
      if (onJumpToWorkspace) onJumpToWorkspace(activeWorkspace);
    } else {
      setModalInitialTab('create');
      setIsWorkspaceModalOpen(true);
    }
  };

  const totalWorkspacesCount = workspaces.length;
  const pendingGoalsCount = goals.filter(g => !g.completed).length;
  const totalFilesCount = workspaces.reduce((acc, ws) => acc + (ws.filesCount || (ws.files ? ws.files.length : 1)), 0);
  const totalCollaboratorsCount = workspaces.reduce((acc, ws) => acc + (ws.collaborators ? ws.collaborators.length : 1), 0);

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
          <div className="ct-goals-list">
            {goals.map(g => (
              <div 
                key={g.id} 
                className={`ct-goal-item ${g.completed ? 'completed' : ''}`}
                onClick={() => toggleGoal(g.id)}
              >
                <div className={`ct-goal-checkbox ${g.completed ? 'checked' : ''}`}>
                  {g.completed && <Check size={10} />}
                </div>
                <span className="ct-goal-text">{g.text}</span>
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
        
        {/* Top Active Session Banner */}
        <div className="ct-recent-banner">
          <div className="ct-banner-content">
            <div className="ct-banner-time">
              <Clock size={13} className="text-purple-400" />
              <span>
                {activeWorkspace 
                  ? `Last edited ${formatRelativeTime(activeWorkspace.updatedAt)}` 
                  : `Welcome back, ${currentUser?.name || 'Developer'}!`}
              </span>
            </div>
            <h2 className="ct-banner-title">
              {activeWorkspace ? (
                <>{activeWorkspace.title} - <span>{formatLanguageName(activeWorkspace.language)}</span></>
              ) : (
                <>Get Started with <span>CodeTrail Workspaces</span></>
              )}
            </h2>
            <p className="ct-banner-desc">
              {activeWorkspace 
                ? (activeWorkspace.desc || `Collaborative development workspace on CodeTrail.`) 
                : 'Create your first collaborative workspace to start real-time pair programming and code execution.'}
            </p>
          </div>

          <button className="ct-btn-banner-action" onClick={handleBannerAction}>
            {activeWorkspace ? <Play size={14} className="fill-current" /> : <Plus size={14} />}
            <span>{activeWorkspace ? 'Jump Back In' : 'Create Workspace'}</span>
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
              <span className="ct-metric-label">Pending Goals</span>
              <span className="ct-metric-value">{pendingGoalsCount}</span>
            </div>
            <div className="ct-metric-icon cyan">
              <CheckSquare size={18} />
            </div>
          </div>

          <div className="ct-metric-card">
            <div className="ct-metric-info">
              <span className="ct-metric-label">Project Files</span>
              <span className="ct-metric-value">{totalFilesCount}</span>
            </div>
            <div className="ct-metric-icon emerald">
              <Code2 size={18} />
            </div>
          </div>

          <div className="ct-metric-card">
            <div className="ct-metric-info">
              <span className="ct-metric-label">Collaborators</span>
              <span className="ct-metric-value">{totalCollaboratorsCount}</span>
            </div>
            <div className="ct-metric-icon amber">
              <Users size={18} />
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
                  className={`ct-filter-pill ${timelineFilter === 'tasks' ? 'active' : ''}`}
                  onClick={() => setTimelineFilter('tasks')}
                >
                  Tasks
                </button>
              </div>
            </div>

            <div className="ct-timeline-events alternating">
              {filteredTimeline.map((event, idx) => {
                const EventIcon = event.icon;
                const sideClass = idx % 2 === 0 ? 'right' : 'left';
                return (
                  <div key={event.id} className={`ct-timeline-item ${sideClass}`}>
                    <div className="ct-timeline-node">
                      <EventIcon size={14} />
                    </div>
                    <div className="ct-timeline-card">
                      <div className="ct-timeline-card-header">
                        <span className="ct-timeline-time">{event.time}</span>
                        <span className={`ct-event-tag ${event.tagColor}`}>{event.tag}</span>
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
                  const WsIcon = resolveIcon(ws.icon);
                  return (
                    <div 
                      key={ws.id} 
                      className={`ct-brand-card ${ws.brandColor || 'purple'}`}
                      onClick={() => onJumpToWorkspace(ws)}
                    >
                      <div className="ct-brand-card-top">
                        <div className={`ct-brand-icon-box ${ws.brandColor || 'purple'}`}>
                          <WsIcon size={18} />
                        </div>
                        <span className="ct-lang-badge">
                          {formatLanguageName(ws.language)}
                        </span>
                      </div>

                      <div className="ct-brand-card-body">
                        <h4 className="ct-brand-card-title">{ws.title}</h4>
                        <p className="ct-brand-card-desc">{ws.desc}</p>
                      </div>

                      <div className="ct-brand-card-footer">
                        <div className="ct-card-meta-row">
                          <span className="ct-meta-label">Role</span>
                          <span className="ct-role-badge">{ws.role}</span>
                        </div>

                        <div className="ct-card-meta-row">
                          <span className="ct-meta-label">Room Code</span>
                          <span className={`ct-time-val font-mono ${ws.brandColor || 'purple'}`}>
                            {ws.inviteCode || 'CT-DEMO'}
                          </span>
                        </div>

                        <div className="ct-card-collab-row">
                          <div className="ct-collab-avatars">
                            {(ws.collaborators || ['U']).map((c, i) => (
                              <span key={i} className="ct-mini-avatar">{c}</span>
                            ))}
                          </div>
                          <span className="ct-card-status">
                            <span className={`ct-pulse-dot ${ws.status === 'active' ? 'green' : 'gray'}`} />
                            <span>{ws.status === 'active' ? 'Active' : 'Archived'}</span>
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
