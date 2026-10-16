import React from 'react';
import { CheckCircle2, Code2, FileCode2, FolderOpen, Play, Users } from 'lucide-react';

const previewFiles = [
  { name: 'index.js', icon: FileCode2, color: 'text-yellow-400', active: true },
  { name: 'server.js', icon: FileCode2, color: 'text-cyan-400' },
  { name: 'package.json', icon: Code2, color: 'text-emerald-400' },
  { name: 'README.md', icon: FileCode2, color: 'text-purple-400' }
];

export const WorkspacePreview = () => {
  return (
    <section id="modular-workspace" className="ct-section ct-workspace-preview-section">
      <div className="ct-container">
        <div className="ct-section-header">
          <span className="ct-demo-badge">COLLABORATIVE WORKSPACE</span>
          <h2 className="ct-section-title">A Clearer Way to Build Together</h2>
          <p className="ct-section-subtitle">
            Keep your files, teammates, and development context together in one focused workspace.
          </p>
        </div>

        <div className="ct-workspace-preview-card">
          <div className="ct-workspace-preview-topbar">
            <div className="ct-workspace-preview-brand">
              <span className="ct-preview-status-dot" />
              <span>Project Workspace</span>
              <span className="ct-preview-room-chip">Room: CT-EDMAV8</span>
            </div>

            <div className="ct-preview-collaborators">
              <Users size={14} />
              <span>3 collaborators</span>
            </div>
          </div>

          <div className="ct-workspace-preview-body">
            <aside className="ct-preview-file-panel">
              <div className="ct-preview-panel-label">
                <FolderOpen size={14} />
                <span>Explorer</span>
              </div>

              <div className="ct-preview-file-list">
                {previewFiles.map(({ name, icon: FileIcon, color, active }) => (
                  <div key={name} className={`ct-preview-file ${active ? 'active' : ''}`}>
                    <FileIcon size={15} className={color} />
                    <span>{name}</span>
                    {active && <span className="ct-preview-file-badge">M</span>}
                  </div>
                ))}
              </div>
            </aside>

            <div className="ct-preview-editor">
              <div className="ct-preview-editor-tabs">
                <div className="ct-preview-editor-tab active">
                  <FileCode2 size={14} className="text-yellow-400" />
                  <span>index.js</span>
                </div>
                <span className="ct-preview-language">JavaScript</span>
              </div>

              <div className="ct-preview-code" aria-label="Example JavaScript code">
                <div><span className="ct-code-line-number">1</span><span className="ct-code-comment">// Welcome to CodeTrail</span></div>
                <div><span className="ct-code-line-number">2</span><span><span className="ct-code-keyword">const</span> workspace = <span className="ct-code-string">'ready'</span>;</span></div>
                <div><span className="ct-code-line-number">3</span><span>console.log(<span className="ct-code-string">`Workspace ${'{'}workspace{'}'}`</span>);</span></div>
                <div><span className="ct-code-line-number">4</span><span>&nbsp;</span></div>
                <div><span className="ct-code-line-number">5</span><span className="ct-code-comment">// Share context, review changes, ship faster.</span></div>
              </div>

              <div className="ct-preview-editor-footer">
                <span><CheckCircle2 size={13} /> Saved and synced</span>
                <span>JavaScript</span>
              </div>
            </div>
          </div>

          <div className="ct-workspace-preview-footer">
            <div>
              <strong>Everything you need to stay in flow.</strong>
              <span>Simple file navigation, shared context, and a ready-to-run project.</span>
            </div>
            <div className="ct-preview-run-status">
              <Play size={13} />
              <span>Ready to run</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkspacePreview;
