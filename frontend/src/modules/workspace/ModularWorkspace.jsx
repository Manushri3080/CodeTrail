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
  Settings,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Play,
  Terminal,
  Loader2,
  Trash2,
  Edit2
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

// Map file extension directly to clean display name & icon color badge
const getLanguageInfo = (fileName = '') => {
  const ext = fileName.split('.').pop().toLowerCase();
  const map = {
    js: { name: 'JavaScript', tag: 'JS', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' },
    jsx: { name: 'React JSX', tag: 'JSX', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' },
    ts: { name: 'TypeScript', tag: 'TS', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300' },
    tsx: { name: 'React TSX', tag: 'TSX', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300' },
    py: { name: 'Python 3', tag: 'PY', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' },
    cpp: { name: 'C++', tag: 'C++', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300' },
    c: { name: 'C', tag: 'C', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' },
    h: { name: 'C Header', tag: 'H', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300' },
    hpp: { name: 'C++ Header', tag: 'HPP', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300' },
    java: { name: 'Java', tag: 'JAVA', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300' },
    rs: { name: 'Rust', tag: 'RS', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
    go: { name: 'Go', tag: 'GO', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30 text-teal-300' },
    html: { name: 'HTML5', tag: 'HTML', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30 text-orange-300' },
    css: { name: 'CSS3', tag: 'CSS', color: 'text-sky-300', bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300' },
    json: { name: 'JSON', tag: 'JSON', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
    md: { name: 'Markdown', tag: 'MD', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300' },
    sql: { name: 'SQL', tag: 'SQL', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
    sh: { name: 'Shell / Bash', tag: 'SH', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30 text-green-300' },
    yaml: { name: 'YAML', tag: 'YAML', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30 text-red-300' },
    yml: { name: 'YAML', tag: 'YAML', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30 text-red-300' },
    xml: { name: 'XML', tag: 'XML', color: 'text-purple-300', bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300' }
  };
  return map[ext] || { name: 'Plain Text', tag: 'TXT', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30 text-gray-300' };
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

// Vibrant color palette for collaborative peers and live cursors (CT-86)
const PEER_COLORS = [
  '#EC4899', // Pink
  '#38BDF8', // Sky Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#A855F7'  // Violet
];

const getPeerColor = (userId = '', index = 0) => {
  if (!userId) return PEER_COLORS[index % PEER_COLORS.length];
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return PEER_COLORS[Math.abs(hash) % PEER_COLORS.length];
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
  const isViewer = workspaceRole === 'viewer';
  const canEditFiles = ['owner', 'admin', 'editor'].includes(workspaceRole) && !isViewer;
  const wsId = currentWorkspace?._id || currentWorkspace?.id || activeWorkspace?._id || activeWorkspace?.id || 'demo-workspace';

  // Real-time Connection Status State & Reconnect Tracking (CT-89)
  const [connectionStatus, setConnectionStatus] = useState('connected'); // 'connected' | 'reconnecting' | 'disconnected' | 'reconnected'
  const wasDisconnectedRef = useRef(false);
  const reconnectToastTimerRef = useRef(null);

  // File Version Counters to Avoid Packet Conflicts (CT-89)
  const [fileVersions, setFileVersions] = useState({});
  const fileVersionsRef = useRef({});
  useEffect(() => {
    fileVersionsRef.current = fileVersions;
  }, [fileVersions]);

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
  
  // Helper to normalize file objects with full path and parent ID attributes
  const normalizeFileItem = (f) => {
    const path = f.path || f.id || f.name || 'file.js';
    const name = f.name || path.split('/').pop() || path;
    const parts = path.split('/');
    const parentId = f.parentId !== undefined ? f.parentId : (parts.length > 1 ? parts.slice(0, -1).join('/') : null);
    const isFolder = !!f.isFolder;
    const iconColor = f.iconColor || (isFolder ? 'text-purple-400' : getLanguageInfo(name).color);
    return {
      id: path,
      name,
      path,
      parentId,
      isFolder,
      iconColor
    };
  };

  // Default workspace starter files
  const DEFAULT_WORKSPACE_FILES = [
    { id: 'index.js', name: 'index.js', path: 'index.js', parentId: null, iconColor: 'text-yellow-400', isFolder: false },
    { id: 'server.js', name: 'server.js', path: 'server.js', parentId: null, iconColor: 'text-cyan-400', isFolder: false },
    { id: 'styles.css', name: 'styles.css', path: 'styles.css', parentId: null, iconColor: 'text-sky-400', isFolder: false },
    { id: 'package.json', name: 'package.json', path: 'package.json', parentId: null, iconColor: 'text-emerald-400', isFolder: false },
    { id: 'README.md', name: 'README.md', path: 'README.md', parentId: null, iconColor: 'text-purple-400', isFolder: false }
  ];

  // Dynamic Files & Folders List State (Persisted in localStorage & synced with MongoDB)
  const [customFiles, setCustomFiles] = useState(() => {
    try {
      const saved = localStorage.getItem(`ct-workspace-files-${wsId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeFileItem);
        }
      }
    } catch (e) {}

    if (activeWorkspace?.files && activeWorkspace.files.length > 0) {
      return activeWorkspace.files.map(f => normalizeFileItem({
        id: f.path || f.name || f.id,
        name: f.name || f.id,
        path: f.path || f.name || f.id,
        isFolder: !!f.isFolder,
        parentId: f.parentId || null,
        iconColor: f.iconColor
      }));
    }
    return DEFAULT_WORKSPACE_FILES.map(normalizeFileItem);
  });

  // Fetch the authoritative latest workspace state directly from backend MongoDB on mount / wsId change
  useEffect(() => {
    let isMounted = true;
    if (!wsId || wsId === 'demo-workspace' || !token) return;

    const fetchWorkspaceFromBackend = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/workspaces/${wsId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!isMounted) return;

        const fetchedWs = res.data?.workspace;
        if (fetchedWs) {
          setCurrentWorkspace(fetchedWs);
          currentWorkspaceRef.current = fetchedWs;
          try {
            localStorage.setItem('ct-active-workspace-session', JSON.stringify(fetchedWs));
          } catch (e) {}

          if (Array.isArray(fetchedWs.files) && fetchedWs.files.length > 0) {
            const normalized = fetchedWs.files.map(f => normalizeFileItem({
              id: f.path || f.name || f.id,
              name: f.name || f.id,
              path: f.path || f.name || f.id,
              isFolder: !!f.isFolder,
              parentId: f.parentId || null,
              iconColor: f.iconColor
            }));

            setCustomFiles(normalized);
            customFilesRef.current = normalized;
            try {
              localStorage.setItem(`ct-workspace-files-${wsId}`, JSON.stringify(normalized));
            } catch (e) {}

            setFilesContent(prev => {
              const next = { ...prev };
              fetchedWs.files.forEach(f => {
                const fileKey = f.path || f.name || f.id;
                if (fileKey && f.content !== undefined) {
                  next[fileKey] = f.content;
                  if (f.name) next[f.name] = f.content;
                }
              });
              filesContentRef.current = next;
              try {
                localStorage.setItem(`ct-workspace-content-${wsId}`, JSON.stringify(next));
              } catch (e) {}
              return next;
            });
          }
        }
      } catch (err) {
        console.warn('Backend workspace fetch on mount failed:', err.message);
      }
    };

    fetchWorkspaceFromBackend();
    return () => { isMounted = false; };
  }, [wsId, token]);

  useEffect(() => {
    if (!Array.isArray(currentWorkspace?.files) || currentWorkspace.files.length === 0) return;

    const sharedFiles = currentWorkspace.files.map(f => normalizeFileItem({
      id: f.path || f.name || f.id,
      name: f.name || f.id,
      path: f.path || f.name || f.id,
      isFolder: !!f.isFolder,
      parentId: f.parentId || null,
      iconColor: f.iconColor
    }));

    setCustomFiles(sharedFiles);
    setActiveFile(previous => sharedFiles.some(file => (file.path || file.name || file.id) === previous) ? previous : (sharedFiles[0]?.path || sharedFiles[0]?.name || 'index.js'));
  }, [currentWorkspace?.files]);

  const customFilesRef = useRef(customFiles);
  useEffect(() => {
    customFilesRef.current = customFiles;
  }, [customFiles]);

  useEffect(() => {
    try {
      localStorage.setItem(`ct-workspace-files-${wsId}`, JSON.stringify(customFiles));
    } catch (e) {}
  }, [customFiles, wsId]);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const activeFileRef = useRef(activeFile);
  const isRemoteUpdateRef = useRef(false);

  // Multiplayer Peer Cursors & Selection State (CT-86)
  const [peerCursors, setPeerCursors] = useState({});
  const peerCursorsRef = useRef({});
  const remoteDecorationIdsRef = useRef([]);
  const lastCursorEmitRef = useRef(0);
  const pendingCursorTimeoutRef = useRef(null);
  const myPeerColor = getPeerColor(currentUserId, 0);

  useEffect(() => {
    peerCursorsRef.current = peerCursors;
  }, [peerCursors]);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  // Update Monaco decorations for multiplayer peer cursors & selections (CT-86)
  const updateMonacoDecorations = () => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const currentFile = activeFileRef.current;

    let dynamicCss = '';
    const newDecorations = [];

    const activePeers = Object.values(peerCursorsRef.current);
    activePeers.forEach((peer, idx) => {
      const peerUid = peer.userId || peer.user?.id || peer.user?._id;
      if (!peerUid || peerUid === currentUserId) return;

      // Only render cursor if peer is currently viewing the active file
      if (peer.fileId && peer.fileId !== currentFile) return;

      const peerName = (peer.user?.name || peer.name || `Peer ${idx + 1}`).replace(/["\\]/g, '');
      const peerColor = peer.user?.color || peer.color || getPeerColor(peerUid, idx);
      const safeId = peerUid.toString().replace(/[^a-zA-Z0-9_-]/g, '_');
      const isTopLine = (peer.position?.lineNumber || 1) <= 1;

      dynamicCss += `
        .ct-peer-cursor-${safeId} {
          border-left: 2px solid ${peerColor} !important;
        }
        .ct-peer-cursor-${safeId}::before {
          content: "${peerName}";
          background-color: ${peerColor} !important;
        }
        .ct-peer-selection-${safeId} {
          background-color: ${peerColor}33 !important;
        }
      `;

      if (peer.position && typeof peer.position.lineNumber === 'number') {
        const line = Math.max(1, peer.position.lineNumber);
        const col = Math.max(1, peer.position.column || 1);

        newDecorations.push({
          range: new monaco.Range(line, col, line, col),
          options: {
            className: `ct-monaco-remote-cursor ct-monaco-nametag ct-peer-cursor-${safeId} ${isTopLine ? 'ct-monaco-nametag-top' : ''}`,
            hoverMessage: { value: `**${peerName}** is actively editing here` },
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            zIndex: 100
          }
        });
      }

      if (peer.selection) {
        const { startLineNumber, startColumn, endLineNumber, endColumn } = peer.selection;
        if (
          startLineNumber && endLineNumber &&
          (startLineNumber !== endLineNumber || startColumn !== endColumn)
        ) {
          const sLine = Math.min(startLineNumber, endLineNumber);
          const eLine = Math.max(startLineNumber, endLineNumber);
          const sCol = startLineNumber < endLineNumber ? startColumn : (startLineNumber > endLineNumber ? endColumn : Math.min(startColumn, endColumn));
          const eCol = startLineNumber < endLineNumber ? endColumn : (startLineNumber > endLineNumber ? startColumn : Math.max(startColumn, endColumn));

          newDecorations.push({
            range: new monaco.Range(sLine, sCol, eLine, eCol),
            options: {
              className: `ct-monaco-remote-selection ct-peer-selection-${safeId}`,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              zIndex: 90
            }
          });
        }
      }
    });

    // Update dynamic stylesheet in document head
    let styleEl = document.getElementById('ct-monaco-peer-cursor-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'ct-monaco-peer-cursor-styles';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = dynamicCss;

    // Apply delta decorations to Monaco Editor
    try {
      const oldIds = remoteDecorationIdsRef.current || [];
      const newIds = editor.deltaDecorations(oldIds, newDecorations);
      remoteDecorationIdsRef.current = newIds;
    } catch (err) {
      console.warn('[Monaco] Decoration apply warning:', err);
    }
  };

  // Re-render decorations when active file or peer cursors change
  useEffect(() => {
    updateMonacoDecorations();
  }, [activeFile, peerCursors]);

  // Handle Local Cursor Movement & Emit over Socket.IO (CT-86)
  const handleLocalCursorChange = (position, selection) => {
    if (!position || !socketRef.current || !socketRef.current.connected) return;

    const send = () => {
      lastCursorEmitRef.current = Date.now();
      const payload = {
        workspaceId: wsId,
        fileId: activeFileRef.current,
        user: {
          id: currentUserId,
          name: currentUser.name || 'Maryam Shaikh',
          color: myPeerColor
        },
        position: {
          lineNumber: position.lineNumber,
          column: position.column
        },
        selection: selection && !selection.isEmpty() ? {
          startLineNumber: selection.selectionStartLineNumber,
          startColumn: selection.selectionStartColumn,
          endLineNumber: selection.positionLineNumber,
          endColumn: selection.positionColumn
        } : null
      };

      socketRef.current.emit('cursor_position_update', payload);
    };

    const now = Date.now();
    if (now - lastCursorEmitRef.current > 30) {
      send();
    } else {
      if (pendingCursorTimeoutRef.current) {
        clearTimeout(pendingCursorTimeoutRef.current);
      }
      pendingCursorTimeoutRef.current = setTimeout(send, 30);
    }
  };

  // Dedicated in-memory map storing content per file key (path-based id) with localStorage backup
  const [filesContent, setFilesContent] = useState(() => {
    const initial = {};

    // 1. Overlay from localStorage backup first (most recent local changes)
    try {
      const savedBackup = localStorage.getItem(`ct-workspace-content-${wsId}`);
      if (savedBackup) {
        const parsed = JSON.parse(savedBackup);
        if (parsed && typeof parsed === 'object') {
          Object.assign(initial, parsed);
        }
      }
    } catch (e) {}

    // 2. Overlay from activeWorkspace.files (session data from localStorage)
    //    Only fill keys not already in localStorage backup
    if (activeWorkspace?.files && Array.isArray(activeWorkspace.files)) {
      activeWorkspace.files.forEach(f => {
        const fileKey = f.id || f.path || f.name;
        if (fileKey && f.content !== undefined) {
          // Only set if not already restored from localStorage backup
          if (initial[fileKey] === undefined) {
            initial[fileKey] = f.content;
          }
          // Also store by name as secondary key for backward compat
          if (f.name && f.name !== fileKey && initial[f.name] === undefined) {
            initial[f.name] = f.content;
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
          const fileKey = f.id || f.path || f.name;
          if (fileKey && f.content !== undefined) {
            next[fileKey] = f.content;
            if (f.name) next[f.name] = f.content;
          }
        });
        filesContentRef.current = next;
        return next;
      });
    }
  }, [currentWorkspace?.files]);

  // Retrieve active file content for the active file (preserves empty string files, tries name fallback)
  const getActiveFileContent = () => {
    // Primary lookup: by canonical id/path key
    if (filesContent[activeFile] !== undefined) {
      return filesContent[activeFile];
    }
    // Fallback: by file name only (handles legacy stored content)
    const activeFileObj = customFilesRef.current?.find(f => f.id === activeFile || f.path === activeFile);
    if (activeFileObj?.name && filesContent[activeFileObj.name] !== undefined) {
      return filesContent[activeFileObj.name];
    }
    return '';
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

      const currentFilesList = (customFilesRef.current && customFilesRef.current.length > 0)
        ? customFilesRef.current
        : customFiles;

      const filesToSave = currentFilesList.map(f => {
        const fileKey = f.id || f.path || f.name;
        const fname = f.name || fileKey.split('/').pop() || fileKey;

        let latestContent = '';
        if (f.isFolder) {
          latestContent = '';
        } else if (filesContentRef.current[fileKey] !== undefined) {
          latestContent = filesContentRef.current[fileKey];
        } else if (filesContentRef.current[fname] !== undefined) {
          latestContent = filesContentRef.current[fname];
        } else if (f.content !== undefined) {
          latestContent = f.content;
        } else {
          latestContent = '';
        }

        return {
          id: fileKey,
          name: fname,
          path: f.path || fileKey,
          parentId: f.parentId || null,
          isFolder: !!f.isFolder,
          language: f.isFolder ? 'plaintext' : (f.language || getMonacoLanguage(fname)),
          iconColor: f.iconColor || (f.isFolder ? 'text-purple-400' : getLanguageInfo(fname).color),
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
        try {
          localStorage.setItem('ct-active-workspace-session', JSON.stringify(res.data.workspace));
          localStorage.setItem(`ct-workspace-files-${wsId}`, JSON.stringify(customFilesRef.current));
          localStorage.setItem(`ct-workspace-content-${wsId}`, JSON.stringify(filesContentRef.current));
        } catch (e) {}
      }
      setAutoSaveStatus('Auto-saved just now');
    } catch (err) {
      console.warn('Auto-save to backend failed:', err.message);
      setAutoSaveStatus('Saved locally (offline)');
    }
  };

  // Update local in-memory workspace file buffer when user types in Monaco
  const handleEditorChange = (newCode) => {
    // Prevent programmatic / remote updates from triggering state churn or outbound code_change
    if (isRemoteUpdateRef.current) return;

    // Guard: Viewers cannot modify code (CT-89)
    if (!canEditFiles || isViewer) {
      setAutoSaveStatus('Viewing mode: Editing disabled');
      return;
    }

    const content = newCode ?? '';

    // Increment monotonic version counter for this file (CT-89)
    const currentVer = fileVersionsRef.current[activeFile] || 0;
    const nextVer = currentVer + 1;
    fileVersionsRef.current[activeFile] = nextVer;
    setFileVersions(prev => ({
      ...prev,
      [activeFile]: nextVer
    }));

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

    // 3. Keep currentWorkspace.files synchronized (match by id or path, not name)
    setCurrentWorkspace(prev => {
      if (!prev) return prev;
      const baseFiles = (prev.files && prev.files.length > 0) ? prev.files : [];
      // Match by canonical id/path key
      const fileIndex = baseFiles.findIndex(f => (f.id || f.path || f.name) === activeFile);

      let updatedFiles;
      if (fileIndex >= 0) {
        updatedFiles = baseFiles.map((f, i) => 
          i === fileIndex ? { ...f, content, version: nextVer } : f
        );
      } else {
        // File not yet in currentWorkspace.files — add it
        const activeFileObj = customFilesRef.current?.find(f => f.id === activeFile);
        updatedFiles = [...baseFiles, {
          id: activeFile,
          name: activeFileObj?.name || activeFile.split('/').pop() || activeFile,
          path: activeFile,
          parentId: activeFileObj?.parentId || null,
          isFolder: false,
          language: getMonacoLanguage(activeFile),
          content,
          version: nextVer
        }];
      }

      const nextWs = { ...prev, files: updatedFiles };
      currentWorkspaceRef.current = nextWs;
      return nextWs;
    });

    // 4. Emit real-time code change to peers via Socket.IO with version counter (CT-85, CT-89)
    if (socketRef.current) {
      socketRef.current.emit('code_change', {
        workspaceId: wsId,
        fileId: activeFile,
        content,
        version: nextVer
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

  // Dynamic Programming Language Selection Handler
  const handleLanguageChange = (newLang) => {
    if (!activeFile) return;

    const langExtMap = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      cpp: 'cpp',
      c: 'c',
      java: 'java',
      rust: 'rs',
      go: 'go',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'md',
      sql: 'sql',
      shell: 'sh',
      yaml: 'yaml',
      xml: 'xml'
    };
    const targetExt = langExtMap[newLang] || 'js';

    // Compute target filename by swapping extension
    const dotIdx = activeFile.lastIndexOf('.');
    const baseName = dotIdx > 0 ? activeFile.substring(0, dotIdx) : activeFile;
    const targetFileName = `${baseName}.${targetExt}`;

    const iconColorMap = {
      javascript: 'text-yellow-400',
      typescript: 'text-sky-400',
      python: 'text-cyan-400',
      cpp: 'text-blue-400',
      c: 'text-indigo-400',
      java: 'text-rose-400',
      rust: 'text-amber-500',
      go: 'text-teal-400',
      html: 'text-orange-500',
      css: 'text-sky-300',
      json: 'text-emerald-400',
      markdown: 'text-purple-400',
      sql: 'text-amber-300',
      shell: 'text-green-400',
      yaml: 'text-red-400',
      xml: 'text-purple-300'
    };
    const iconColor = iconColorMap[newLang] || 'text-purple-400';

    const oldContent = filesContentRef.current[activeFile] || getStarterBoilerplate(activeFile);
    const oldDefault = getStarterBoilerplate(activeFile);
    const isDefaultContent = !oldContent || oldContent.trim() === '' || oldContent.trim() === oldDefault.trim();
    const newContent = isDefaultContent ? getStarterBoilerplate(targetFileName) : oldContent;

    // Update files tree state
    setCustomFiles(prev => prev.map(f => (f.name === activeFile || f.id === activeFile) ? { ...f, id: targetFileName, name: targetFileName, iconColor } : f));

    // Update in-memory files content map
    const updatedContentMap = { ...filesContentRef.current };
    delete updatedContentMap[activeFile];
    updatedContentMap[targetFileName] = newContent;
    filesContentRef.current = updatedContentMap;
    setFilesContent(updatedContentMap);

    // Update active file
    setActiveFile(targetFileName);
    activeFileRef.current = targetFileName;

    // Dynamically update Monaco Editor language model
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, newLang);
      }
    }

    // Broadcast language change to Socket.IO room peers
    if (socketRef.current) {
      socketRef.current.emit('language_change', {
        workspaceId: wsId,
        fileId: targetFileName,
        language: newLang
      });
    }

    recordHistoryLog('language', `Language Switched: ${newLang.toUpperCase()}`, `Active file syntax changed to ${newLang} ("${targetFileName}").`);
  };

  // ── Toast Notification System ──────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const showToast = (message, type = 'success', duration = 3500) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  // ── VS Code Style File Explorer State & Tree Handlers ──────────────────────
  const [expandedFolders, setExpandedFolders] = useState(() => ({}));
  const [selectedItem, setSelectedItem] = useState(null); // ID of active/selected tree item
  const [targetFolderId, setTargetFolderId] = useState(null); // Parent ID for inline creation
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFileId, setRenamingFileId] = useState(null);
  const [renamingFileName, setRenamingFileName] = useState('');

  // Right-click Floating Context Menu State
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });

  // Drag and Drop Moving State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  // Close context menu when clicking anywhere on the window
  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu({ visible: false, x: 0, y: 0, item: null });
    };
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Folder Expansion Toggles
  const toggleFolder = (folderId, e) => {
    if (e) e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const collapseAllFolders = () => {
    setExpandedFolders({});
  };

  // Open Context Menu (Right Click)
  const handleContextMenu = (e, item = null) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItem(item ? item.id : null);
    setContextMenu({
      visible: true,
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 260),
      item
    });
  };

  // 1. Create File Handler (Root or inside target folder)
  const handleCreateFile = (e) => {
    if (e) e.preventDefault();
    const cleanName = newFileName.trim();
    if (!cleanName) return;

    const parentFolder = customFiles.find(f => f.isFolder && (f.id === targetFolderId || f.path === targetFolderId));
    const parentPath = parentFolder ? parentFolder.path : null;
    const fullPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;

    if (customFiles.some(f => f.id === fullPath || f.path === fullPath)) {
      showToast(`File "${fullPath}" already exists.`, 'error');
      return;
    }

    const iconColor = getLanguageInfo(cleanName).color;
    const newFileObj = normalizeFileItem({
      id: fullPath,
      name: cleanName,
      path: fullPath,
      parentId: parentFolder ? parentFolder.id : null,
      isFolder: false,
      iconColor
    });

    const updatedFiles = [...customFiles, newFileObj];
    setCustomFiles(updatedFiles);
    customFilesRef.current = updatedFiles;

    const boilerplate = getStarterBoilerplate(cleanName);
    filesContentRef.current = { ...filesContentRef.current, [fullPath]: boilerplate };
    setFilesContent(prev => ({ ...prev, [fullPath]: boilerplate }));

    if (parentFolder) {
      setExpandedFolders(prev => ({ ...prev, [parentFolder.id]: true }));
    }

    setActiveFile(fullPath);
    activeFileRef.current = fullPath;
    setShowNewFileInput(false);
    setNewFileName('');
    setTargetFolderId(null);

    if (socketRef.current) {
      socketRef.current.emit('file_created', { workspaceId: wsId, file: newFileObj });
      socketRef.current.emit('files_updated', { workspaceId: wsId, files: updatedFiles });
    }

    showToast(`📄 Created ${cleanName}`, 'success');
    triggerAutoSave();
    recordHistoryLog('file', `File Created: ${cleanName}`, `Created workspace file ${fullPath}.`);
  };

  // 2. Create Folder Handler (Root or inside target folder)
  const handleCreateFolder = (e) => {
    if (e) e.preventDefault();
    const cleanName = newFolderName.trim();
    if (!cleanName) return;

    const parentFolder = customFiles.find(f => f.isFolder && (f.id === targetFolderId || f.path === targetFolderId));
    const parentPath = parentFolder ? parentFolder.path : null;
    const fullPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;

    if (customFiles.some(f => f.id === fullPath || f.path === fullPath)) {
      showToast(`Folder "${fullPath}" already exists.`, 'error');
      return;
    }

    const newFolderObj = normalizeFileItem({
      id: fullPath,
      name: cleanName,
      path: fullPath,
      parentId: parentFolder ? parentFolder.id : null,
      isFolder: true,
      iconColor: 'text-purple-400'
    });

    const updatedFiles = [...customFiles, newFolderObj];
    setCustomFiles(updatedFiles);
    customFilesRef.current = updatedFiles;

    setExpandedFolders(prev => ({
      ...prev,
      ...(parentFolder ? { [parentFolder.id]: true } : {}),
      [fullPath]: true
    }));

    setShowNewFolderInput(false);
    setNewFolderName('');
    setTargetFolderId(null);

    if (socketRef.current) {
      socketRef.current.emit('files_updated', { workspaceId: wsId, files: updatedFiles });
    }

    showToast(`📁 Created folder ${cleanName}`, 'success');
    triggerAutoSave();
    recordHistoryLog('file', `Folder Created: ${cleanName}`, `Created folder ${fullPath}.`);
  };

  // 3. Rename Handler (File or Folder with path cascading)
  const handleRenameSubmit = (itemToRename, e) => {
    if (e) e.preventDefault();
    const oldId = itemToRename.id || itemToRename.path;
    const cleanName = renamingFileName.trim();

    if (!cleanName || cleanName === itemToRename.name) {
      setRenamingFileId(null);
      setRenamingFileName('');
      return;
    }

    const parentFolder = customFiles.find(f => f.isFolder && f.id === itemToRename.parentId);
    const parentPath = parentFolder ? parentFolder.path : null;
    const newPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;

    if (customFiles.some(f => f.id !== oldId && (f.id === newPath || f.path === newPath))) {
      showToast(`An item named "${cleanName}" already exists.`, 'error');
      return;
    }

    let updatedFiles = [];
    if (itemToRename.isFolder) {
      const prefixOld = oldId + '/';
      const prefixNew = newPath + '/';

      updatedFiles = customFiles.map(f => {
        if (f.id === oldId) {
          return normalizeFileItem({ ...f, id: newPath, name: cleanName, path: newPath });
        }
        if (f.id.startsWith(prefixOld) || f.path?.startsWith(prefixOld)) {
          const subPath = f.path.substring(prefixOld.length);
          const updatedPath = prefixNew + subPath;
          const updatedParentId = f.parentId === oldId ? newPath : (f.parentId?.startsWith(prefixOld) ? prefixNew + f.parentId.substring(prefixOld.length) : f.parentId);
          return normalizeFileItem({ ...f, id: updatedPath, path: updatedPath, parentId: updatedParentId });
        }
        if (f.parentId === oldId) {
          return normalizeFileItem({ ...f, parentId: newPath });
        }
        return f;
      });

      // Cascading update for content map
      const updatedContentMap = { ...filesContentRef.current };
      Object.keys(updatedContentMap).forEach(key => {
        if (key === oldId || key.startsWith(prefixOld)) {
          const newKey = key === oldId ? newPath : prefixNew + key.substring(prefixOld.length);
          updatedContentMap[newKey] = updatedContentMap[key];
          delete updatedContentMap[key];
        }
      });
      filesContentRef.current = updatedContentMap;
      setFilesContent(updatedContentMap);

      if (activeFileRef.current && (activeFileRef.current === oldId || activeFileRef.current.startsWith(prefixOld))) {
        const newActive = activeFileRef.current === oldId ? newPath : prefixNew + activeFileRef.current.substring(prefixOld.length);
        setActiveFile(newActive);
        activeFileRef.current = newActive;
      }

      setExpandedFolders(prev => {
        const next = { ...prev };
        if (next[oldId]) {
          next[newPath] = true;
          delete next[oldId];
        }
        Object.keys(next).forEach(k => {
          if (k.startsWith(prefixOld)) {
            const newK = prefixNew + k.substring(prefixOld.length);
            next[newK] = next[k];
            delete next[k];
          }
        });
        return next;
      });

      if (socketRef.current) {
        socketRef.current.emit('files_updated', { workspaceId: wsId, files: updatedFiles });
      }

      showToast(`📁 Renamed folder ${itemToRename.name} → ${cleanName}`, 'success');
    } else {
      const iconColor = getLanguageInfo(cleanName).color;
      updatedFiles = customFiles.map(f => f.id === oldId ? normalizeFileItem({ ...f, id: newPath, name: cleanName, path: newPath, iconColor }) : f);

      const updatedContentMap = { ...filesContentRef.current };
      const content = updatedContentMap[oldId] !== undefined ? updatedContentMap[oldId] : getStarterBoilerplate(oldId);
      delete updatedContentMap[oldId];
      updatedContentMap[newPath] = content;
      filesContentRef.current = updatedContentMap;
      setFilesContent(updatedContentMap);

      if (activeFileRef.current === oldId) {
        setActiveFile(newPath);
        activeFileRef.current = newPath;
      }

      if (socketRef.current) {
        socketRef.current.emit('file_renamed', { workspaceId: wsId, oldFileId: oldId, newFileId: newPath });
        socketRef.current.emit('files_updated', { workspaceId: wsId, files: updatedFiles });
      }

      showToast(`✏️ Renamed ${itemToRename.name} → ${cleanName}`, 'success');
    }

    setCustomFiles(updatedFiles);
    customFilesRef.current = updatedFiles;
    setRenamingFileId(null);
    setRenamingFileName('');
    triggerAutoSave();
    recordHistoryLog('file', `Renamed: ${itemToRename.name} -> ${cleanName}`, `Renamed ${oldId} to ${newPath}.`);
  };

  // 4. Delete Handler (Recursive for folders)
  const handleDeleteItem = (itemToDelete, e) => {
    if (e) e.stopPropagation();
    const targetId = itemToDelete.id || itemToDelete.path;

    if (customFiles.length <= 1) {
      showToast('Cannot delete the last item in the workspace.', 'error');
      return;
    }

    if (!window.confirm(`Delete ${itemToDelete.isFolder ? 'folder' : 'file'} "${itemToDelete.name}"${itemToDelete.isFolder ? ' and all its contents' : ''}?`)) return;

    let idsToDelete = [];
    if (itemToDelete.isFolder) {
      const prefix = targetId + '/';
      idsToDelete = customFiles.filter(f => f.id === targetId || f.id.startsWith(prefix) || f.path?.startsWith(prefix)).map(f => f.id);
    } else {
      idsToDelete = [targetId];
    }

    const updatedFiles = customFiles.filter(f => !idsToDelete.includes(f.id));
    setCustomFiles(updatedFiles);
    customFilesRef.current = updatedFiles;

    const updatedContentMap = { ...filesContentRef.current };
    idsToDelete.forEach(id => delete updatedContentMap[id]);
    filesContentRef.current = updatedContentMap;
    setFilesContent(updatedContentMap);

    if (idsToDelete.includes(activeFileRef.current)) {
      const remainingFile = updatedFiles.find(f => !f.isFolder);
      const nextActive = remainingFile ? remainingFile.id : 'index.js';
      setActiveFile(nextActive);
      activeFileRef.current = nextActive;
    }

    if (socketRef.current) {
      if (!itemToDelete.isFolder) {
        socketRef.current.emit('file_deleted', { workspaceId: wsId, fileId: targetId });
      }
      socketRef.current.emit('files_updated', { workspaceId: wsId, files: updatedFiles });
    }

    showToast(`🗑 Deleted "${itemToDelete.name}"`, 'warning');
    triggerAutoSave();
    recordHistoryLog('file', `Deleted: ${itemToDelete.name}`, `Removed ${targetId} from workspace.`);
  };

  // 5. Duplicate File Handler
  const handleDuplicateFile = (fileItem, e) => {
    if (e) e.stopPropagation();
    if (fileItem.isFolder) return;

    const oldId = fileItem.id;
    const parts = fileItem.name.split('.');
    let newName;
    if (parts.length > 1) {
      const ext = parts.pop();
      newName = `${parts.join('.')}_copy.${ext}`;
    } else {
      newName = `${fileItem.name}_copy`;
    }

    const parentFolder = customFiles.find(f => f.isFolder && f.id === fileItem.parentId);
    const parentPath = parentFolder ? parentFolder.path : null;
    let newPath = parentPath ? `${parentPath}/${newName}` : newName;

    if (customFiles.some(f => f.id === newPath)) {
      newName = `${fileItem.name}_copy_${Date.now().toString().slice(-4)}`;
      newPath = parentPath ? `${parentPath}/${newName}` : newName;
    }

    const iconColor = getLanguageInfo(newName).color;
    const newFileObj = normalizeFileItem({
      id: newPath,
      name: newName,
      path: newPath,
      parentId: fileItem.parentId || null,
      isFolder: false,
      iconColor
    });

    const existingContent = filesContentRef.current[oldId] !== undefined ? filesContentRef.current[oldId] : getStarterBoilerplate(oldId);
    const updatedFiles = [...customFiles, newFileObj];

    setCustomFiles(updatedFiles);
    customFilesRef.current = updatedFiles;
    filesContentRef.current = { ...filesContentRef.current, [newPath]: existingContent };
    setFilesContent(prev => ({ ...prev, [newPath]: existingContent }));

    setActiveFile(newPath);
    activeFileRef.current = newPath;

    if (socketRef.current) {
      socketRef.current.emit('file_created', { workspaceId: wsId, file: newFileObj });
      socketRef.current.emit('files_updated', { workspaceId: wsId, files: updatedFiles });
    }

    showToast(`📋 Duplicated ${fileItem.name} → ${newName}`, 'success');
    triggerAutoSave();
  };

  // 6. Drag & Drop Move Handler
  const handleDragStart = (e, item) => {
    e.stopPropagation();
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;
    if (targetFolder && (draggedItem.id === targetFolder.id || targetFolder.path.startsWith(draggedItem.id + '/'))) {
      return;
    }
    setDragOverFolderId(targetFolder ? targetFolder.id : 'root');
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    if (!draggedItem) return;

    const itemToMove = draggedItem;
    setDraggedItem(null);

    const newParentId = targetFolder ? targetFolder.id : null;
    if (itemToMove.parentId === newParentId) return;

    if (targetFolder && (itemToMove.id === targetFolder.id || targetFolder.path.startsWith(itemToMove.id + '/'))) {
      showToast('Cannot move a folder into itself.', 'error');
      return;
    }

    const oldId = itemToMove.id;
    const newParentPath = targetFolder ? targetFolder.path : null;
    const newPath = newParentPath ? `${newParentPath}/${itemToMove.name}` : itemToMove.name;

    if (customFiles.some(f => f.id !== oldId && f.id === newPath)) {
      showToast(`Item "${itemToMove.name}" already exists in ${targetFolder ? targetFolder.name : 'root'}.`, 'error');
      return;
    }

    let updatedFiles = [];
    if (itemToMove.isFolder) {
      const prefixOld = oldId + '/';
      const prefixNew = newPath + '/';

      updatedFiles = customFiles.map(f => {
        if (f.id === oldId) {
          return normalizeFileItem({ ...f, id: newPath, path: newPath, parentId: newParentId });
        }
        if (f.id.startsWith(prefixOld)) {
          const subPath = f.path.substring(prefixOld.length);
          const updatedPath = prefixNew + subPath;
          const updatedParentId = f.parentId === oldId ? newPath : (f.parentId?.startsWith(prefixOld) ? prefixNew + f.parentId.substring(prefixOld.length) : f.parentId);
          return normalizeFileItem({ ...f, id: updatedPath, path: updatedPath, parentId: updatedParentId });
        }
        return f;
      });

      const updatedContentMap = { ...filesContentRef.current };
      Object.keys(updatedContentMap).forEach(key => {
        if (key.startsWith(prefixOld)) {
          const newKey = prefixNew + key.substring(prefixOld.length);
          updatedContentMap[newKey] = updatedContentMap[key];
          delete updatedContentMap[key];
        }
      });
      filesContentRef.current = updatedContentMap;
      setFilesContent(updatedContentMap);

      if (activeFileRef.current && activeFileRef.current.startsWith(prefixOld)) {
        const newActive = prefixNew + activeFileRef.current.substring(prefixOld.length);
        setActiveFile(newActive);
        activeFileRef.current = newActive;
      }
    } else {
      updatedFiles = customFiles.map(f => f.id === oldId ? normalizeFileItem({ ...f, id: newPath, path: newPath, parentId: newParentId }) : f);

      const updatedContentMap = { ...filesContentRef.current };
      const content = updatedContentMap[oldId] !== undefined ? updatedContentMap[oldId] : getStarterBoilerplate(oldId);
      delete updatedContentMap[oldId];
      updatedContentMap[newPath] = content;
      filesContentRef.current = updatedContentMap;
      setFilesContent(updatedContentMap);

      if (activeFileRef.current === oldId) {
        setActiveFile(newPath);
        activeFileRef.current = newPath;
      }
    }

    setCustomFiles(updatedFiles);
    customFilesRef.current = updatedFiles;
    if (targetFolder) {
      setExpandedFolders(prev => ({ ...prev, [targetFolder.id]: true }));
    }

    if (socketRef.current) {
      socketRef.current.emit('files_updated', { workspaceId: wsId, files: updatedFiles });
    }

    showToast(`🚚 Moved "${itemToMove.name}" to ${targetFolder ? targetFolder.name : 'root'}`, 'success');
    triggerAutoSave();
  };

  // 7. Keyboard Shortcuts Handler for File Explorer
  const handleExplorerKeyDown = (e) => {
    if (showNewFileInput || showNewFolderInput || renamingFileId) return;

    if (e.key === 'F2' && selectedItem) {
      e.preventDefault();
      const item = customFiles.find(f => f.id === selectedItem);
      if (item) {
        setRenamingFileId(item.id);
        setRenamingFileName(item.name);
      }
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItem) {
      e.preventDefault();
      const item = customFiles.find(f => f.id === selectedItem);
      if (item) {
        handleDeleteItem(item, e);
      }
    }
  };

  // Helper to compute visible tree rows with depth indentation
  const getVisibleTreeItems = () => {
    const fileMap = new Map();
    customFiles.forEach(f => fileMap.set(f.id, f));

    const getChildren = (pId) => {
      const children = customFiles.filter(f => (f.parentId || null) === pId);
      children.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
      return children;
    };

    const visibleList = [];
    const traverse = (pId, depth = 0) => {
      const children = getChildren(pId);
      children.forEach(item => {
        visibleList.push({ ...item, depth });
        if (item.isFolder && expandedFolders[item.id]) {
          traverse(item.id, depth + 1);
        }
      });
    };

    traverse(null, 0);

    // If there are orphan items whose parentId is invalid, append at root
    const renderedIds = new Set(visibleList.map(i => i.id));
    customFiles.forEach(f => {
      if (!renderedIds.has(f.id)) {
        visibleList.push({ ...f, depth: 0 });
      }
    });

    return visibleList;
  };

  // Live Code Execution State
  const [isExecuting, setIsExecuting] = useState(false);

  const handleRunActiveCode = async () => {
    if (!activeFile || isExecuting) return;

    // Folders can't be run
    const activeFileObj = customFiles.find(f => f.id === activeFile);
    if (activeFileObj?.isFolder) {
      showToast('📁 Cannot run a folder — select a file first.', 'warning');
      return;
    }

    setIsExecuting(true);
    showToast(`▶ Running ${activeFile}...`, 'info', 20000); // long-lived until resolved

    try {
      const codeToRun = getActiveFileContent();
      const language = getMonacoLanguage(activeFile);

      if (!codeToRun || codeToRun.trim() === '') {
        setToasts(prev => prev.filter(t => !t.message.startsWith('▶ Running')));
        showToast(`📄 ${activeFile} is empty — nothing to run.`, 'warning');
        return;
      }

      const response = await axios.post('http://localhost:5000/api/execute', {
        language,
        code: codeToRun,
        filename: activeFile
      });

      const data = response.data;
      const exitCode = data.exitCode ?? 0;
      const stdout = (data.stdout || '').trim();
      const stderr = (data.stderr || '').trim();

      setToasts(prev => prev.filter(t => !t.message.startsWith('▶ Running')));

      if (exitCode === 0) {
        const preview = stdout ? ` → ${stdout.substring(0, 80)}${stdout.length > 80 ? '…' : ''}` : '';
        showToast(`✅ ${activeFile} ran successfully (exit 0)${preview}`, 'success', 5000);
      } else {
        const errPreview = stderr
          ? stderr.split('\n')[0].substring(0, 100)
          : (stdout ? stdout.split('\n')[0].substring(0, 100) : `Exit code ${exitCode}`);
        showToast(`⚠️ ${activeFile} failed (exit ${exitCode}): ${errPreview}`, 'error', 7000);
      }

      recordHistoryLog('execution', `Code Executed: ${activeFile}`, `Ran ${activeFile} (${language}) — exit code ${exitCode}.`);

    } catch (err) {
      console.error('Execution Failed:', err);
      setToasts(prev => prev.filter(t => !t.message.startsWith('▶ Running')));

      // Build a clear, actionable error message
      let errMsg = '';
      if (!err.response) {
        errMsg = 'Cannot reach execution server. Make sure the backend is running on port 5000.';
      } else if (err.response?.status === 400) {
        errMsg = err.response.data?.message || 'Invalid code or unsupported language.';
      } else if (err.response?.status === 503) {
        errMsg = 'Execution service is unavailable. Try again in a moment.';
      } else {
        errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown execution error.';
      }

      showToast(`✗ ${errMsg}`, 'error', 7000);
      recordHistoryLog('execution', `Execution Error: ${activeFile}`, `Failed to run ${activeFile}: ${errMsg}`);
    } finally {
      setIsExecuting(false);
    }
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

  // Reconnection State Sync Handler (CT-89)
  const syncWorkspaceState = async () => {
    if (!wsId || wsId === 'demo-workspace' || !token) return;
    try {
      // 1. Fetch latest workspace details and files from backend
      const res = await axios.get(`http://localhost:5000/api/workspaces/${wsId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.workspace) {
        const latestWs = res.data.workspace;
        setCurrentWorkspace(latestWs);
        currentWorkspaceRef.current = latestWs;

        if (Array.isArray(latestWs.files) && latestWs.files.length > 0) {
          setFilesContent(prev => {
            const next = { ...prev };
            latestWs.files.forEach(f => {
              const fname = f.name || f.id;
              if (fname && f.content !== undefined) {
                // If this file is currently open in Monaco and model content differs, sync smoothly
                if (fname === activeFileRef.current && editorRef.current) {
                  const editor = editorRef.current;
                  const model = editor.getModel();
                  if (model && model.getValue() !== f.content) {
                    const sel = editor.getSelection();
                    const pos = editor.getPosition();
                    isRemoteUpdateRef.current = true;
                    try {
                      editor.executeEdits('reconnect-sync', [{
                        range: model.getFullModelRange(),
                        text: f.content,
                        forceMoveMarkers: true
                      }]);
                      if (sel && !sel.isEmpty()) editor.setSelection(sel);
                      else if (pos) editor.setPosition(pos);
                    } finally {
                      isRemoteUpdateRef.current = false;
                    }
                  }
                }
                next[fname] = f.content;
                if (typeof f.version === 'number') {
                  fileVersionsRef.current[fname] = Math.max(fileVersionsRef.current[fname] || 0, f.version);
                }
              }
            });
            filesContentRef.current = next;
            return next;
          });
        }
      }

      // 2. Fetch latest active sessions
      const sessionRes = await axios.get(`http://localhost:5000/api/workspaces/${wsId}/session/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sessionRes.data?.sessions && sessionRes.data.sessions.length > 0) {
        setActiveSessions(sessionRes.data.sessions);
      }
    } catch (syncErr) {
      console.warn('[Sync] State sync after reconnect failed:', syncErr.message);
    }
  };

  // Browser Network Drop / Online Detection (CT-89)
  useEffect(() => {
    const handleOffline = () => {
      wasDisconnectedRef.current = true;
      setConnectionStatus('disconnected');
    };
    const handleOnline = () => {
      setConnectionStatus('reconnecting');
      if (socketRef.current) {
        if (!socketRef.current.connected) {
          socketRef.current.connect();
        } else {
          syncWorkspaceState();
        }
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [wsId]);

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
          currentFileId: activeFileRef.current,
          role: workspaceRole
        });

        if (wasDisconnectedRef.current) {
          setConnectionStatus('reconnected');
          syncWorkspaceState();

          if (reconnectToastTimerRef.current) clearTimeout(reconnectToastTimerRef.current);
          reconnectToastTimerRef.current = setTimeout(() => {
            setConnectionStatus('connected');
            wasDisconnectedRef.current = false;
          }, 3000);
        } else {
          setConnectionStatus('connected');
        }
      });

      socket.on('disconnect', (reason) => {
        console.warn('[Socket.IO] Disconnected:', reason);
        wasDisconnectedRef.current = true;
        if (reason !== 'io client disconnect') {
          setConnectionStatus('reconnecting');
        }
      });

      socket.on('connect_error', () => {
        wasDisconnectedRef.current = true;
        setConnectionStatus('reconnecting');
      });

      socket.io.on('reconnect_attempt', () => {
        wasDisconnectedRef.current = true;
        setConnectionStatus('reconnecting');
      });

      socket.io.on('reconnect_failed', () => {
        wasDisconnectedRef.current = true;
        setConnectionStatus('disconnected');
      });

      socket.on('code_change_error', ({ message }) => {
        console.warn('[Socket Guard Alert]:', message);
        setAutoSaveStatus(message || 'Viewing mode: Editing disabled');
      });

      socket.on('code_conflict', ({ fileId, serverVersion, message }) => {
        console.warn('[Socket Conflict]:', message, 'for file', fileId, 'server version:', serverVersion);
        if (typeof serverVersion === 'number') {
          fileVersionsRef.current[fileId] = serverVersion;
          setFileVersions(prev => ({ ...prev, [fileId]: serverVersion }));
        }
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

        if (userId && peerCursorsRef.current[userId]) {
          setPeerCursors(prev => {
            const next = {
              ...prev,
              [userId]: {
                ...prev[userId],
                fileId
              }
            };
            peerCursorsRef.current = next;
            return next;
          });
        }
      });

      // Real-time Multiplayer Monaco Cursor Tracking (CT-86)
      const handleRemoteCursor = (data) => {
        if (!data) return;
        const peerUid = data.userId || data.user?.id || data.user?._id;
        if (!peerUid || peerUid === currentUserId) return;

        setPeerCursors(prev => {
          const next = {
            ...prev,
            [peerUid]: {
              ...data,
              userId: peerUid,
              lastUpdatedAt: Date.now()
            }
          };
          peerCursorsRef.current = next;
          return next;
        });
      };

      socket.on('cursor_position_updated', handleRemoteCursor);
      socket.on('cursor_updated', handleRemoteCursor);

      socket.on('userLeft', ({ userId }) => {
        if (!userId) return;
        setPeerCursors(prev => {
          const next = { ...prev };
          delete next[userId];
          peerCursorsRef.current = next;
          return next;
        });
      });

      // Real-time Collaborative Code Synchronization with Version Counter (CT-85, CT-89)
      socket.on('code_updated', ({ workspaceId, fileId, content, version }) => {
        if (workspaceId && workspaceId !== wsId) return;
        if (!fileId) return;

        // Version counter check to avoid packet conflicts (CT-89)
        const currentVer = fileVersionsRef.current[fileId] || 0;
        if (typeof version === 'number') {
          if (version < currentVer) {
            console.warn(`[Version Control] Dropping stale packet for ${fileId}. Incoming (${version}) < local (${currentVer})`);
            return;
          }
          fileVersionsRef.current[fileId] = version;
          setFileVersions(prev => ({ ...prev, [fileId]: version }));
        }

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
            updatedFiles = baseFiles.map((f, i) => i === fileIndex ? { ...f, content, version: version || f.version } : f);
          } else {
            updatedFiles = [...baseFiles, { id: fileId, name: fileId, language: getMonacoLanguage(fileId), content, version: version || 1 }];
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

      // Real-time Collaborative Language Change Listener
      socket.on('language_updated', ({ fileId, language }) => {
        if (!fileId || !language) return;

        if (editorRef.current && monacoRef.current && activeFileRef.current === fileId) {
          const model = editorRef.current.getModel();
          if (model) {
            monacoRef.current.editor.setModelLanguage(model, language);
          }
        }
      });

      // Real-time Collaborative File Operation Listeners
      socket.on('file_created', ({ file }) => {
        if (!file) return;
        const normFile = normalizeFileItem(file);
        setCustomFiles(prev => {
          if (prev.some(f => f.id === normFile.id)) return prev;
          return [...prev, normFile];
        });
        const fname = normFile.id;
        if (!normFile.isFolder && filesContentRef.current[fname] === undefined) {
          const boilerplate = getStarterBoilerplate(normFile.name);
          filesContentRef.current = { ...filesContentRef.current, [fname]: boilerplate };
          setFilesContent(prev => ({ ...prev, [fname]: boilerplate }));
        }
      });

      socket.on('file_deleted', ({ fileId }) => {
        if (!fileId) return;
        setCustomFiles(prev => prev.filter(f => f.id !== fileId && !f.id.startsWith(fileId + '/')));
        const updatedContent = { ...filesContentRef.current };
        delete updatedContent[fileId];
        Object.keys(updatedContent).forEach(k => {
          if (k.startsWith(fileId + '/')) delete updatedContent[k];
        });
        filesContentRef.current = updatedContent;
        setFilesContent(updatedContent);

        if (activeFileRef.current === fileId || activeFileRef.current.startsWith(fileId + '/')) {
          setCustomFiles(latest => {
            const next = latest.find(f => !f.isFolder)?.id || 'index.js';
            setActiveFile(next);
            activeFileRef.current = next;
            return latest;
          });
        }
      });

      socket.on('file_renamed', ({ oldFileId, newFileId }) => {
        if (!oldFileId || !newFileId) return;
        setCustomFiles(prev => prev.map(f => (f.id === oldFileId || f.path === oldFileId) ? normalizeFileItem({ ...f, id: newFileId, path: newFileId, name: newFileId.split('/').pop() }) : f));

        const updatedContentMap = { ...filesContentRef.current };
        const content = updatedContentMap[oldFileId] !== undefined ? updatedContentMap[oldFileId] : getStarterBoilerplate(oldFileId);
        delete updatedContentMap[oldFileId];
        updatedContentMap[newFileId] = content;
        filesContentRef.current = updatedContentMap;
        setFilesContent(updatedContentMap);

        if (activeFileRef.current === oldFileId) {
          setActiveFile(newFileId);
          activeFileRef.current = newFileId;
        }
      });

      socket.on('files_updated', ({ files }) => {
        if (!files || !Array.isArray(files)) return;
        const normalized = files.map(normalizeFileItem);
        setCustomFiles(normalized);

        setFilesContent(prev => {
          const next = { ...prev };
          normalized.forEach(f => {
            if (!f.isFolder && next[f.id] === undefined) {
              next[f.id] = getStarterBoilerplate(f.name);
            }
          });
          filesContentRef.current = next;
          return next;
        });

        if (!normalized.some(f => f.id === activeFileRef.current)) {
          const nextActive = normalized.find(f => !f.isFolder)?.id || 'index.js';
          setActiveFile(nextActive);
          activeFileRef.current = nextActive;
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

          {/* Viewer Mode Badge (CT-89) */}
          {isViewer && (
            <div className="flex items-center text-xs font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 rounded-xl shadow-sm animate-pulse" style={{ padding: '8px 14px', gap: '6px' }} title="Viewer Mode: You have read-only access to this workspace. Code editing is locked.">
              <Lock size={14} className="text-amber-400" />
              <span>Viewer (Read-Only)</span>
            </div>
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

          {/* Run Code Button */}
          <button
            type="button"
            onClick={handleRunActiveCode}
            disabled={isExecuting || isViewer}
            className={`flex items-center border rounded-full text-xs font-bold transition-all cursor-pointer shadow-xl hover:scale-[1.03] ${
              isExecuting
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-wait'
                : isViewer
                ? 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/40 hover:to-teal-500/40 border-emerald-500/50 hover:border-emerald-400/70 text-emerald-300 hover:text-emerald-200 shadow-[0_0_16px_rgba(52,211,153,0.25)] hover:shadow-[0_0_24px_rgba(52,211,153,0.45)]'
            }`}
            style={{ padding: '10px 22px', gap: '10px' }}
            title={isViewer ? 'Viewers cannot run code' : `Run ${activeFile} (${getLanguageInfo(activeFile).name})`}
          >
            {isExecuting ? (
              <Loader2 size={15} className="animate-spin text-emerald-400" />
            ) : (
              <Play size={15} className="text-emerald-400" />
            )}
            <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
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

      {/* Dynamic Connection Status / Reconnecting Banner (CT-89) */}
      {connectionStatus === 'reconnecting' && (
        <div className="w-full bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-amber-600/90 text-white px-6 py-2.5 flex items-center justify-between text-xs font-mono font-semibold shadow-lg backdrop-blur-md border-b border-amber-400/40 animate-pulse shrink-0 z-40">
          <div className="flex items-center gap-3">
            <RefreshCw size={15} className="animate-spin text-amber-200 shrink-0" />
            <span className="flex items-center gap-2">
              <strong className="font-extrabold uppercase tracking-wide">Reconnecting...</strong>
              <span className="hidden sm:inline text-amber-100 font-normal">Connection to collaborative session lost. Attempting to restore sync...</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (socketRef.current) socketRef.current.connect();
              syncWorkspaceState();
            }}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Retry Now
          </button>
        </div>
      )}

      {connectionStatus === 'disconnected' && (
        <div className="w-full bg-gradient-to-r from-red-600/95 via-rose-600/95 to-red-600/95 text-white px-6 py-2.5 flex items-center justify-between text-xs font-mono font-semibold shadow-lg backdrop-blur-md border-b border-red-400/40 shrink-0 z-40">
          <div className="flex items-center gap-3">
            <WifiOff size={15} className="text-red-200 shrink-0" />
            <span className="flex items-center gap-2">
              <strong className="font-extrabold uppercase tracking-wide">Disconnected</strong>
              <span className="hidden sm:inline text-red-100 font-normal">You are offline. Live changes are being saved locally to localStorage backup.</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setConnectionStatus('reconnecting');
              if (socketRef.current) socketRef.current.connect();
              syncWorkspaceState();
            }}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Reconnect
          </button>
        </div>
      )}

      {connectionStatus === 'reconnected' && (
        <div className="w-full bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-emerald-600/90 text-white px-6 py-2 flex items-center justify-between text-xs font-mono font-semibold shadow-lg backdrop-blur-md border-b border-emerald-400/40 shrink-0 z-40 transition-opacity">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={15} className="text-emerald-200 shrink-0" />
            <span><strong>Reconnected!</strong> Workspace synchronized with live peers.</span>
          </div>
        </div>
      )}

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
                <div className="flex items-center gap-1.5 text-gray-400">
                  {canEditFiles && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetFolderId(null);
                        setShowNewFileInput(prev => !prev);
                        setShowNewFolderInput(false);
                      }}
                      className="hover:text-purple-300 transition-all p-1.5 rounded-lg hover:bg-white/10"
                      title="New File (Root)"
                    >
                      <FilePlus size={15} />
                    </button>
                  )}
                  {canEditFiles && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetFolderId(null);
                        setShowNewFolderInput(prev => !prev);
                        setShowNewFileInput(false);
                      }}
                      className="hover:text-indigo-300 transition-all p-1.5 rounded-lg hover:bg-white/10"
                      title="New Folder (Root)"
                    >
                      <FolderPlus size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={collapseAllFolders}
                    className="hover:text-sky-300 transition-all p-1.5 rounded-lg hover:bg-white/10"
                    title="Collapse All Folders"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      syncWorkspaceState();
                      showToast('🔄 Resynced explorer', 'info');
                    }}
                    className="hover:text-emerald-300 transition-all p-1.5 rounded-lg hover:bg-white/10"
                    title="Refresh Explorer"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* File List Tree Container (VS Code / Antigravity Style Hierarchy & Drag-and-Drop) */}
              <div 
                className="overflow-y-auto flex-1 flex flex-col focus:outline-none select-none" 
                style={{ padding: '12px 8px', gap: '4px' }}
                tabIndex={0}
                onKeyDown={handleExplorerKeyDown}
                onContextMenu={(e) => handleContextMenu(e, null)}
                onDragOver={(e) => handleDragOver(e, null)}
                onDrop={(e) => handleDrop(e, null)}
              >
                
                {/* Inline New File Row at Root */}
                {showNewFileInput && targetFolderId === null && (
                  <form 
                    onSubmit={handleCreateFile} 
                    className="w-full flex items-center justify-between rounded-xl bg-[#0D0E15] border border-purple-500/70 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-500/40 shadow-lg shrink-0 animate-fadeIn transition-all my-1"
                    style={{ padding: '6px 10px', gap: '8px', marginLeft: '8px' }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileCode size={15} className="text-purple-400 shrink-0" />
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
                        <Check size={14} />
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
                        <X size={14} />
                      </button>
                    </div>
                  </form>
                )}

                {/* Inline New Folder Row at Root */}
                {showNewFolderInput && targetFolderId === null && (
                  <form 
                    onSubmit={handleCreateFolder} 
                    className="w-full flex items-center justify-between rounded-xl bg-[#0D0E15] border border-indigo-500/70 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-500/40 shadow-lg shrink-0 animate-fadeIn transition-all my-1"
                    style={{ padding: '6px 10px', gap: '8px', marginLeft: '8px' }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Folder size={15} className="text-indigo-400 shrink-0" />
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
                        <Check size={14} />
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
                        <X size={14} />
                      </button>
                    </div>
                  </form>
                )}

                {/* Render Visible Tree Items */}
                {getVisibleTreeItems().map((item) => {
                  const isSelected = selectedItem === item.id || activeFile === item.id;
                  const isExpanded = !!expandedFolders[item.id];
                  const isDragOver = dragOverFolderId === item.id;
                  const peersInFile = activeSessions.filter(s => s.status !== 'offline' && s.currentFileId === item.id);
                  const isRenamingThis = renamingFileId === item.id;
                  const paddingLeft = (item.depth * 14) + 12;

                  return (
                    <React.Fragment key={item.id}>
                      <div
                        draggable={canEditFiles && !isRenamingThis}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={(e) => item.isFolder && handleDragOver(e, item)}
                        onDrop={(e) => item.isFolder && handleDrop(e, item)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        onClick={(e) => {
                          setSelectedItem(item.id);
                          if (item.isFolder) {
                            toggleFolder(item.id, e);
                          } else {
                            handleSelectFile(item.id);
                          }
                        }}
                        className={`w-full flex items-center justify-between rounded-xl text-xs font-mono transition-all text-left group cursor-pointer border ${
                          isDragOver 
                            ? 'bg-purple-500/30 border-purple-400 ring-2 ring-purple-500/50' 
                            : isSelected 
                            ? 'bg-purple-600/25 text-white border-purple-500/40 font-semibold shadow-md' 
                            : 'text-gray-300 hover:text-white hover:bg-white/[0.06] border-transparent'
                        }`}
                        style={{ paddingLeft: `${paddingLeft}px`, paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px' }}
                      >
                        {/* Inline Renaming Input Form */}
                        {isRenamingThis ? (
                          <form 
                            onSubmit={(e) => handleRenameSubmit(item, e)}
                            className="flex items-center gap-2 flex-1 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={renamingFileName}
                              onChange={(e) => setRenamingFileName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setRenamingFileId(null);
                                  setRenamingFileName('');
                                }
                              }}
                              autoFocus
                              className="w-full bg-[#0D0E15] border border-purple-500/80 rounded-lg px-2 py-1 text-xs text-white outline-none font-mono focus:ring-1 focus:ring-purple-400"
                            />
                            <button type="submit" className="text-purple-400 hover:text-purple-300 p-0.5"><Check size={14} /></button>
                            <button type="button" onClick={() => setRenamingFileId(null)} className="text-gray-400 hover:text-white p-0.5"><X size={14} /></button>
                          </form>
                        ) : (
                          <>
                            {/* Left Side: Folder Chevron + Icon + Name */}
                            <div className="flex items-center gap-2 truncate min-w-0 pr-2 flex-1">
                              {item.isFolder ? (
                                <span 
                                  onClick={(e) => toggleFolder(item.id, e)} 
                                  className="text-purple-400 hover:text-white shrink-0 p-0.5"
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </span>
                              ) : (
                                <span className="w-3.5 shrink-0" />
                              )}

                              {item.isFolder ? (
                                <Folder size={15} className="shrink-0 text-purple-400" />
                              ) : (
                                <FileCode size={15} className={`shrink-0 ${item.iconColor || 'text-yellow-400'}`} />
                              )}

                              <span className="truncate text-xs font-medium">{item.name}</span>
                            </div>

                            {/* Right Side: Hover Quick Action Buttons & Peer Indicators */}
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {peersInFile.length > 0 && (
                                <div className="flex items-center gap-1 shrink-0 mr-1">
                                  {peersInFile.map((p, pidx) => (
                                    <span 
                                      key={pidx}
                                      className="w-5 h-5 rounded-full bg-purple-500 text-white font-mono text-[10px] font-bold flex items-center justify-center border border-[#12131F] shadow-sm"
                                      title={`${p.userId?.name || 'Peer'} is viewing ${item.name}`}
                                    >
                                      {(p.userId?.name || 'P')[0].toUpperCase()}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {canEditFiles && (
                                <div className="hidden group-hover:flex items-center gap-1 text-gray-400">
                                  {item.isFolder ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTargetFolderId(item.id);
                                          setShowNewFileInput(true);
                                          setShowNewFolderInput(false);
                                          setExpandedFolders(prev => ({ ...prev, [item.id]: true }));
                                        }}
                                        className="hover:text-purple-300 p-1 rounded hover:bg-white/10"
                                        title="New File inside folder"
                                      >
                                        <FilePlus size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTargetFolderId(item.id);
                                          setShowNewFolderInput(true);
                                          setShowNewFileInput(false);
                                          setExpandedFolders(prev => ({ ...prev, [item.id]: true }));
                                        }}
                                        className="hover:text-indigo-300 p-1 rounded hover:bg-white/10"
                                        title="New Folder inside folder"
                                      >
                                        <FolderPlus size={13} />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDuplicateFile(item, e)}
                                      className="hover:text-cyan-300 p-1 rounded hover:bg-white/10"
                                      title="Duplicate File"
                                    >
                                      <Copy size={13} />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRenamingFileId(item.id);
                                      setRenamingFileName(item.name);
                                    }}
                                    className="hover:text-yellow-300 p-1 rounded hover:bg-white/10"
                                    title="Rename (F2)"
                                  >
                                    <Edit2 size={13} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteItem(item, e)}
                                    className="hover:text-red-400 p-1 rounded hover:bg-white/10"
                                    title="Delete (Del)"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Inline New File / Folder inside this Folder */}
                      {item.isFolder && isExpanded && targetFolderId === item.id && showNewFileInput && (
                        <form 
                          onSubmit={handleCreateFile} 
                          className="w-full flex items-center justify-between rounded-xl bg-[#0D0E15] border border-purple-500/70 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-500/40 shadow-lg shrink-0 animate-fadeIn transition-all my-1"
                          style={{ padding: '6px 10px', gap: '8px', marginLeft: `${paddingLeft + 16}px` }}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileCode size={15} className="text-purple-400 shrink-0" />
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
                              <Check size={14} />
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
                              <X size={14} />
                            </button>
                          </div>
                        </form>
                      )}

                      {item.isFolder && isExpanded && targetFolderId === item.id && showNewFolderInput && (
                        <form 
                          onSubmit={handleCreateFolder} 
                          className="w-full flex items-center justify-between rounded-xl bg-[#0D0E15] border border-indigo-500/70 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-500/40 shadow-lg shrink-0 animate-fadeIn transition-all my-1"
                          style={{ padding: '6px 10px', gap: '8px', marginLeft: `${paddingLeft + 16}px` }}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Folder size={15} className="text-indigo-400 shrink-0" />
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
                              <Check size={14} />
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
                              <X size={14} />
                            </button>
                          </div>
                        </form>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* VS Code Floating Right-Click Context Menu */}
            {contextMenu.visible && (
              <div 
                className="fixed z-[9999] bg-[#161726]/95 border border-purple-500/30 rounded-xl shadow-2xl backdrop-blur-xl py-1.5 min-w-[190px] text-xs font-mono select-none animate-fadeIn"
                style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                onClick={(e) => e.stopPropagation()}
              >
                {contextMenu.item ? (
                  <>
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-purple-300 border-b border-white/10 truncate max-w-[210px] flex items-center gap-1.5">
                      {contextMenu.item.isFolder ? <Folder size={12} className="text-purple-400" /> : <FileCode size={12} className={contextMenu.item.iconColor} />}
                      <span className="truncate">{contextMenu.item.name}</span>
                    </div>
                    
                    {contextMenu.item.isFolder ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetFolderId(contextMenu.item.id);
                            setShowNewFileInput(true);
                            setShowNewFolderInput(false);
                            setExpandedFolders(prev => ({ ...prev, [contextMenu.item.id]: true }));
                            setContextMenu({ visible: false, x: 0, y: 0, item: null });
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-600/30 text-left transition-all cursor-pointer"
                        >
                          <FilePlus size={14} className="text-purple-400" />
                          <span>New File...</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTargetFolderId(contextMenu.item.id);
                            setShowNewFolderInput(true);
                            setShowNewFileInput(false);
                            setExpandedFolders(prev => ({ ...prev, [contextMenu.item.id]: true }));
                            setContextMenu({ visible: false, x: 0, y: 0, item: null });
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-600/30 text-left transition-all cursor-pointer"
                        >
                          <FolderPlus size={14} className="text-indigo-400" />
                          <span>New Folder...</span>
                        </button>
                        <div className="h-[1px] bg-white/10 my-1" />
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleDuplicateFile(contextMenu.item);
                          setContextMenu({ visible: false, x: 0, y: 0, item: null });
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-600/30 text-left transition-all cursor-pointer"
                      >
                        <Copy size={14} className="text-cyan-400" />
                        <span>Duplicate File</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setRenamingFileId(contextMenu.item.id);
                        setRenamingFileName(contextMenu.item.name);
                        setContextMenu({ visible: false, x: 0, y: 0, item: null });
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-600/30 text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Edit2 size={14} className="text-yellow-400" />
                        <span>Rename</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">F2</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteItem(contextMenu.item);
                        setContextMenu({ visible: false, x: 0, y: 0, item: null });
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-red-400 hover:text-red-200 hover:bg-red-500/20 text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">Del</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetFolderId(null);
                        setShowNewFileInput(true);
                        setShowNewFolderInput(false);
                        setContextMenu({ visible: false, x: 0, y: 0, item: null });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-600/30 text-left transition-all cursor-pointer"
                    >
                      <FilePlus size={14} className="text-purple-400" />
                      <span>New File in Root</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTargetFolderId(null);
                        setShowNewFolderInput(true);
                        setShowNewFileInput(false);
                        setContextMenu({ visible: false, x: 0, y: 0, item: null });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-600/30 text-left transition-all cursor-pointer"
                    >
                      <FolderPlus size={14} className="text-indigo-400" />
                      <span>New Folder in Root</span>
                    </button>

                    <div className="h-[1px] bg-white/10 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        collapseAllFolders();
                        setContextMenu({ visible: false, x: 0, y: 0, item: null });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-600/30 text-left transition-all cursor-pointer"
                    >
                      <ChevronUp size={14} className="text-sky-400" />
                      <span>Collapse All Folders</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        syncWorkspaceState();
                        showToast('🔄 Explorer refreshed', 'info');
                        setContextMenu({ visible: false, x: 0, y: 0, item: null });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-purple-600/30 text-left transition-all cursor-pointer"
                    >
                      <RefreshCw size={14} className="text-emerald-400" />
                      <span>Refresh Explorer</span>
                    </button>
                  </>
                )}
              </div>
            )}

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
                    // Always use canonical id (path-based) as the active file key
                    const isTabActive = activeFile === file.id || activeFile === file.path;
                    const displayName = file.name || file.id.split('/').pop() || file.id;
                    return (
                      <button 
                        key={file.id}
                        className={`rounded-t-xl text-xs font-mono flex items-center gap-2.5 border-t border-x transition-all shrink-0 ${isTabActive ? 'bg-[#0D0E15] text-white border-purple-500/50 font-semibold shadow-md' : 'bg-white/5 text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/10'}`}
                        style={{ padding: '9px 18px' }}
                        onClick={() => handleSelectFile(file.id)}
                      >
                        <FileCode size={14} className={file.iconColor || 'text-yellow-400'} />
                        <span>{displayName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Automatic Programming Language Indicator Badge (Derived from File Extension) */}
              {(() => {
                const langInfo = getLanguageInfo(activeFile);
                return (
                  <div 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono shrink-0 shadow-sm transition-all ml-2 ${langInfo.bg}`}
                    title={`Language: ${langInfo.name} (derived from .${activeFile.split('.').pop()})`}
                  >
                    <Code2 size={14} className={langInfo.color} />
                    <span className="font-bold">{langInfo.name}</span>
                    <span className="text-[10px] opacity-75 font-mono font-normal">(.{activeFile.split('.').pop()})</span>
                  </div>
                );
              })()}

              {/* Active Peers Pills (Fixed Right Container with Border Separator) */}
              <div className="hidden lg:flex items-center gap-3 shrink-0 border-l border-white/15" style={{ paddingLeft: '20px' }}>
                <Users size={15} className="text-purple-400 shrink-0" />
                <span className="text-xs font-mono text-gray-400 shrink-0">Active Editors:</span>
                <div className="flex items-center gap-2">
                  {isViewer && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-300 text-xs font-mono font-bold shrink-0">
                      <Lock size={12} />
                      <span>Read-Only</span>
                    </div>
                  )}
                  {activeSessions.filter(s => s.status !== 'offline').map((s, idx) => {
                    const uid = s.userId?._id || s.userId?.id || s.userId || `peer-${idx}`;
                    const name = s.userId?.name || `Peer ${idx + 1}`;
                    const color = getPeerColor(uid, idx);
                    const isMe = uid === currentUserId;
                    const peerCur = peerCursors[uid];
                    const isOnSameFile = (peerCur?.fileId === activeFile) || (s.currentFileId === activeFile);
                    const posInfo = peerCur?.position ? `Ln ${peerCur.position.lineNumber}, Col ${peerCur.position.column}` : null;

                    return (
                      <div 
                        key={s._id || idx} 
                        className="rounded-full border text-xs font-mono flex items-center gap-2 shrink-0 bg-white/[0.04] transition-all"
                        style={{ padding: '6px 14px', borderColor: color, color: color }}
                        title={`${name}${isMe ? ' (You)' : ''}${posInfo && isOnSameFile ? ` - Editing at ${posInfo}` : ''}`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: color }} />
                        <span>{name}{isMe ? ' (You)' : ''}</span>
                        {isOnSameFile && posInfo && !isMe && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-bold opacity-90">
                            {posInfo}
                          </span>
                        )}
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
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;

                  // Track cursor position in Monaco (onDidChangeCursorPosition) (CT-86)
                  editor.onDidChangeCursorPosition((e) => {
                    handleLocalCursorChange(e.position, editor.getSelection());
                  });

                  // Track cursor selection in Monaco (onDidChangeCursorSelection) (CT-86)
                  editor.onDidChangeCursorSelection((e) => {
                    handleLocalCursorChange(editor.getPosition(), e.selection);
                  });

                  // Initial decoration pass
                  updateMonacoDecorations();
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
                  readOnly: !canEditFiles || isViewer,
                  domReadOnly: !canEditFiles || isViewer,
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
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isViewer ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <span>Role: <strong className={`capitalize ${isViewer ? 'text-amber-300' : 'text-emerald-300'}`}>{workspaceRole}</strong></span>
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

      {/* ── Toast Notification Stack ──────────────────────────────────────── */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none"
        style={{ maxWidth: '360px' }}
      >
        {toasts.map(toast => {
          const styles = {
            success: 'bg-emerald-900/90 border-emerald-500/60 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.3)]',
            error:   'bg-red-900/90 border-red-500/60 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
            warning: 'bg-amber-900/90 border-amber-500/60 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
            info:    'bg-indigo-900/90 border-indigo-500/60 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.3)]',
          };
          const icons = {
            success: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
            error:   <AlertTriangle size={16} className="text-red-400 shrink-0" />,
            warning: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
            info:    <Loader2 size={16} className="text-indigo-400 shrink-0 animate-spin" />,
          };
          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl text-xs font-mono font-semibold pointer-events-auto animate-slideUp ${styles[toast.type] || styles.info}`}
            >
              {icons[toast.type] || icons.info}
              <span className="flex-1 leading-relaxed">{toast.message}</span>
              <button
                type="button"
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-current opacity-50 hover:opacity-100 transition-opacity ml-1 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModularWorkspace;
