import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FolderGit2, 
  Plus, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  LayoutGrid, 
  List, 
  Code2, 
  Users, 
  Star, 
  Clock, 
  KeyRound, 
  ArrowRight, 
  Lock, 
  Globe, 
  Rocket, 
  Cpu, 
  Database, 
  Palette, 
  Sparkles, 
  Settings,
  Copy,
  Check,
  Loader2,
  Trash2,
  Archive,
  ArrowLeft
} from 'lucide-react';
import { WorkspaceModal } from '../../components/workspace/WorkspaceModal';
import { WorkspaceSettingsModal } from '../../components/workspace/WorkspaceSettingsModal';

const API_BASE = 'http://localhost:5000/api';

const INITIAL_FALLBACK_WORKSPACES = [
  {
    id: 'ws-core',
    _id: 'ws-core',
    title: 'CodeTrail Core Engine',
    description: 'Real-time multi-user workspace & collaborative Monaco editor.',
    language: 'javascript',
    roomCode: 'CT-EDMAV8',
    inviteCode: 'CT-EDMAV8',
    brandColor: 'purple',
    icon: 'Rocket',
    status: 'active',
    starred: true,
    settings: { isPublic: false },
    members: [{ name: 'Maryam Shaikh', role: 'owner' }, { name: 'Alex Johnson', role: 'editor' }, { name: 'Sarah Chen', role: 'editor' }],
    filesCount: 5,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ws-python-ai',
    _id: 'ws-python-ai',
    title: 'Python Telemetry ML Model',
    description: 'Automated telemetry data pipeline & model execution sandbox.',
    language: 'python',
    roomCode: 'CT-PYML92',
    inviteCode: 'CT-PYML92',
    brandColor: 'cyan',
    icon: 'Cpu',
    status: 'active',
    starred: true,
    settings: { isPublic: true },
    members: [{ name: 'Maryam Shaikh', role: 'owner' }, { name: 'Meet Patel', role: 'viewer' }],
    filesCount: 3,
    updatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: 'ws-cpp-kernel',
    _id: 'ws-cpp-kernel',
    title: 'C++ Low-Latency Kernel',
    description: 'High-performance memory buffer & system kernel benchmarks.',
    language: 'cpp',
    roomCode: 'CT-CPP88X',
    inviteCode: 'CT-CPP88X',
    brandColor: 'emerald',
    icon: 'Database',
    status: 'active',
    starred: false,
    settings: { isPublic: false },
    members: [{ name: 'Maryam Shaikh', role: 'owner' }],
    filesCount: 2,
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'ws-rust-wasm',
    _id: 'ws-rust-wasm',
    title: 'Rust WebAssembly Parser',
    description: 'Wasm compilation sandbox for client-side code parsing.',
    language: 'rust',
    roomCode: 'CT-RSW991',
    inviteCode: 'CT-RSW991',
    brandColor: 'amber',
    icon: 'Code2',
    status: 'archived',
    starred: false,
    settings: { isPublic: true },
    members: [{ name: 'Maryam Shaikh', role: 'owner' }, { name: 'Alex Johnson', role: 'editor' }],
    filesCount: 4,
    updatedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString()
  }
];

const resolveIcon = (iconName) => {
  switch (iconName) {
    case 'Cpu': return Cpu;
    case 'Database': return Database;
    case 'Palette': return Palette;
    case 'Code2': return Code2;
    case 'Rocket':
    default: return Rocket;
  }
};

export const WorkspacesPage = ({ 
  currentUser, 
  onJumpToWorkspace, 
  onBackToHome 
}) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'starred' | 'shared' | 'archived'
  const [languageFilter, setLanguageFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  // Modals state
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('create');
  
  const [selectedSettingsWorkspace, setSelectedSettingsWorkspace] = useState(() => {
    try {
      const saved = localStorage.getItem('ct-dir-settings-selected-ws');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(() => {
    try {
      return localStorage.getItem('ct-dir-settings-open') === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ct-dir-settings-open', isSettingsModalOpen.toString());
      if (selectedSettingsWorkspace) {
        localStorage.setItem('ct-dir-settings-selected-ws', JSON.stringify(selectedSettingsWorkspace));
      } else {
        localStorage.removeItem('ct-dir-settings-selected-ws');
      }
    } catch (e) {}
  }, [isSettingsModalOpen, selectedSettingsWorkspace]);
  
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  // Fetch workspaces from REST API or Local Fallback
  const fetchWorkspaces = async () => {
    const token = localStorage.getItem('ct-auth-token');
    if (!token) {
      setWorkspaces(INITIAL_FALLBACK_WORKSPACES);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/workspaces`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.workspaces && res.data.workspaces.length > 0) {
        setWorkspaces(res.data.workspaces);
      } else {
        setWorkspaces(INITIAL_FALLBACK_WORKSPACES);
      }
    } catch (err) {
      console.warn('Fetch workspaces failed:', err.message);
      setWorkspaces(INITIAL_FALLBACK_WORKSPACES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCopyCode = (e, code, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleOpenSettings = (e, ws) => {
    e.stopPropagation();
    setSelectedSettingsWorkspace(ws);
    setIsSettingsModalOpen(true);
  };

  const handleToggleStar = (e, wsId) => {
    e.stopPropagation();
    setWorkspaces(prev => prev.map(w => {
      if (w.id === wsId || w._id === wsId) {
        return { ...w, starred: !w.starred };
      }
      return w;
    }));
  };

  const filteredWorkspaces = workspaces.filter(ws => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (ws.title || ws.name || '').toLowerCase().includes(q);
      const matchDesc = (ws.description || '').toLowerCase().includes(q);
      const matchCode = (ws.roomCode || ws.inviteCode || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCode) return false;
    }

    // Language filter
    if (languageFilter !== 'all' && ws.language !== languageFilter) {
      return false;
    }

    // Category tab filter
    if (categoryFilter === 'starred') {
      return ws.starred || ws.brandColor === 'purple' || ws.brandColor === 'cyan';
    }
    if (categoryFilter === 'shared') {
      return (ws.members && ws.members.length > 1) || ws.brandColor === 'emerald' || ws.brandColor === 'amber';
    }
    if (categoryFilter === 'archived') {
      return ws.status === 'archived' || ws.status === 'inactive';
    }
    if (categoryFilter === 'active') {
      return ws.status === 'active' || !ws.status;
    }

    return true;
  });

  const totalFiles = workspaces.reduce((acc, ws) => acc + (ws.filesCount || (ws.files ? ws.files.length : 1)), 0);
  const totalMembers = workspaces.reduce((acc, ws) => acc + (ws.members ? ws.members.length : 1), 0);

  return (
    <div className="ct-workspaces-directory-page">
      
      {/* 1. HERO HEADER BANNER */}
      <div className="ct-workspaces-hero-banner">
        <div className="ct-workspaces-hero-ambient" />
        
        <div className="ct-workspaces-hero-left">
          <div className="ct-workspaces-hero-title-row">
            {onBackToHome && (
              <button 
                onClick={onBackToHome}
                className="ct-workspaces-back-btn"
                title="Back to Dashboard"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="ct-workspaces-hero-icon">
              <FolderGit2 size={22} />
            </div>
            <div>
              <h1 className="ct-workspaces-hero-h1">
                <span>All Workspaces Directory</span>
                <span className="ct-workspaces-count-badge">
                  {workspaces.length} Total
                </span>
              </h1>
              <p className="ct-workspaces-hero-desc">
                Manage, launch, and collaborate across all your development rooms.
              </p>
            </div>
          </div>

          {/* Quick Metrics Pills */}
          <div className="ct-workspaces-hero-metrics">
            <div className="ct-workspaces-metric-pill">
              <Code2 size={14} className="text-purple-400" />
              <span>Files: <strong>{totalFiles}</strong></span>
            </div>
            <div className="ct-workspaces-metric-pill">
              <Users size={14} className="text-cyan-400" />
              <span>Collaborators: <strong>{totalMembers}</strong></span>
            </div>
            <div className="ct-workspaces-metric-pill">
              <Sparkles size={14} className="text-emerald-400" />
              <span>Status: <strong className="text-emerald-300">Live Engine Ready</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ct-workspaces-hero-actions">
          <button 
            onClick={() => {
              setModalInitialTab('join');
              setIsWorkspaceModalOpen(true);
            }}
            className="ct-btn-join"
          >
            <KeyRound size={15} className="text-purple-400" />
            <span>Join via Code</span>
          </button>

          <button 
            onClick={() => {
              setModalInitialTab('create');
              setIsWorkspaceModalOpen(true);
            }}
            className="ct-btn-create"
          >
            <Plus size={16} />
            <span>New Workspace</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROL BAR */}
      <div className="ct-workspaces-toolbar">
        
        {/* Search Bar */}
        <div className="ct-workspaces-search-wrapper">
          <Search size={16} className="ct-workspaces-search-icon" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces by name, description, or room code..."
            className="ct-workspaces-search-input"
          />
        </div>

        {/* Controls Right */}
        <div className="ct-workspaces-controls-right">
          
          {/* Category Tabs */}
          <div className="ct-workspaces-category-tabs">
            {[
              { id: 'all', label: 'All' },
              { id: 'starred', label: 'Starred' },
              { id: 'shared', label: 'Shared' },
              { id: 'archived', label: 'Archived' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`ct-workspaces-tab-btn ${categoryFilter === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Language Selector */}
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="ct-workspaces-select"
          >
            <option value="all">All Languages</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="rust">Rust</option>
            <option value="go">Go</option>
          </select>

          {/* Grid vs List View Switcher */}
          <div className="ct-workspaces-view-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={`ct-workspaces-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`ct-workspaces-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              title="List View"
            >
              <List size={15} />
            </button>
          </div>
        </div>

      </div>

      {/* 3. WORKSPACES CARDS CONTAINER */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-[#0D0E15] border border-white/10 text-gray-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
          <Loader2 size={24} className="animate-spin text-purple-400" />
          <span>Loading workspace directory...</span>
        </div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0D0E15] border border-white/10 text-gray-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
          <FolderGit2 size={32} className="text-gray-600" />
          <p className="text-sm font-bold text-white">No workspaces found matching filter criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setLanguageFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold transition-all cursor-pointer mt-2"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="ct-workspaces-grid-container">
          {filteredWorkspaces.map(ws => {
            const WsIcon = resolveIcon(ws.icon);
            const wsCode = ws.roomCode || ws.inviteCode || 'CT-EDMAV8';
            const accent = ws.brandColor || 'purple';

            return (
              <div
                key={ws.id || ws._id}
                onClick={() => onJumpToWorkspace(ws)}
                className={`ct-workspace-dir-card ${accent}`}
              >
                <div>
                  {/* Card Header */}
                  <div className="ct-ws-card-header">
                    <div className="ct-ws-card-title-group">
                      <div className={`ct-ws-card-icon-box ${accent}`}>
                        <WsIcon size={20} />
                      </div>
                      <div>
                        <h3 className="ct-ws-card-name">
                          {ws.title || ws.name}
                        </h3>
                        <div className="ct-ws-card-tags">
                          <span className="ct-ws-lang-tag">
                            {ws.language || 'js'}
                          </span>
                          {ws.settings?.isPublic ? (
                            <span className="ct-ws-access-tag"><Globe size={11} /> Public</span>
                          ) : (
                            <span className="ct-ws-access-tag"><Lock size={11} /> Private</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ct-ws-card-actions">
                      <button
                        onClick={(e) => handleToggleStar(e, ws.id || ws._id)}
                        className={`ct-ws-icon-btn ${ws.starred ? 'starred' : ''}`}
                        title="Star workspace"
                      >
                        <Star size={15} fill={ws.starred ? 'currentColor' : 'none'} />
                      </button>

                      <button
                        onClick={(e) => handleOpenSettings(e, ws)}
                        className="ct-ws-icon-btn"
                        title="Workspace Settings"
                      >
                        <Settings size={15} />
                      </button>
                    </div>
                  </div>

                  <p className="ct-ws-card-body">
                    {ws.description || 'Collaborative development workspace on CodeTrail.'}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="ct-ws-card-footer">
                  <div className="ct-ws-footer-row">
                    <button
                      onClick={(e) => handleCopyCode(e, wsCode, ws.id || ws._id)}
                      className="ct-ws-code-btn"
                      title="Copy room code"
                    >
                      <KeyRound size={12} className="text-purple-400" />
                      <span>Code: <strong>{wsCode}</strong></span>
                      {copiedCodeId === (ws.id || ws._id) ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <Copy size={12} className="opacity-0 hover:opacity-100 transition-opacity" />
                      )}
                    </button>

                    <span className="text-[11px] text-gray-400">
                      {ws.filesCount || (ws.files ? ws.files.length : 1)} files
                    </span>
                  </div>

                  <div className="ct-ws-footer-row">
                    {/* Collaborator Avatars */}
                    <div className="flex items-center -space-x-2">
                      {(ws.members || [{ name: 'User' }]).slice(0, 3).map((m, idx) => (
                        <span 
                          key={idx}
                          className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 text-white font-mono text-[10px] font-bold flex items-center justify-center border border-[#0D0E15] shadow-sm"
                          title={m.name || 'Collaborator'}
                        >
                          {(m.name || 'U')[0].toUpperCase()}
                        </span>
                      ))}
                    </div>

                    <div className="ct-ws-launch-link">
                      <span>Launch IDE</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW MODE */
        <div className="space-y-3">
          {filteredWorkspaces.map(ws => {
            const WsIcon = resolveIcon(ws.icon);
            const wsCode = ws.roomCode || ws.inviteCode || 'CT-EDMAV8';

            return (
              <div
                key={ws.id || ws._id}
                onClick={() => onJumpToWorkspace(ws)}
                className="flex items-center justify-between p-4 rounded-xl bg-[#0D0E15] border border-white/10 hover:border-purple-500/50 hover:bg-white/[0.04] transition-all cursor-pointer gap-4 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0">
                    <WsIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs md:text-sm font-bold text-white group-hover:text-purple-300 truncate">{ws.title || ws.name}</h3>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-gray-300 font-bold shrink-0">
                        {ws.language || 'js'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono truncate max-w-md mt-0.5">{ws.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 font-mono text-xs">
                  <span className="text-gray-400 hidden sm:inline">Room: <strong className="text-white">{wsCode}</strong></span>
                  
                  <button
                    onClick={(e) => handleOpenSettings(e, ws)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Workspace Settings"
                  >
                    <Settings size={16} />
                  </button>

                  <div className="flex items-center gap-1 font-bold text-purple-400 group-hover:text-purple-300">
                    <span>Open</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / JOIN WORKSPACE MODAL */}
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onWorkspaceCreated={(newWs) => {
          setWorkspaces(prev => [newWs, ...prev]);
          if (onJumpToWorkspace) onJumpToWorkspace(newWs);
        }}
        onWorkspaceJoined={(joinedWs) => {
          setWorkspaces(prev => [joinedWs, ...prev]);
          if (onJumpToWorkspace) onJumpToWorkspace(joinedWs);
        }}
        initialTab={modalInitialTab}
      />

      {/* WORKSPACE SETTINGS MODAL */}
      <WorkspaceSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        workspace={selectedSettingsWorkspace}
        onUpdateWorkspace={(updatedWs) => {
          setWorkspaces(prev => prev.map(w => (w.id === updatedWs.id || w._id === updatedWs._id) ? updatedWs : w));
        }}
      />

    </div>
  );
};

export default WorkspacesPage;
