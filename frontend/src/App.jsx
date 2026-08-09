import React, { useState } from 'react';
import Navbar from './components/Navbar';
import TerminalDemo from './components/TerminalDemo';
import ModularWorkspace from './components/ModularWorkspace';
import ExecutionEngine from './components/ExecutionEngine';
import ContributionDossier from './components/ContributionDossier';
import ModulesGrid from './components/ModulesGrid';
import Footer from './components/Footer';
import { 
  Terminal, 
  ShieldCheck, 
  Layers, 
  Users, 
  Sparkles,
  ArrowRight,
  Code2
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('command-center');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([
    'CodeTrail Kernel v1.0.4 initialized.',
    'Socket.IO transport: WebSocket connected.',
    'Proof-of-work SHA-256 verification active.',
    'Ready for user command. Type "help" or "connect".'
  ]);

  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim().toLowerCase();
    let response = `Command executed: ${cmd}`;

    if (cmd === 'help') {
      response = 'Available commands: help, status, connect, modules, clear';
    } else if (cmd === 'status') {
      response = 'System: ALL SERVICES OPERATIONAL | Latency: 14ms | Peer Sync: Active';
    } else if (cmd === 'connect') {
      response = 'Connecting to workspace [ws-alpha-9]... Connected!';
    } else if (cmd === 'modules') {
      response = 'Loaded 8/8 Modules: Auth, Workspace, RealTimeEditor, ExecutionEngine, ActivityLogger, Analytics, Dashboard, Settings';
    } else if (cmd === 'clear') {
      setTerminalLogs([]);
      setTerminalInput('');
      return;
    }

    setTerminalLogs(prev => [...prev, `> ${terminalInput}`, response]);
    setTerminalInput('');
  };

  return (
    <div className="ct-app">
      {/* 1. TOP NAVBAR */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onOpenTerminal={() => setTerminalOpen(true)}
      />

      {/* 2. HERO SECTION */}
      <main className="ct-hero-section">
        <div className="ct-hero-container">
          
          {/* Badge */}
          <div className="ct-hero-badge">
            <Sparkles size={14} className="ct-sparkle-glow" />
            <span>REAL-TIME COLLABORATIVE ENVIRONMENT & TELEMETRY</span>
          </div>

          {/* Main Title */}
          <h1 className="ct-hero-title">
            CODE WITHOUT <br />
            <span className="ct-title-highlight">COMPROMISE.</span>
          </h1>

          {/* Subtitle */}
          <p className="ct-hero-subtitle">
            CodeTrail brings together real-time collaborative editing, browser-based code execution, 
            and automated SHA-256 proof-of-work tracking — proving every developer's contribution.
          </p>

          {/* Action CTAs */}
          <div className="ct-hero-actions">
            <button 
              className="ct-btn-primary"
              onClick={() => setTerminalOpen(true)}
            >
              <Terminal size={18} />
              <span>ENTER TERMINAL</span>
              <ArrowRight size={16} />
            </button>

            <button 
              className="ct-btn-secondary"
              onClick={() => {
                const el = document.getElementById('modular-workspace');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Layers size={18} />
              <span>EXPLORE WORKSPACE</span>
            </button>
          </div>

          {/* Live Telemetry Stats Grid */}
          <div className="ct-stats-grid">
            <div className="ct-stat-card">
              <div className="ct-stat-header">
                <Users size={16} className="ct-stat-icon" />
                <span className="ct-stat-label">ACTIVE WORKSPACES</span>
              </div>
              <div className="ct-stat-value">1,024+</div>
              <span className="ct-stat-trend">Live Peer Sync</span>
            </div>

            <div className="ct-stat-card">
              <div className="ct-stat-header">
                <Code2 size={16} className="ct-stat-icon" />
                <span className="ct-stat-label">CODE EXECUTION</span>
              </div>
              <div className="ct-stat-value">6.4M</div>
              <span className="ct-stat-trend">Piston Sandbox Engine</span>
            </div>

            <div className="ct-stat-card">
              <div className="ct-stat-header">
                <ShieldCheck size={16} className="ct-stat-icon" />
                <span className="ct-stat-label">PROOF VERIFICATION</span>
              </div>
              <div className="ct-stat-value">99.9%</div>
              <span className="ct-stat-trend">SHA-256 Tamper Evident</span>
            </div>
          </div>

        </div>
      </main>

      {/* 3. INTERACTIVE TYPING TERMINAL DEMO */}
      <TerminalDemo />

      {/* 4. MODULAR COLLABORATIVE WORKSPACE FEATURE */}
      <ModularWorkspace />

      {/* 5. PISTON CODE EXECUTION ENGINE SANDBOX */}
      <ExecutionEngine />

      {/* 6. CONTRIBUTION DOSSIER & PROOF-OF-WORK TELEMETRY */}
      <ContributionDossier />

      {/* 7. 8 CORE PLATFORM MODULES BREAKDOWN */}
      <ModulesGrid />

      {/* 8. FOOTER */}
      <Footer />

      {/* INTERACTIVE TERMINAL ACCESS MODAL */}
      {terminalOpen && (
        <div className="ct-terminal-modal-backdrop" onClick={() => setTerminalOpen(false)}>
          <div className="ct-terminal-window" onClick={e => e.stopPropagation()}>
            <div className="ct-terminal-header">
              <div className="ct-terminal-controls">
                <span className="ct-dot red" onClick={() => setTerminalOpen(false)}></span>
                <span className="ct-dot yellow"></span>
                <span className="ct-dot green"></span>
              </div>
              <div className="ct-terminal-title">CodeTrail :: Terminal Access</div>
              <div className="ct-terminal-close-btn" onClick={() => setTerminalOpen(false)}>✕</div>
            </div>
            
            <div className="ct-terminal-body">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className={`ct-log-line ${log.startsWith('>') ? 'input' : ''}`}>
                  {log}
                </div>
              ))}
            </div>

            <form onSubmit={handleTerminalSubmit} className="ct-terminal-input-bar">
              <span className="ct-prompt-symbol">$</span>
              <input 
                type="text"
                className="ct-terminal-input"
                placeholder="Type command (e.g. status, connect, help)..."
                value={terminalInput}
                onChange={e => setTerminalInput(e.target.value)}
                autoFocus
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
