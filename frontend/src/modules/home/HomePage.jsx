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
  Sparkles
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

export const HomePage = ({ onJumpToWorkspace, onOpenProfile }) => {
  const [timelineFilter, setTimelineFilter] = useState('all');

  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('create'); // 'create' | 'join'
  const [workspaces, setWorkspaces] = useState(INITIAL_FALLBACK_WORKSPACES);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  // Fetch workspaces on mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      const token = localStorage.getItem('ct-auth-token');
      if (!token) return;

      try {
        setLoadingWorkspaces(true);
        const res = await axios.get(`${API_BASE}/workspaces`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data && Array.isArray(res.data.workspaces) && res.data.workspaces.length > 0) {
          setWorkspaces(res.data.workspaces);
        }
      } catch (err) {
        console.warn('Backend offline or workspace fetch failed, using fallback:', err.message);
      } finally {
        setLoadingWorkspaces(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const handleWorkspaceCreated = (newWs) => {
    const formatted = {
      id: newWs._id,
      title: newWs.title,
      desc: newWs.description,
      brandColor: newWs.brandColor || 'purple',
      icon: newWs.icon || 'Rocket',
      role: 'Owner',
      timeSpent: '0h 0m',
      status: newWs.status || 'active',
      language: newWs.language,
      inviteCode: newWs.inviteCode,
      collaborators: ['You']
    };
    setWorkspaces(prev => [formatted, ...prev]);
  };

  const handleWorkspaceJoined = (workspaceId) => {
    // Refresh workspaces list and navigate to joined workspace
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

  // Personal Goals checklist state
  const [goals, setGoals] = useState([
    { id: 1, text: 'Review Auth PR', completed: true },
    { id: 2, text: 'Merge DB migration', completed: false },
    { id: 3, text: 'Update API docs', completed: false },
    { id: 4, text: 'Fix flaky test', completed: false },
  ]);

  const toggleGoal = (id) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const addGoal = () => {
    const text = prompt('Enter new goal:');
    if (text && text.trim()) {
      setGoals(prev => [...prev, { id: Date.now(), text: text.trim(), completed: false }]);
    }
  };

  const timelineEvents = [
    {
      id: 1,
      time: 'Today, 5:00 PM',
      type: 'task',
      tag: 'Urgent',
      tagColor: 'amber',
      title: 'Finalize API Documentation',
      desc: 'Review and merge the latest swagger specs for the microservices beta.',
      icon: CheckSquare
    },
    {
      id: 2,
      time: 'Today, 2:30 PM',
      type: 'workspace',
      tag: 'PR Merged',
      tagColor: 'purple',
      title: 'PR #142 Merged',
      desc: '@sarah merged your pull request in Project Alpha.',
      icon: GitMerge
    },
    {
      id: 3,
      time: 'Yesterday, 4:15 PM',
      type: 'workspace',
      tag: 'Commit',
      tagColor: 'cyan',
      title: 'Pushed to feature/auth-flow',
      desc: '[update] integrated oauth providers and JWT session management',
      icon: GitCommit
    }
  ];

  const filteredTimeline = timelineEvents.filter(ev => {
    if (timelineFilter === 'all') return true;
    if (timelineFilter === 'workspace') return ev.type === 'workspace';
    if (timelineFilter === 'tasks') return ev.type === 'task';
    return true;
  });

  const filteredWorkspaces = workspaces.filter(ws => {
    if (workspaceFilter === 'all') return true;
    if (workspaceFilter === 'active') return ws.status === 'active';
    if (workspaceFilter === 'archived') return ws.status === 'archived' || ws.status === 'inactive';
    return true;
  });

  return (
    <div className="ct-home-container">
      
      {/* Desktop Left Sidebar with Personal Goals Widget & Hover Expand */}
      <aside 
        className={`ct-home-sidebar ${sidebarHovered ? 'expanded' : ''}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="ct-sidebar-group top">
          <button className="ct-sidebar-btn active" title="Dashboard">
            <LayoutGrid size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Dashboard</span>
          </button>
          <button className="ct-sidebar-btn" title="All Workspaces">
            <FolderGit2 size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Workspaces</span>
          </button>
          <button className="ct-sidebar-btn" title="Starred">
            <Star size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Starred</span>
          </button>
          <button className="ct-sidebar-btn" title="Shared with me">
            <Users size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Shared with me</span>
          </button>
          <button className="ct-sidebar-btn" title="Archived">
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
            <User size={18} className="ct-sidebar-icon" />
            <span className="ct-sidebar-label">Developer Profile</span>
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
              <span>Last edited 2 hours ago</span>
            </div>
            <h2 className="ct-banner-title">Project Alpha - <span>feature/auth-flow</span></h2>
            <p className="ct-banner-desc">You were working on integrating OAuth providers and session tokens.</p>
          </div>

          <button className="ct-btn-banner-action" onClick={onJumpToWorkspace}>
            <Play size={14} className="fill-current" />
            <span>Jump Back In</span>
          </button>
        </div>

        {/* 4 Metric Stats Cards */}
        <div className="ct-home-metrics">
          <div className="ct-metric-card">
            <div className="ct-metric-info">
              <span className="ct-metric-label">Active PRs</span>
              <span className="ct-metric-value">3</span>
            </div>
            <div className="ct-metric-icon purple">
              <GitPullRequest size={18} />
            </div>
          </div>

          <div className="ct-metric-card">
            <div className="ct-metric-info">
              <span className="ct-metric-label">Pending Tasks</span>
              <span className="ct-metric-value">5</span>
            </div>
            <div className="ct-metric-icon cyan">
              <CheckSquare size={18} />
            </div>
          </div>

          <div className="ct-metric-card">
            <div className="ct-metric-info">
              <span className="ct-metric-label">Lines Today</span>
              <span className="ct-metric-value">+1.2k</span>
            </div>
            <div className="ct-metric-icon emerald">
              <Code2 size={18} />
            </div>
          </div>

          <div className="ct-metric-card">
            <div className="ct-metric-info">
              <span className="ct-metric-label">Code Reviews</span>
              <span className="ct-metric-value">2</span>
            </div>
            <div className="ct-metric-icon amber">
              <MessageSquare size={18} />
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

          {/* Right Panel: Your Workspaces Explorer (Side-by-Side) */}
          <div className="ct-home-panel ct-workspace-panel">
            <div className="ct-panel-header">
              <div className="ct-panel-title">
                <FolderGit2 size={16} className="text-purple-400" />
                <span>Your Workspaces</span>
                {loadingWorkspaces && <Loader2 size={14} className="animate-spin text-purple-400" />}
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  className="ct-btn-secondary-sm" 
                  onClick={() => {
                    setModalInitialTab('join');
                    setIsWorkspaceModalOpen(true);
                  }}
                  title="Join workspace with invite code"
                >
                  <KeyRound size={14} />
                  <span>Join via Code</span>
                </button>
                
                <button 
                  className="ct-btn-primary-sm" 
                  onClick={() => {
                    setModalInitialTab('create');
                    setIsWorkspaceModalOpen(true);
                  }}
                >
                  <Plus size={14} />
                  <span>New Workspace</span>
                </button>
              </div>
            </div>

            {/* Filter Pills Row */}
            <div className="ct-workspace-filter-bar">
              <div className="ct-filter-pills-row">
                <button 
                  className={`ct-filter-pill ${workspaceFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setWorkspaceFilter('all')}
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
                  className={`ct-filter-pill ${workspaceFilter === 'archived' ? 'active' : ''}`}
                  onClick={() => setWorkspaceFilter('archived')}
                >
                  Archived
                </button>
              </div>
            </div>

            {/* Dynamic Brand Accent Workspace Cards Grid */}
            <div className="ct-brand-cards-split-grid">
              {filteredWorkspaces.length === 0 ? (
                <div className="ct-empty-workspace-state">
                  <Sparkles size={24} className="text-purple-400 mb-2" />
                  <p>No workspaces found in this filter.</p>
                  <button 
                    className="ct-btn-primary-sm mt-3"
                    onClick={() => {
                      setModalInitialTab('create');
                      setIsWorkspaceModalOpen(true);
                    }}
                  >
                    <Plus size={14} />
                    <span>Create Your First Workspace</span>
                  </button>
                </div>
              ) : (
                filteredWorkspaces.map(ws => {
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
