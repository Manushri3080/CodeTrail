import React, { useState } from 'react';
import { Layers, Users, ShieldCheck, Zap, GitCommit, FileCode } from 'lucide-react';

export function ModularWorkspace() {
  const [activeFile, setActiveFile] = useState('index.js');

  const activeUsers = [
    { name: 'Dev 1', color: '#EC4899', cursor: 'L12:C14' },
    { name: 'Dev 2', color: '#38BDF8', cursor: 'L18:C4' },
    { name: 'Peer 3', color: '#10B981', cursor: 'L24:C9' },
    { name: 'Peer 4', color: '#F59E0B', cursor: 'L31:C2' }
  ];

  return (
    <section id="modular-workspace" className="ct-section ct-workspace-section">
      <div className="ct-container">
        
        {/* Section Header */}
        <div className="ct-section-header">
          <span className="ct-demo-badge">REAL-TIME EDITOR</span>
          <h2 className="ct-section-title">Shared Collaborative Workspace</h2>
          <p className="ct-section-subtitle">
            Simultaneous multi-user code editing with live cursor presence and instant operational synchronization.
          </p>
        </div>

        {/* IDE Preview Card */}
        <div className="ct-ide-card">
          
          {/* Top IDE Bar */}
          <div className="ct-ide-topbar">
            <div className="ct-ide-files">
              <button 
                className={`ct-ide-tab ${activeFile === 'index.js' ? 'active' : ''}`}
                onClick={() => setActiveFile('index.js')}
              >
                <FileCode size={14} className="text-yellow-400" />
                <span>index.js</span>
              </button>
              <button 
                className={`ct-ide-tab ${activeFile === 'server.js' ? 'active' : ''}`}
                onClick={() => setActiveFile('server.js')}
              >
                <FileCode size={14} className="text-blue-400" />
                <span>server.js</span>
              </button>
            </div>

            {/* Active Peers Pills */}
            <div className="ct-ide-peers">
              <Users size={14} className="ct-peers-icon" />
              <span>4 Peers Active:</span>
              <div className="ct-peer-badges">
                {activeUsers.map((user, idx) => (
                  <span 
                    key={idx} 
                    className="ct-peer-badge"
                    style={{ borderColor: user.color, color: user.color }}
                  >
                    ● {user.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* IDE Editor View Mock */}
          <div className="ct-ide-body">
            <div className="ct-ide-line-numbers">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="ct-line-num">{i + 1}</div>
              ))}
            </div>

            <div className="ct-ide-code-content">
              <div className="ct-code-line">
                <span className="ct-token-keyword">import</span> &#123; Server &#125; <span className="ct-token-keyword">from</span> <span className="ct-token-string">'socket.io'</span>;
              </div>
              <div className="ct-code-line">
                <span className="ct-token-keyword">import</span> &#123; createSha256Hash &#125; <span className="ct-token-keyword">from</span> <span className="ct-token-string">'./utils/crypto.js'</span>;
              </div>
              <div className="ct-code-line">&nbsp;</div>
              <div className="ct-code-line">
                <span className="ct-token-comment">// Initialize CodeTrail Real-Time Workspace Room</span>
              </div>
              <div className="ct-code-line">
                <span className="ct-token-keyword">const</span> io = <span className="ct-token-keyword">new</span> <span className="ct-token-fn">Server</span>(5000, &#123; cors: &#123; origin: <span className="ct-token-string">'*'</span> &#125; &#125;);
              </div>
              <div className="ct-code-line">
                io.<span className="ct-token-fn">on</span>(<span className="ct-token-string">'connection'</span>, (socket) =&gt; &#123;
              </div>
              <div className="ct-code-line indent-1">
                console.<span className="ct-token-fn">log</span>(<span className="ct-token-string">'[Peer Connected] '</span> + socket.id);
                <span className="ct-user-cursor-tag" style={{ backgroundColor: '#EC4899' }}>
                  Dev 1 editing...
                </span>
              </div>
              <div className="ct-code-line indent-1">
                socket.<span className="ct-token-fn">on</span>(<span className="ct-token-string">'code-change'</span>, (delta) =&gt; &#123;
              </div>
              <div className="ct-code-line indent-2">
                <span className="ct-token-keyword">const</span> proofHash = <span className="ct-token-fn">createSha256Hash</span>(delta);
              </div>
              <div className="ct-code-line indent-2">
                socket.broadcast.<span className="ct-token-fn">emit</span>(<span className="ct-token-string">'code-update'</span>, &#123; delta, proofHash &#125;);
                <span className="ct-user-cursor-tag" style={{ backgroundColor: '#38BDF8' }}>
                  Dev 2 typing...
                </span>
              </div>
              <div className="ct-code-line indent-1">
                &#125;);
              </div>
              <div className="ct-code-line">
                &#125;);
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
              <span>Tamper Verification Active</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

export default ModularWorkspace;
