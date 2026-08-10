import React from 'react';
import { 
  Terminal as TerminalIcon, 
  ArrowRight, 
  Layers 
} from 'lucide-react';
import { Terminal } from '../../components/ui/Terminal';

export const HeroSection = ({ onOpenTerminal }) => {
  return (
    <main className="ct-hero-section">
      <div className="ct-hero-container">
        
        {/* 2-Column Side by Side Split Grid */}
        <div className="ct-hero-split-grid">
          
          {/* LEFT COLUMN: Badge, Title, Subtitle, Actions & Metrics */}
          <div className="ct-hero-left-col">
            
            <div className="ct-hero-badge">
              <span>REAL-TIME COLLABORATIVE WORKSPACE</span>
            </div>

            <h1 className="ct-hero-title">
              CODE WITHOUT <br />
              <span className="ct-title-highlight">COMPROMISE.</span>
            </h1>

            <p className="ct-hero-subtitle">
              CodeTrail brings together real-time collaborative editing, instant cloud code execution, 
              and verified activity tracking for modern software engineering teams.
            </p>

            <div className="ct-hero-actions">
              <button 
                className="ct-btn-primary"
                onClick={onOpenTerminal}
              >
                <TerminalIcon size={17} />
                <span>Enter Terminal</span>
                <ArrowRight size={15} />
              </button>

              <button 
                className="ct-btn-secondary"
                onClick={() => {
                  const el = document.getElementById('modular-workspace');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Layers size={17} />
                <span>Explore Workspace</span>
              </button>
            </div>

            {/* Integrated Metrics Row inside Left Column */}
            <div className="ct-hero-metrics-row">
              <div className="ct-metric-item">
                <span className="ct-metric-val">1,024+</span>
                <span className="ct-metric-lbl">Workspaces Active</span>
              </div>
              <div className="ct-metric-divider" />
              <div className="ct-metric-item">
                <span className="ct-metric-val">6.4M+</span>
                <span className="ct-metric-lbl">Executions Run</span>
              </div>
              <div className="ct-metric-divider" />
              <div className="ct-metric-item">
                <span className="ct-metric-val">99.9%</span>
                <span className="ct-metric-lbl">Audit Sync</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Terminal Window (Side-by-side with NO SCROLL) */}
          <div className="ct-hero-right-col">
            <div className="ct-hero-terminal-card">
              <Terminal
                commands={[
                  "git clone https://github.com/codetrail/app.git",
                  "npm run dev"
                ]}
                outputs={{
                  0: [
                    "Cloned repository (42 objects, done)"
                  ],
                  1: [
                    "Workspace server connected",
                    "Client environment ready at http://localhost:5173"
                  ]
                }}
                typingSpeed={40}
                delayBetweenCommands={1000}
              />
            </div>
          </div>

        </div>

      </div>
    </main>
  );
};

export default HeroSection;
