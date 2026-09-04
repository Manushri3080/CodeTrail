import React, { useState } from 'react';
import { Users, ShieldCheck, Zap, GitCommit, FileCode, ArrowLeft, KeyRound, Globe, Lock } from 'lucide-react';
import { WORKSPACE_FILES } from '../../constants/workspace.constants';

export const ModularWorkspace = ({ activeWorkspace, onBackToHome }) => {
  const [activeFile, setActiveFile] = useState(
    activeWorkspace?.files?.[0]?.name || 'index.js'
  );

  const activePeers = [
    { name: 'Alex', color: '#EC4899', initial: 'A' },
    { name: 'Sarah', color: '#38BDF8', initial: 'S' },
    { name: 'Elena', color: '#10B981', initial: 'E' }
  ];

  const wsTitle = activeWorkspace?.title || 'Shared Collaborative Workspace';
  const wsDesc = activeWorkspace?.desc || activeWorkspace?.description || 'Simultaneous multi-user code editing with live cursor presence and instant operational synchronization.';
  const wsCode = activeWorkspace?.inviteCode || 'CT-DEMO';
  const wsFiles = (activeWorkspace?.files && activeWorkspace.files.length > 0) 
    ? activeWorkspace.files.map(f => ({ id: f.name || f.id, name: f.name, iconColor: 'text-yellow-400' }))
    : WORKSPACE_FILES;

  return (
    <section id="modular-workspace" className="ct-section ct-workspace-section">
      <div className="ct-container">
        
        {/* Section Header with Back navigation if logged in workspace */}
        <div className="ct-section-header">
          {onBackToHome && (
            <div className="ct-workspace-nav-bar mb-4">
              <button className="ct-btn-secondary" onClick={onBackToHome}>
                <ArrowLeft size={14} />
                <span>Back to Dashboard</span>
              </button>
              <div className="ct-ws-badge-group">
                <span className="ct-meta-pill">
                  <KeyRound size={12} className="text-purple-400" />
                  <span>Room: <strong className="text-white font-mono">{wsCode}</strong></span>
                </span>
                {activeWorkspace?.settings?.isPublic ? (
                  <span className="ct-meta-pill"><Globe size={12} className="text-cyan-400" /> Public</span>
                ) : (
                  <span className="ct-meta-pill"><Lock size={12} className="text-purple-400" /> Private</span>
                )}
              </div>
            </div>
          )}

          <span className="ct-demo-badge">REAL-TIME EDITOR</span>
          <h2 className="ct-section-title">{wsTitle}</h2>
          <p className="ct-section-subtitle">{wsDesc}</p>
        </div>

        {/* IDE Preview Card */}
        <div className="ct-ide-card">
          
          {/* Top IDE Window Header */}
          <div className="ct-ide-topbar">
            {/* Mac Window Dots & File Tabs */}
            <div className="ct-ide-left-controls">
              <div className="ct-ide-dots">
                <span className="ct-dot red"></span>
                <span className="ct-dot yellow"></span>
                <span className="ct-dot green"></span>
              </div>

              <div className="ct-ide-files">
                {WORKSPACE_FILES.map((file) => (
                  <button 
                    key={file.id}
                    className={`ct-ide-tab ${activeFile === file.id ? 'active' : ''}`}
                    onClick={() => setActiveFile(file.id)}
                  >
                    <FileCode size={13} className={file.iconColor} />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Peer Avatars */}
            <div className="ct-ide-peers">
              <Users size={14} className="ct-peers-icon" />
              <span className="ct-peers-label">Active Editors:</span>
              <div className="ct-peer-avatars">
                {activePeers.map((peer, idx) => (
                  <div 
                    key={idx} 
                    className="ct-peer-avatar-pill"
                    style={{ borderColor: peer.color, color: peer.color }}
                  >
                    <span className="ct-peer-status-dot" style={{ backgroundColor: peer.color }} />
                    <span>{peer.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* IDE Editor View Mock */}
          <div className="ct-ide-body">
            <div className="ct-ide-line-numbers">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="ct-line-num">{i + 1}</div>
              ))}
            </div>

            <div className="ct-ide-code-content">
              <div className="ct-code-line">
                <span className="ct-token-keyword">import</span> &#123; useCollaboration &#125; <span className="ct-token-keyword">from</span> <span className="ct-token-string">'@codetrail/react'</span>;
              </div>
              <div className="ct-code-line">
                <span className="ct-token-keyword">import</span> &#123; EditorContainer &#125; <span className="ct-token-keyword">from</span> <span className="ct-token-string">'./components/Editor'</span>;
              </div>
              <div className="ct-code-line">&nbsp;</div>
              <div className="ct-code-line">
                <span className="ct-token-comment">// Initialize Real-Time Multi-User Workspace Session</span>
              </div>
              <div className="ct-code-line">
                <span className="ct-token-keyword">export const</span> <span className="ct-token-fn">SharedWorkspace</span> = (&#123; roomId, user &#125;) =&gt; &#123;
              </div>
              <div className="ct-code-line indent-1">
                <span className="ct-token-keyword">const</span> &#123; peers, doc, status &#125; = <span className="ct-token-fn">useCollaboration</span>(&#123;
              </div>
              <div className="ct-code-line indent-2">
                roomId: <span className="ct-token-string">'room_dev_8f29'</span>,
                {/* Authentic Inline Multiplayer Cursor for Alex */}
                <span className="ct-inline-cursor">
                  <span className="ct-cursor-caret" style={{ backgroundColor: '#EC4899' }} />
                  <span className="ct-cursor-nametag" style={{ backgroundColor: '#EC4899' }}>Alex</span>
                </span>
              </div>
              <div className="ct-code-line indent-2">
                user,
              </div>
              <div className="ct-code-line indent-2">
                onSync: (snapshot) =&gt; console.<span className="ct-token-fn">log</span>(<span className="ct-token-string">'Synced'</span>, snapshot.id)
              </div>
              <div className="ct-code-line indent-1">
                &#125;);
              </div>
              <div className="ct-code-line">&nbsp;</div>
              <div className="ct-code-line indent-1">
                <span className="ct-token-keyword">return</span> (
              </div>
              <div className="ct-code-line indent-2">
                &lt;<span className="ct-token-fn">EditorContainer</span> document=&#123;doc&#125; 
                {/* Authentic Inline Multiplayer Cursor for Sarah */}
                <span className="ct-inline-cursor">
                  <span className="ct-cursor-caret" style={{ backgroundColor: '#38BDF8' }} />
                  <span className="ct-cursor-nametag" style={{ backgroundColor: '#38BDF8' }}>Sarah</span>
                </span>
                activePeers=&#123;peers&#125; /&gt;
              </div>
              <div className="ct-code-line indent-1">
                );
              </div>
              <div className="ct-code-line">
                &#125;;
              </div>
            </div>
          </div>

          {/* IDE Footer Bar */}
          <div className="ct-ide-statusbar">
            <div className="ct-status-item">
              <GitCommit size={13} />
              <span>Branch: main</span>
            </div>
            <div className="ct-status-item">
              <Zap size={13} className="text-yellow-400" />
              <span>Sync Latency: 12ms</span>
            </div>
            <div className="ct-status-item">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Activity Verification Active</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default ModularWorkspace;
