import React from 'react';
import { Terminal } from '../../components/ui/Terminal';

export const TerminalDemo = () => {
  return (
    <section className="ct-terminal-demo-section">
      <div className="ct-terminal-demo-container">
        <div className="ct-demo-badge">WORKSPACE INITIALIZATION</div>
        <h2 className="ct-demo-title">Real-Time Workspace Startup</h2>
        <p className="ct-demo-description">
          Watch CodeTrail initialize collaborative environments and boot development servers in seconds.
        </p>

        <div className="ct-demo-window-wrapper">
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
    </section>
  );
};

export default TerminalDemo;
