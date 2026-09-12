import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Users, 
  ShieldCheck, 
  Zap, 
  GitCommit, 
  FileCode, 
  ArrowLeft, 
  KeyRound, 
  Globe, 
  Lock, 
  Clock, 
  Check, 
  X,
  Copy, 
  Save, 
  LogOut,
  ChevronDown,
  ChevronUp,
  Folder,
  FileText,
  Code2,
  FilePlus,
  FolderPlus,
  ChevronRight,
  Eye,
  Edit3,
  Settings
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { WORKSPACE_FILES } from '../../constants/workspace.constants';
import WorkspaceSettingsModal from '../../components/workspace/WorkspaceSettingsModal';

// Map file extensions to Monaco language identifiers
const getMonacoLanguage = (fileName = '') => {
  const ext = fileName.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    cpp: 'cpp',
    c: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    java: 'java',
    rs: 'rust',
    go: 'go',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    sql: 'sql',
    sh: 'shell',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml'
  };
  return map[ext] || 'javascript';
};

const getStarterBoilerplate = (filename = '') => {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'py':
      return `# ${filename}\ndef main():\n    print("Hello from Python!")\n\nif __name__ == "__main__":\n    main()\n`;
    case 'cpp':
    case 'c':
    case 'h':
    case 'hpp':
      return `// ${filename}\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}\n`;
    case 'java':
      return `// ${filename}\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}\n`;
    case 'rs':
      return `// ${filename}\nfn main() {\n    println!("Hello from Rust!");\n}\n`;
    case 'go':
      return `// ${filename}\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go!")\n}\n`;
    case 'css':
      return `/* ${filename} */\nbody {\n  margin: 0;\n  padding: 0;\n}\n`;
    case 'json':
      return `{\n  "name": "project",\n  "version": "1.0.0"\n}\n`;
    case 'html':
      return `<!DOCTYPE html>\n<html>\n<head>\n  <title>CodeTrail</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>\n`;
    case 'md':
      return `# ${filename}\n\nDocumentation for CodeTrail project.\n`;
    case 'js':
    default:
      return `// ${filename}\nconsole.log("Ready to code in CodeTrail!");\n`;
  }
};

const DEFAULT_WORKSPACE_FILES = [
  { id: 'index.js', name: 'index.js', language: 'javascript', content: `// index.js - CodeTrail Collaborative Workspace\n\nconsole.log("Welcome to CodeTrail!");\nconsole.log("Interactive Monaco Editor mounted successfully.");\n` },
  { id: 'server.js', name: 'server.js', language: 'javascript', content: `// server.js\nconst express = require('express');\nconst app = express();\nconst PORT = 3000;\n\napp.get('/', (req, res) => res.send('CodeTrail Server Online'));\napp.listen(PORT, () => console.log('Listening on ' + PORT));\n` },
  { id: 'styles.css', name: 'styles.css', language: 'css', content: `/* styles.css */\nbody {\n  background-color: #0d0e15;\n  color: #ffffff;\n  font-family: sans-serif;\n}\n` },
  { id: 'package.json', name: 'package.json', language: 'json', content: `{\n  "name": "codetrail-project",\n  "version": "1.0.0",\n  "main": "index.js"\n}\n` },
  { id: 'README.md', name: 'README.md', language: 'markdown', content: `# Project Workspace\n\nWelcome to your collaborative CodeTrail workspace.\n` }
];

const DEFAULT_FILES_CONTENT = {
  'index.js': `// index.js - CodeTrail Collaborative Workspace\n\nconsole.log("Welcome to CodeTrail!");\nconsole.log("Interactive Monaco Editor mounted successfully.");\n`,
  'server.js': `// server.js\nconst express = require('express');\nconst app = express();\nconst PORT = 3000;\n\napp.get('/', (req, res) => res.send('CodeTrail Server Online'));\napp.listen(PORT, () => console.log('Listening on ' + PORT));\n`,
  'styles.css': `/* styles.css */\nbody {\n  background-color: #0d0e15;\n  color: #ffffff;\n  font-family: sans-serif;\n}\n`,
  'package.json': `{\n  "name": "codetrail-project",\n  "version": "1.0.0",\n  "main": "index.js"\n}\n`,
  'README.md': `# Project Workspace\n\nWelcome to your collaborative CodeTrail workspace.\n`
};

export const ModularWorkspace = ({ activeWorkspace, onBackToHome }) => {
  const [currentWorkspace, setCurrentWorkspace] = useState(activeWorkspace);

  useEffect(() => {
    if (activeWorkspace) {
      setCurrentWorkspace(activeWorkspace);
    }
  }, [activeWorkspace]);

  const currentUser = JSON.parse(localStorage.getItem('ct-auth-user')) || { id: 'usr-guest', name: 'Maryam Shaikh', role: 'admin' };
  const token = localStorage.getItem('ct-auth-token');
  const currentUserId = currentUser?.id || currentUser?._id;

  const isOwner = (currentWorkspace?.owner?._id || currentWorkspace?.owner) === currentUserId;
  const memberObj = currentWorkspace?.members?.find(m => (m.user?._id || m.user?.id || m.user) === currentUserId || m.id === currentUserId);

  const workspaceRole = currentWorkspace?.role 
    || activeWorkspace?.role 
    || (isOwner ? 'owner' : null) 
    || memberObj?.role 
    || (currentUser?.role ? currentUser.role : null)
    || 'editor';
  const canEditFiles = ['owner', 'admin', 'editor'].includes(workspaceRole);
  const wsId = currentWorkspace?._id || currentWorkspace?.id || activeWorkspace?._id || activeWorkspace?.id || 'demo-workspace';

  // Persistent Settings Modal Open State across page refreshes
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(() => {
    try {
      return localStorage.getItem(`ct-workspace-settings-open-${wsId}`) === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`ct-workspace-settings-open-${wsId}`, isSettingsModalOpen.toString());
    } catch (e) {}
  }, [isSettingsModalOpen, wsId]);

  // Persistent Active File State across refreshes
  const [activeFile, setActiveFile] = useState(() => {
    try {
      const saved = localStorage.getItem(`ct-workspace-active-file-${wsId}`);
      if (saved) return saved;
    } catch (e) {}
    return activeWorkspace?.files?.[0]?.name || 'index.js';
  });

  useEffect(() => {
    try {
      if (activeFile) {
        localStorage.setItem(`ct-workspace-active-file-${wsId}`, activeFile);
      }
    } catch (e) {}
  }, [activeFile, wsId]);
  
  // Dynamic Files & Folders List State (Persisted in localStorage)
  const [customFiles, setCustomFiles] = useState(() => {
    try {
      const saved = localStorage.getItem(`ct-workspace-files-${wsId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    if (activeWorkspace?.files && activeWorkspace.files.length > 0) {
      return activeWorkspace.files.map(f => ({
        id: f.name || f.id,
        name: f.name,
        iconColor: f.name?.endsWith('.js') ? 'text-yellow-400' : f.name?.endsWith('.css') ? 'text-sky-400' : f.name?.endsWith('.json') ? 'text-emerald-400' : 'text-purple-400',
        isFolder: false
      }));
    }
    return [
      { id: 'index.js', name: 'index.js', iconColor: 'text-yellow-400', isFolder: false },
      { id: 'server.js', name: 'server.js', iconColor: 'text-cyan-400', isFolder: false },
      { id: 'styles.css', name: 'styles.css', iconColor: 'text-sky-400', isFolder: false },
      { id: 'package.json', name: 'package.json', iconColor: 'text-emerald-400', isFolder: false },
      { id: 'README.md', name: 'README.md', iconColor: 'text-purple-400', isFolder: false }
    ];
  });

  useEffect(() => {
    if (!Array.isArray(currentWorkspace?.files) || currentWorkspace.files.length === 0) return;

    const sharedFiles = currentWorkspace.files.map(file => ({
      id: file.id || file.name,
      name: file.name || file.id,
      iconColor: file.name?.endsWith('.js') ? 'text-yellow-400' : file.name?.endsWith('.css') ? 'text-sky-400' : file.name?.endsWith('.json') ? 'text-emerald-400' : 'text-purple-400',
      isFolder: false
    }));

    setCustomFiles(sharedFiles);
    setActiveFile(previous => sharedFiles.some(file => file.name === previous) ? previous : sharedFiles[0].name);
  }, [currentWorkspace?.files]);

  useEffect(() => {
    try {
      localStorage.setItem(`ct-workspace-files-${wsId}`, JSON.stringify(customFiles));
    } catch (e) {}
  }, [customFiles, wsId]);

  const editorRef = useRef(null);
  const activeFileRef = useRef(activeFile);
  const isRemoteUpdateRef = useRef(false);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  // Dedicated in-memory map storing content per file name (with localStorage backup support)
  const [filesContent, setFilesContent] = useState(() => {
    const initial = { ...DEFAULT_FILES_CONTENT };

    // 1. Overlay from localStorage backup if available
    try {
      const savedBackup = localStorage.getItem(`ct-workspace-content-${wsId}`);
      if (savedBackup) {
        const parsed = JSON.parse(savedBackup);
        if (parsed && typeof parsed === 'object') {
          Object.assign(initial, parsed);
        }
      }
    } catch (e) {}

    // 2. Overlay from activeWorkspace.files if available
    if (activeWorkspace?.files && Array.isArray(activeWorkspace.files)) {
      activeWorkspace.files.forEach(f => {
        const fname = f.name || f.id;
        if (fname && f.content !== undefined) {
          if (!initial[fname] || initial[fname] === DEFAULT_FILES_CONTENT[fname]) {
            initial[fname] = f.content;
          }
        }
      });
    }
    return initial;
  });

  const filesContentRef = useRef(filesContent);
  useEffect(() => {
    filesContentRef.current = filesContent;
  }, [filesContent]);

  const currentWorkspaceRef = useRef(currentWorkspace);
  useEffect(() => {
    currentWorkspaceRef.current = currentWorkspace;
  }, [currentWorkspace]);

  const autoSaveTimerRef = useRef(null);

  // Clean up debounced auto-save timer on unmount or workspace switch (CT-88)
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [wsId]);

  // Keep filesContent in sync if workspace files load from backend
  useEffect(() => {
    if (currentWorkspace?.files && Array.isArray(currentWorkspace.files)) {
      setFilesContent(prev => {
        const next = { ...prev };
        currentWorkspace.files.forEach(f => {
          const fname = f.name || f.id;
          if (fname && f.content !== undefined && next[fname] === undefined) {
            next[fname] = f.content;
          }
        });
        filesContentRef.current = next;
        return next;
      });
    }
  }, [currentWorkspace?.files]);

  // Retrieve active file content strictly for the active file
  const getActiveFileContent = () => {
    if (filesContent[activeFile] !== undefined) {
      return filesContent[activeFile];
    }
    return getStarterBoilerplate(activeFile);
  };

  // Debounced Auto-Save Request Handler (PATCH /api/workspaces/:id) (CT-88)
  const triggerAutoSave = async () => {
    if (!wsId || wsId === 'demo-workspace' || !token) {
      setAutoSaveStatus('Auto-saved locally');
      return;
    }

    if (!canEditFiles) return;

    try {
      setAutoSaveStatus('Saving...');

      const baseFiles = (currentWorkspaceRef.current?.files && currentWorkspaceRef.current.files.length > 0)
        ? currentWorkspaceRef.current.files
        : DEFAULT_WORKSPACE_FILES;

      const filesToSave = baseFiles.map(f => {
        const fname = f.name || f.id;
        const latestContent = filesContentRef.current[fname] !== undefined
          ? filesContentRef.current[fname]
          : (f.content || '');
        return {
          id: f.id || fname,
          name: fname,
          language: f.language || getMonacoLanguage(fname),
          content: latestContent,
          updatedAt: new Date()
        };
      });

      const res = await axios.patch(`http://localhost:5000/api/workspaces/${wsId}`, {
        files: filesToSave
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.workspace) {
        setCurrentWorkspace(res.data.workspace);
        currentWorkspaceRef.current = res.data.workspace;
      }
      setAutoSaveStatus('Auto-saved just now');
    } catch (err) {
      console.warn('Auto-save to backend failed:', err.message);
      // Retain localStorage backup, avoid crashing, and show graceful offline state
      setAutoSaveStatus('Saved locally (offline)');
    }
  };

  // Update local in-memory workspace file buffer when user types in Monaco
  const handleEditorChange = (newCode) => {
    // Prevent programmatic / remote updates from triggering state churn or outbound code_change
    if (isRemoteUpdateRef.current) return;

    const content = newCode ?? '';

    // 1. Immediately store under the specific activeFile key in state and ref
    const updatedMap = {
      ...filesContentRef.current,
      [activeFile]: content
    };
    filesContentRef.current = updatedMap;

    setFilesContent(prev => ({
      ...prev,
      [activeFile]: content
    }));

    // 2. Synchronous LocalStorage Backup (CT-88 Requirement 8)
    try {
      localStorage.setItem(`ct-workspace-content-${wsId}`, JSON.stringify(updatedMap));
    } catch (e) {
      console.warn('LocalStorage backup error:', e);
    }

    // 3. Keep currentWorkspace.files synchronized
    setCurrentWorkspace(prev => {
      if (!prev) return prev;
      const baseFiles = (prev.files && prev.files.length > 0) ? prev.files : DEFAULT_WORKSPACE_FILES;
      const fileIndex = baseFiles.findIndex(f => (f.name || f.id) === activeFile);

      let updatedFiles;
      if (fileIndex >= 0) {
        updatedFiles = baseFiles.map((f, i) => 
          i === fileIndex ? { ...f, content } : f
        );
      } else {
        updatedFiles = [...baseFiles, { id: activeFile, name: activeFile, language: getMonacoLanguage(activeFile), content }];
      }

      const nextWs = { ...prev, files: updatedFiles };
      currentWorkspaceRef.current = nextWs;
      return nextWs;
    });

    // 4. Emit real-time code change to peers via Socket.IO (CT-85)
    if (socketRef.current) {
      socketRef.current.emit('code_change', {
        workspaceId: wsId,
        fileId: activeFile,
        content
      });
    }

    // 5. 2.5-second Debounced Auto-save (CT-88 Requirement 1, 2, 3, 10, 11)
    setAutoSaveStatus('Unsaved changes...');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      triggerAutoSave();
    }, 2500);
  };

  // Log real-time workspace session enter & history event once per session entrance
  const sessionLoggedRef = useRef(false);

  useEffect(() => {
    if (!wsId || sessionLoggedRef.current) return;
    sessionLoggedRef.current = true;

    const startSessionInDB = async () => {
      try {
        const savedKey = `ct-workspace-history-${wsId}`;
        const existing = JSON.parse(localStorage.getItem(savedKey) || '[]');
        const recentStart = existing.find(l => (l.type === 'session' || l.title === 'Session Started') && (Date.now() - new Date(l.timestamp).getTime()) < 120000);

        if (!recentStart) {
          const startLog = {
            id: `h-${Date.now()}`,
            type: 'session',
            title: 'Session Started',
            details: `Developer ${currentUser.name || 'Maryam Shaikh'} connected to live workspace session.`,
            user: currentUser.name || 'Maryam Shaikh',
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(savedKey, JSON.stringify([startLog, ...existing]));

          if (token && wsId !== 'demo-workspace') {
            await axios.post(`http://localhost:5000/api/workspaces/${wsId}/session`, {
              role: 'editor',
              currentFileId: activeFile
            }, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {});

            await axios.post(`http://localhost:5000/api/workspaces/${wsId}/history`, startLog, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Session start logging notice:', err.message);
      }
    };

    startSessionInDB();
  }, [wsId]);

  // Dropdown Input Popovers State
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Collapsible Members Panel State
  const [isMembersCollapsed, setIsMembersCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ct-workspace-members-collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ct-workspace-members-collapsed', isMembersCollapsed.toString());
    } catch (e) {}
  }, [isMembersCollapsed]);

  // Helper to record activity history events dynamically in DB & LocalStorage
  const recordHistoryLog = async (type, title, details) => {
    const newLog = {
      id: `h-${Date.now()}`,
      type,
      title,
      details,
      user: currentUser.name || 'Maryam Shaikh',
      timestamp: new Date().toISOString()
    };

    try {
      const savedKey = `ct-workspace-history-${wsId}`;
      const existing = JSON.parse(localStorage.getItem(savedKey) || '[]');
      localStorage.setItem(savedKey, JSON.stringify([newLog, ...existing]));
    } catch (e) {}

    if (token && wsId && wsId !== 'demo-workspace') {
      try {
        await axios.post(`http://localhost:5000/api/workspaces/${wsId}/history`, {
          type,
          title,
          details,
          user: currentUser.name || 'Maryam Shaikh'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('History log DB post error:', err.message);
      }
    }
  };

  // New File & Folder Handlers
  const handleCreateFile = (e) => {
    if (e) e.preventDefault();
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    const ext = name.split('.').pop().toLowerCase();
    let iconColor = 'text-yellow-400';
    if (ext === 'css') iconColor = 'text-sky-400';
    else if (ext === 'json') iconColor = 'text-emerald-400';
    else if (ext === 'md') iconColor = 'text-purple-400';
    else if (ext === 'ts' || ext === 'tsx' || ext === 'jsx') iconColor = 'text-cyan-400';

    const starterContent = getStarterBoilerplate(name);
    const starterLanguage = getMonacoLanguage(name);
    const newFileObj = { id: name, name, iconColor, isFolder: false };
    setCustomFiles(prev => [...prev, newFileObj]);
    setFilesContent(prev => ({
      ...prev,
      [name]: starterContent
    }));
    setCurrentWorkspace(previous => ({
      ...(previous || {}),
      files: [...(previous?.files || []), { id: name, name, language: starterLanguage, content: starterContent }]
    }));
    if (token && wsId !== 'demo-workspace') {
      axios.patch(`http://localhost:5000/api/workspaces/${wsId}`, {
        files: [...(currentWorkspace?.files || []), { id: name, name, language: starterLanguage, content: starterContent }]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => console.warn('Shared file update failed:', err.message));
    }
    setActiveFile(name);
    setNewFileName('');
    setShowNewFileInput(false);

    recordHistoryLog('file', `File Created: ${name}`, `File "${name}" added to workspace file tree.`);
  };

  const handleCreateFolder = (e) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    const newFolderObj = { id: name, name, iconColor: 'text-purple-400', isFolder: true };
    setCustomFiles(prev => [...prev, newFolderObj]);
    setNewFolderName('');
    setShowNewFolderInput(false);

    recordHistoryLog('file', `Folder Created: ${name}`, `Directory "${name}" created in workspace structure.`);
  };

  // Persistent Session Start Timestamp
  const sessionStartRef = useRef(null);
  if (!sessionStartRef.current) {
    try {
      const saved = localStorage.getItem(`ct-workspace-session-start-${wsId}`);
      if (saved) {
        sessionStartRef.current = parseInt(saved, 10);
      } else {
        const now = Date.now();
        localStorage.setItem(`ct-workspace-session-start-${wsId}`, now.toString());
        sessionStartRef.current = now;
      }
    } catch (e) {
      sessionStartRef.current = Date.now();
    }
  }

  const [sessionSeconds, setSessionSeconds] = useState(() => {
    try {
      return Math.max(0, Math.floor((Date.now() - sessionStartRef.current) / 1000));
    } catch (e) {
      return 0;
    }
  });

  const [isSessionRunning, setIsSessionRunning] = useState(() => {
    try {
      const saved = localStorage.getItem(`ct-workspace-session-running-${wsId}`);
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`ct-workspace-session-running-${wsId}`, isSessionRunning.toString());
    } catch (e) {}
  }, [isSessionRunning, wsId]);

  const [autoSaveStatus, setAutoSaveStatus] = useState('Auto-saved just now');
  const [copiedCode, setCopiedCode] = useState(false);

  // Workspace Session Management State
  const [mySession, setMySession] = useState(null);
  const [activeSessions, setActiveSessions] = useState([
    {
      _id: 's1',
      userId: { _id: currentUser.id || 'u1', name: currentUser.name || 'Maryam Shaikh', role: 'admin' },
      status: 'online',
      currentFileId: 'index.js',
      role: 'admin',
      lastActiveAt: new Date()
    },
    {
      _id: 's2',
      userId: { _id: 'u2', name: 'Alex Johnson', role: 'editor' },
      status: 'online',
      currentFileId: 'server.js',
      role: 'editor',
      lastActiveAt: new Date()
    },
    {
      _id: 's3',
      userId: { _id: 'u3', name: 'Sarah Chen', role: 'editor' },
      status: 'away',
      currentFileId: 'styles.css',
      role: 'editor',
      lastActiveAt: new Date(Date.now() - 6 * 60 * 1000)
    },
    {
      _id: 's4',
      userId: { _id: 'u4', name: 'Meet Patel', role: 'viewer' },
      status: 'offline',
      currentFileId: null,
      role: 'viewer',
      leftAt: new Date(Date.now() - 30 * 60 * 1000)
    }
  ]);
  const socketRef = useRef(null);

  // 1. Live Session Duration Timer (Accurate timestamp delta calculation)
  useEffect(() => {
    if (!isSessionRunning || !sessionStartRef.current) return;
    const startTime = sessionStartRef.current;

    // Immediate sync on load/refresh
    setSessionSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));

    const timer = setInterval(() => {
      setSessionSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [isSessionRunning, wsId]);

  const formatSessionTime = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  // 2. Room Code Copying
  const wsCode = activeWorkspace?.roomCode || activeWorkspace?.inviteCode || 'CT-EDMAV8';
  const handleCopyCode = () => {
    navigator.clipboard.writeText(wsCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 3. Workspace Session Lifecycle (REST + Socket.IO Presence Engine)
  useEffect(() => {
    if (!token) return;

    // A. Start / Enter Session via REST API
    const enterSession = async () => {
      try {
        const res = await axios.post(`http://localhost:5000/api/workspaces/${wsId}/session`, {
          role: activeWorkspace?.role || 'editor',
          currentFileId: activeFile
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.session) {
          setMySession(res.data.session);
        }
      } catch (err) {
        console.warn('Session start via REST failed:', err.message);
      }
    };

    // B. Fetch All Active Workspace Sessions via REST
    const fetchWorkspaceSessions = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/workspaces/${wsId}/session/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.sessions && res.data.sessions.length > 0) {
          setActiveSessions(res.data.sessions);
        }
      } catch (err) {
        console.warn('Fetch workspace sessions failed:', err.message);
      }
    };

    enterSession();
    fetchWorkspaceSessions();

    // C. Initialize Socket.IO Real-Time Presence
    try {
      const socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        reconnection: true
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Socket.IO] Connected to presence server:', socket.id);
        socket.emit('joinWorkspace', {
          workspaceId: wsId,
          user: currentUser,
          currentFileId: activeFile
        });
      });

      socket.on('presenceUpdate', ({ sessions }) => {
        if (sessions && sessions.length > 0) {
          setActiveSessions(sessions);
        }
      });

      socket.on('fileOpened', ({ userId, fileId }) => {
        setActiveSessions(prev => prev.map(s => {
          const sUid = s.userId?._id || s.userId?.id || s.userId;
          if (sUid === userId) {
            return { ...s, currentFileId: fileId, lastActiveAt: new Date() };
          }
          return s;
        }));
      });

      // Real-time Collaborative Code Synchronization (CT-85)
      socket.on('code_updated', ({ workspaceId, fileId, content }) => {
        if (workspaceId && workspaceId !== wsId) return;
        if (!fileId) return;

        // 1. Update in-memory file content map
        setFilesContent(prev => ({
          ...prev,
          [fileId]: content
        }));

        // 2. Keep workspace file list in sync
        setCurrentWorkspace(prev => {
          if (!prev) return prev;
          const baseFiles = (prev.files && prev.files.length > 0) ? prev.files : DEFAULT_WORKSPACE_FILES;
          const fileIndex = baseFiles.findIndex(f => (f.name || f.id) === fileId);
          let updatedFiles;
          if (fileIndex >= 0) {
            updatedFiles = baseFiles.map((f, i) => i === fileIndex ? { ...f, content } : f);
          } else {
            updatedFiles = [...baseFiles, { id: fileId, name: fileId, language: getMonacoLanguage(fileId), content }];
          }
          return { ...prev, files: updatedFiles };
        });

        // 3. If currently viewing this file in Monaco, apply remote update while preserving local cursor & selection
        if (fileId === activeFileRef.current && editorRef.current) {
          const editor = editorRef.current;
          const model = editor.getModel();
          if (model && model.getValue() !== content) {
            // Capture local user's current cursor, selection, and viewport scroll position
            const currentSelection = editor.getSelection();
            const currentPosition = editor.getPosition();
            const scrollTop = editor.getScrollTop();
            const scrollLeft = editor.getScrollLeft();

            isRemoteUpdateRef.current = true;
            try {
              // Apply remote edits without disposing model or recreating view
              editor.executeEdits('remote-sync', [{
                range: model.getFullModelRange(),
                text: content,
                forceMoveMarkers: true
              }]);

              // Restore cursor and selection, safely clamped to valid boundaries in updated document
              if (currentSelection && !currentSelection.isEmpty()) {
                const lineCount = model.getLineCount();
                const startLine = Math.min(Math.max(1, currentSelection.selectionStartLineNumber || 1), lineCount);
                const startCol = Math.min(Math.max(1, currentSelection.selectionStartColumn || 1), model.getLineMaxColumn(startLine));
                const endLine = Math.min(Math.max(1, currentSelection.positionLineNumber || 1), lineCount);
                const endCol = Math.min(Math.max(1, currentSelection.positionColumn || 1), model.getLineMaxColumn(endLine));

                editor.setSelection({
                  selectionStartLineNumber: startLine,
                  selectionStartColumn: startCol,
                  positionLineNumber: endLine,
                  positionColumn: endCol
                });
              } else if (currentPosition) {
                const lineCount = model.getLineCount();
                const validLine = Math.min(Math.max(1, currentPosition.lineNumber || 1), lineCount);
                const maxCol = model.getLineMaxColumn(validLine);
                const validCol = Math.min(Math.max(1, currentPosition.column || 1), maxCol);

                editor.setPosition({ lineNumber: validLine, column: validCol });
              }

              // Preserve scroll position so viewport doesn't jump
              if (typeof scrollTop === 'number') {
                editor.setScrollTop(scrollTop);
              }
              if (typeof scrollLeft === 'number') {
                editor.setScrollLeft(scrollLeft);
              }
            } finally {
              isRemoteUpdateRef.current = false;
            }
          }
        }
      });

    } catch (err) {
      console.warn('Socket.IO connection error:', err.message);
    }

    // D. 30-Second Activity Heartbeat Ping
    const heartbeatInterval = setInterval(async () => {
      try {
        await axios.patch(`http://localhost:5000/api/workspaces/${wsId}/session/activity`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAutoSaveStatus('Session synced');
        setTimeout(() => setAutoSaveStatus('Auto-saved just now'), 3000);

        if (socketRef.current) {
          socketRef.current.emit('activityUpdate', {
            workspaceId: wsId,
            userId: currentUser.id || currentUser._id
          });
        }
      } catch (err) {
        console.warn('Heartbeat ping failed:', err.message);
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      if (socketRef.current) {
        socketRef.current.emit('leaveWorkspace', {
          workspaceId: wsId,
          userId: currentUser.id || currentUser._id
        });
        socketRef.current.disconnect();
      }
    };
  }, [wsId]);

  // Window Close / Unload Event Handler (Records session duration in local history)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const startTime = sessionStartRef.current || Date.now();
      const durationSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      const hrs = Math.floor(durationSec / 3600);
      const mins = Math.floor((durationSec % 3600) / 60);
      const secs = durationSec % 60;
      const padMin = mins < 10 ? `0${mins}` : `${mins}`;
      const padSec = secs < 10 ? `0${secs}` : `${secs}`;
      const durationStr = `${hrs}h ${padMin}m ${padSec}s`;

      const endLog = {
        id: `h-${Date.now()}`,
        type: 'session-end',
        title: 'Session Completed',
        details: `Workspace session completed after ${durationStr}.`,
        user: currentUser.name || 'Maryam Shaikh',
        timestamp: new Date().toISOString(),
        sessionDuration: durationStr
      };

      try {
        const savedKey = `ct-workspace-history-${wsId}`;
        const existing = JSON.parse(localStorage.getItem(savedKey) || '[]');
        localStorage.setItem(savedKey, JSON.stringify([endLog, ...existing]));
      } catch (e) {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [wsId, currentUser.name]);

  // 4. File Switch Handler (Updates Session `currentFileId`)
  const handleSelectFile = async (fileId) => {
    // Flush any pending debounced auto-save immediately before switching files (CT-88)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      triggerAutoSave();
    }

    setActiveFile(fileId);
    if (!token) return;

    try {
      await axios.patch(`http://localhost:5000/api/workspaces/${wsId}/session/file`, {
        fileId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (socketRef.current) {
        socketRef.current.emit('fileOpened', {
          workspaceId: wsId,
          userId: currentUser.id || currentUser._id,
          fileId
        });
      }
    } catch (err) {
      console.warn('File update failed:', err.message);
    }
  };

  // 5. Leave Workspace Handler (Ends Session & Stores Duration)
  const handleLeaveWorkspace = async () => {
    const startTime = sessionStartRef.current || Date.now();
    const durationSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    const hrs = Math.floor(durationSec / 3600);
    const mins = Math.floor((durationSec % 3600) / 60);
    const secs = durationSec % 60;
    const padMin = mins < 10 ? `0${mins}` : `${mins}`;
    const padSec = secs < 10 ? `0${secs}` : `${secs}`;
    const durationStr = `${hrs}h ${padMin}m ${padSec}s`;

    const endLog = {
      id: `h-${Date.now()}`,
      type: 'session-end',
      title: 'Session Completed',
      details: `Workspace session completed after ${durationStr}.`,
      user: currentUser.name || 'Maryam Shaikh',
      timestamp: new Date().toISOString(),
      sessionDuration: durationStr
    };

    try {
      const savedKey = `ct-workspace-history-${wsId}`;
      const existing = JSON.parse(localStorage.getItem(savedKey) || '[]');
      localStorage.setItem(savedKey, JSON.stringify([endLog, ...existing]));
    } catch (e) {}

    if (token && wsId && wsId !== 'demo-workspace') {
      try {
        await axios.post(`http://localhost:5000/api/workspaces/${wsId}/history`, endLog, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await axios.delete(`http://localhost:5000/api/workspaces/${wsId}/session`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Leave session error:', err.message);
      }
    }

    try {
      localStorage.removeItem(`ct-workspace-session-start-${wsId}`);
      localStorage.removeItem(`ct-workspace-session-sec-${wsId}`);
      localStorage.removeItem(`ct-workspace-session-running-${wsId}`);
      localStorage.removeItem(`ct-workspace-active-file-${wsId}`);
      localStorage.removeItem(`ct-workspace-files-${wsId}`);
    } catch (e) {}

    if (socketRef.current) {
      socketRef.current.emit('leaveWorkspace', {
        workspaceId: wsId,
        userId: currentUser.id || currentUser._id
      });
      socketRef.current.disconnect();
    }

    if (onBackToHome) onBackToHome();
  };

  const wsTitle = currentWorkspace?.title || currentWorkspace?.name || 'Project Workspace';
  const wsFiles = (currentWorkspace?.files && currentWorkspace.files.length > 0) 
    ? currentWorkspace.files.map(f => ({ id: f.name || f.id, name: f.name, iconColor: 'text-yellow-400' }))
    : [
        { id: 'index.js', name: 'index.js', iconColor: 'text-yellow-400' },
        { id: 'server.js', name: 'server.js', iconColor: 'text-cyan-400' },
        { id: 'styles.css', name: 'styles.css', iconColor: 'text-sky-400' },
        { id: 'package.json', name: 'package.json', iconColor: 'text-emerald-400' },
        { id: 'README.md', name: 'README.md', iconColor: 'text-purple-400' }
      ];

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-[#08090E] text-white">
      
      {/* Workspace Session Top Navbar (STUCK AT TOP AS PRIMARY WORKSPACE NAVBAR) */}
      <header 
        className="sticky top-0 z-50 w-full bg-[#12131F]/95 backdrop-blur-2xl border-b border-white/15 shadow-xl flex items-center justify-between flex-wrap shrink-0"
        style={{ padding: '12px 28px', minHeight: '64px', gap: '16px' }}
      >
        {/* Left: Back to Home + Workspace Title + Room Code */}
        <div className="flex items-center flex-wrap" style={{ gap: '16px' }}>
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center text-xs font-mono font-bold text-gray-200 hover:text-white bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
              style={{ padding: '8px 16px', gap: '8px' }}
              title="Return to Home Dashboard"
            >
              <ArrowLeft size={15} className="text-purple-400" />
              <span>Back to Home</span>
            </button>
          )}

          {onBackToHome && <div className="h-5 w-[1px] bg-white/15 hidden sm:block" />}

          <div className="flex items-center" style={{ gap: '10px' }}>
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center" style={{ gap: '8px' }}>
              <span>{wsTitle}</span>
            </h3>
          </div>

          {/* Room Code Badge */}
          <button 
            type="button"
            className="flex items-center text-xs font-mono font-semibold text-gray-200 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-xl transition-all cursor-pointer shadow-md hover:scale-[1.02]"
            style={{ padding: '8px 16px', gap: '8px' }}
            onClick={handleCopyCode}
            title="Click to copy room code"
          >
            <KeyRound size={14} className="text-purple-400" />
            <span>Room: <strong className="text-white font-bold">{wsCode}</strong></span>
            {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-gray-400" />}
          </button>
        </div>

        {/* Center Info: Session Clock & Auto-Save */}
        <div className="hidden lg:flex items-center flex-wrap" style={{ gap: '16px' }}>
          <div className="flex items-center text-xs font-mono text-gray-200 bg-white/[0.08] border border-white/15 rounded-xl shadow-sm" style={{ padding: '8px 16px', gap: '8px' }}>
            <Clock size={14} className="text-purple-400" />
            <span>Session Time: <strong className="text-white font-bold">{formatSessionTime(sessionSeconds)}</strong></span>
          </div>

          <div className="flex items-center text-xs font-mono text-gray-300 bg-white/[0.08] border border-white/15 rounded-xl shadow-sm" style={{ padding: '8px 16px', gap: '8px' }}>
            <Save size={14} className="text-emerald-400" />
            <span>{autoSaveStatus}</span>
          </div>

          {currentWorkspace?.settings?.isPublic ? (
            <span className="text-xs font-mono text-cyan-300 bg-cyan-500/20 border border-cyan-500/35 rounded-xl flex items-center shadow-sm" style={{ padding: '8px 14px', gap: '6px' }}><Globe size={14} /> Public</span>
          ) : (
            <span className="text-xs font-mono text-purple-200 bg-purple-500/20 border border-purple-500/35 rounded-xl flex items-center shadow-sm" style={{ padding: '8px 14px', gap: '6px' }}><Lock size={14} /> Private</span>
          )}
        </div>

        {/* Right Actions: Start / Record Session & Leave Session Controls */}
        <div className="flex items-center" style={{ gap: '14px' }}>
          {isSessionRunning ? (
            <button
              type="button"
              onClick={() => setIsSessionRunning(false)}
              className="flex items-center bg-emerald-500/20 hover:bg-amber-500/25 border border-emerald-500/40 hover:border-amber-500/40 text-emerald-300 hover:text-amber-300 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md hover:scale-[1.02]"
              style={{ padding: '10px 22px', gap: '10px' }}
              title="Click to pause session timer"
            >
              <Zap size={15} className="text-emerald-400 animate-pulse" />
              <span>Recording Active</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSessionRunning(true)}
              className="flex items-center bg-purple-500/20 hover:bg-purple-500/35 border border-purple-500/40 text-purple-300 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md hover:scale-[1.02]"
              style={{ padding: '10px 22px', gap: '10px' }}
              title="Click to start session duration timer"
            >
              <Clock size={15} className="text-purple-400" />
              <span>Start Session</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center bg-white/10 hover:bg-purple-500/25 border border-white/15 hover:border-purple-500/40 text-gray-200 hover:text-white rounded-full text-xs font-bold transition-all cursor-pointer shadow-md hover:scale-[1.02]"
            style={{ padding: '10px 22px', gap: '10px' }}
            title="Workspace Settings & History Log"
          >
            <Settings size={15} className="text-purple-400" />
            <span>Settings</span>
          </button>

          <button
            type="button"
            className="flex items-center bg-red-500/25 hover:bg-red-500/35 border border-red-500/50 text-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xl hover:scale-[1.03]"
            style={{ padding: '8px 20px', gap: '8px' }}
            onClick={handleLeaveWorkspace}
            title="Leave this workspace session"
          >
            <LogOut size={14} />
            <span>Leave Session</span>
          </button>
        </div>
      </header>

      {/* Main Workspace View Container (FULL WIDTH & FLUSH DIRECTLY BELOW NAVBAR) */}
      <section 
        id="modular-workspace" 
        className="w-full flex-1 min-h-0 flex flex-col justify-start overflow-hidden bg-[#0D0E15]"
      >
        {/* IDE Split View (100% FULL SCREEN WIDTH & HEIGHT) */}
        <div 
          className="flex flex-col md:flex-row w-full flex-1 min-h-0 overflow-hidden bg-[#0D0E15]"
        >
          
          {/* LEFT SIDEBAR: File Explorer & Active Members List (FIXED TO SIDE, NO OUTER SCROLL) */}
          <div 
            className="w-full md:w-72 lg:w-80 shrink-0 border-r border-white/15 bg-[#12131F] flex flex-col justify-between overflow-hidden select-none h-full"
          >
            
            {/* Top Explorer Section (Flex grow & Scrollable for all files) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Explorer Header */}
              <div 
                className="border-b border-white/15 flex items-center justify-between bg-white/[0.03] shrink-0"
                style={{ height: '48px', paddingLeft: '20px', paddingRight: '20px' }}
              >
                <span className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2.5">
                  <Folder size={15} className="text-purple-400" />
                  <span>Explorer</span>
                </span>
                <div className="flex items-center gap-2 text-gray-400">
                  {canEditFiles && <button
                    type="button"
                    onClick={() => {
                      setShowNewFileInput(prev => !prev);
                      setShowNewFolderInput(false);
                    }}
                    className="hover:text-purple-300 transition-all p-1 rounded-lg hover:bg-white/10"
                    title="Create New File"
                  >
                    <FilePlus size={15} />
                  </button>}
                  {canEditFiles && <button
                    type="button"
                    onClick={() => {
                      setShowNewFolderInput(prev => !prev);
                      setShowNewFileInput(false);
                    }}
                    className="hover:text-purple-300 transition-all p-1 rounded-lg hover:bg-white/10"
                    title="Create New Folder"
                  >
                    <FolderPlus size={15} />
                  </button>}
                </div>
              </div>

              {/* File List Tree (VS CODE / ANTIGRAVITY STYLE INLINE CREATION) */}
              <div className="overflow-y-auto flex-1 flex flex-col" style={{ padding: '16px', gap: '8px' }}>
                
                {/* VS Code / Antigravity Style Inline New File Row */}
                {showNewFileInput && (
                  <form 
                    onSubmit={handleCreateFile} 
                    className="w-full flex items-center justify-between rounded-xl bg-[#0D0E15] border border-purple-500/70 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-500/40 shadow-lg shrink-0 animate-fadeIn transition-all"
                    style={{ padding: '8px 12px', gap: '8px' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileCode size={16} className="text-purple-400 shrink-0" />
                      <input
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowNewFileInput(false);
                            setNewFileName('');
                          }
                        }}
                        placeholder="filename.js (Enter)"
                        autoFocus
                        className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder-gray-500 font-mono p-0"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        type="submit"
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 p-1 rounded-lg transition-all cursor-pointer"
                        title="Create File (Enter)"
                      >
                        <Check size={15} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowNewFileInput(false);
                          setNewFileName('');
                        }}
                        className="text-gray-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-all cursor-pointer"
                        title="Cancel (Esc)"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </form>
                )}

                {/* VS Code / Antigravity Style Inline New Folder Row */}
                {showNewFolderInput && (
                  <form 
                    onSubmit={handleCreateFolder} 
                    className="w-full flex items-center justify-between rounded-xl bg-[#0D0E15] border border-indigo-500/70 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-500/40 shadow-lg shrink-0 animate-fadeIn transition-all"
                    style={{ padding: '8px 12px', gap: '8px' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Folder size={16} className="text-indigo-400 shrink-0" />
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowNewFolderInput(false);
                            setNewFolderName('');
                          }
                        }}
                        placeholder="foldername (Enter)"
                        autoFocus
                        className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder-gray-500 font-mono p-0"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        type="submit"
                        className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 p-1 rounded-lg transition-all cursor-pointer"
                        title="Create Folder (Enter)"
                      >
                        <Check size={15} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        }}
                        className="text-gray-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-all cursor-pointer"
                        title="Cancel (Esc)"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </form>
                )}
                {customFiles.map((file) => {
                  const fname = file.name || file.id;
                  const isSelected = activeFile === fname;
                  const peersInFile = activeSessions.filter(s => s.status !== 'offline' && s.currentFileId === fname);

                  return (
                    <button
                      key={file.id}
                      onClick={() => !file.isFolder && handleSelectFile(fname)}
                      className={`w-full flex items-center justify-between rounded-xl text-xs font-mono transition-all text-left ${isSelected ? 'bg-purple-600/30 text-white border border-purple-500/50 font-semibold shadow-md' : 'text-gray-400 hover:text-gray-100 hover:bg-white/[0.07] border border-transparent'}`}
                      style={{ padding: '10px 16px' }}
                    >
                      <div className="flex items-center gap-3 truncate min-w-0 pr-2">
                        {file.isFolder ? (
                          <Folder size={15} className="shrink-0 text-purple-400" />
                        ) : (
                          <FileCode size={15} className={`shrink-0 ${file.iconColor || 'text-yellow-400'}`} />
                        )}
                        <span className="truncate text-xs font-medium">{fname}</span>
                      </div>

                      {/* Peer indicator badge next to file */}
                      {peersInFile.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {peersInFile.map((p, pidx) => (
                            <span 
                              key={pidx}
                              className="w-5 h-5 rounded-full bg-purple-500 text-white font-mono text-[10px] font-bold flex items-center justify-center border border-[#12131F] shadow-sm"
                              title={`${p.userId?.name || 'Peer'} is viewing ${fname}`}
                            >
                              {(p.userId?.name || 'P')[0].toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SIDEBAR BOTTOM: Active Session Members Panel (PROPER SPACING & COLLAPSIBLE TOGGLE) */}
            <div 
              className="border-t border-white/15 bg-[#0E0F17] flex flex-col shrink-0 transition-all"
            >
              <button
                type="button"
                onClick={() => setIsMembersCollapsed(prev => !prev)}
                className="w-full flex items-center justify-between cursor-pointer select-none hover:bg-white/[0.05] transition-all border-b border-white/5"
                style={{ padding: '16px 20px' }}
                title={isMembersCollapsed ? "Click to expand session members" : "Click to collapse session members"}
              >
                <div className="flex items-center" style={{ gap: '10px' }}>
                  <Users size={16} className="text-purple-400 shrink-0" />
                  <span className="text-xs font-mono font-bold text-purple-200 uppercase tracking-wider truncate">
                    Session Members
                  </span>
                  <span className="min-w-[24px] h-[22px] px-2.5 flex items-center justify-center rounded-full text-xs font-mono font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40 shrink-0">
                    {activeSessions.length}
                  </span>

                  {/* Overlapping mini avatar stack when collapsed */}
                  {isMembersCollapsed && (
                    <div className="hidden sm:flex items-center -space-x-2 ml-2 shrink-0">
                      {activeSessions.slice(0, 3).map((s, sidx) => (
                        <span 
                          key={sidx}
                          className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 via-indigo-600 to-cyan-500 text-white text-[10px] font-mono font-bold flex items-center justify-center border-2 border-[#0E0F17] shadow-sm"
                          title={s.userId?.name || 'Member'}
                        >
                          {(s.userId?.name || 'U')[0].toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center text-purple-400 shrink-0 ml-3">
                  {isMembersCollapsed ? (
                    <ChevronRight size={16} className="transition-transform" />
                  ) : (
                    <ChevronDown size={16} className="transition-transform" />
                  )}
                </div>
              </button>

              {!isMembersCollapsed && (
                <div className="flex flex-col max-h-56 overflow-y-auto" style={{ padding: '16px 20px', gap: '10px' }}>
                  {activeSessions.map((session, idx) => {
                    const uName = session.userId?.name || `User ${idx + 1}`;
                    const isMe = (session.userId?._id || session.userId?.id || session.userId) === (currentUser.id || currentUser._id);
                    const statusColor = session.status === 'online' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]' : session.status === 'away' ? 'bg-amber-400' : 'bg-gray-500';

                    return (
                      <div 
                        key={session._id || idx} 
                        className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/10 hover:border-purple-500/50 hover:bg-white/[0.08] transition-all shadow-md group"
                        style={{ padding: '12px 16px' }}
                      >
                        <div className="flex items-center" style={{ gap: '14px' }}>
                          <div className="relative flex items-center justify-center shrink-0">
                            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 via-indigo-600 to-cyan-500 text-white font-mono text-xs font-bold flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                              {uName[0].toUpperCase()}
                            </span>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0E0F17] ${statusColor}`} />
                          </div>

                          <div className="min-w-0 flex flex-col" style={{ gap: '4px' }}>
                            <div className="flex items-center" style={{ gap: '8px' }}>
                              <span className="text-xs md:text-sm font-bold text-white truncate">{uName}</span>
                              {isMe && (
                                <span 
                                  className="inline-flex items-center justify-center font-mono font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 rounded-full shrink-0 shadow-sm self-center"
                                  style={{
                                    padding: '2px 10px',
                                    fontSize: '11px',
                                    lineHeight: '1.2',
                                    height: 'fit-content',
                                    width: 'fit-content',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>

                            <div className="flex items-center text-xs font-mono text-gray-400" style={{ gap: '8px' }}>
                              <span className="flex items-center gap-1.5 truncate text-purple-300 font-medium">
                                <FileCode size={13} className="text-purple-400 shrink-0" />
                                <span className="truncate">{session.currentFileId || 'index.js'}</span>
                              </span>
                              <span className="text-gray-600">•</span>
                              <span className="capitalize text-gray-400">{session.role || 'editor'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT MAIN PANEL: Code Editor Window (Fills remaining width & height) */}
          <div className="flex-1 flex flex-col bg-[#0D0E15] min-w-0 h-full">
            
            {/* Top Editor Window Header (Tabs + Active Editors) */}
            <div 
              className="border-b border-white/15 flex items-center justify-between bg-[#12131F] shrink-0 overflow-hidden"
              style={{ height: '48px', paddingLeft: '20px', paddingRight: '20px', gap: '20px' }}
            >
              {/* Left Side: Window Controls + Active File Tabs */}
              <div className="flex items-center gap-4 min-w-0 overflow-x-auto no-scrollbar py-1">
                <div className="flex items-center gap-2 mr-2 shrink-0">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  {customFiles.filter(f => !f.isFolder).map((file) => {
                    const fname = file.name || file.id;
                    const isTabActive = activeFile === fname;
                    return (
                      <button 
                        key={file.id}
                        className={`rounded-t-xl text-xs font-mono flex items-center gap-2.5 border-t border-x transition-all shrink-0 ${isTabActive ? 'bg-[#0D0E15] text-white border-purple-500/50 font-semibold shadow-md' : 'bg-white/5 text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/10'}`}
                        style={{ padding: '9px 18px' }}
                        onClick={() => handleSelectFile(fname)}
                      >
                        <FileCode size={14} className={file.iconColor || 'text-yellow-400'} />
                        <span>{fname}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Peers Pills (Fixed Right Container with Border Separator) */}
              <div className="hidden lg:flex items-center gap-3 shrink-0 border-l border-white/15" style={{ paddingLeft: '20px' }}>
                <Users size={15} className="text-purple-400 shrink-0" />
                <span className="text-xs font-mono text-gray-400 shrink-0">Active Editors:</span>
                <div className="flex items-center gap-2">
                  {activeSessions.filter(s => s.status !== 'offline').map((s, idx) => {
                    const name = s.userId?.name || `Peer ${idx + 1}`;
                    const color = idx % 3 === 0 ? '#EC4899' : idx % 3 === 1 ? '#38BDF8' : '#10B981';
                    return (
                      <div 
                        key={s._id || idx} 
                        className="rounded-full border text-xs font-mono flex items-center gap-2 shrink-0 bg-white/[0.04]"
                        style={{ padding: '6px 14px', borderColor: color, color: color }}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span>{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Monaco Code Editor Canvas */}
            <div className="flex-1 min-h-0 w-full relative bg-[#0D0E15] overflow-hidden">
              <Editor
                key={activeFile}
                height="100%"
                width="100%"
                path={activeFile}
                language={getMonacoLanguage(activeFile)}
                theme="vs-dark"
                value={getActiveFileContent()}
                onChange={handleEditorChange}
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
                options={{
                  fontSize: 14,
                  fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
                  fontLigatures: true,
                  minimap: { enabled: true, side: 'right' },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  readOnly: !canEditFiles,
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  padding: { top: 14, bottom: 14 }
                }}
              />
            </div>

            {/* IDE Bottom Status Bar */}
            <div 
              className="border-t border-white/15 flex items-center justify-between text-xs font-mono text-gray-400 bg-[#090A10] shrink-0 flex-wrap"
              style={{ height: '44px', paddingLeft: '20px', paddingRight: '20px', gap: '24px' }}
            >
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <GitCommit size={14} className="text-purple-400 shrink-0" />
                  <span>Branch: <strong className="text-gray-200">main</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Code2 size={14} className="text-cyan-400 shrink-0" />
                  <span>Active File: <strong className="text-white font-bold">{activeFile}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400 shrink-0" />
                  <span>Sync Latency: <strong className="text-gray-200">12ms</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                  <span>Workspace Session Engine Active</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* WORKSPACE SETTINGS & HISTORY MODAL */}
      <WorkspaceSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        workspace={currentWorkspace}
        onUpdateWorkspace={(updatedWs) => {
          setCurrentWorkspace(updatedWs);
        }}
        customFiles={customFiles}
      />
    </div>
  );
};

export default ModularWorkspace;
