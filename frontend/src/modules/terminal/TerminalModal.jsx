import React from 'react';

export const TerminalModal = ({
  isOpen,
  onClose,
  terminalLogs,
  terminalInput,
  setTerminalInput,
  handleTerminalSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="ct-terminal-modal-backdrop" onClick={onClose}>
      <div className="ct-terminal-window" onClick={e => e.stopPropagation()}>
        <div className="ct-terminal-header">
          <div className="ct-terminal-controls">
            <span className="ct-dot red" onClick={onClose}></span>
            <span className="ct-dot yellow"></span>
            <span className="ct-dot green"></span>
          </div>
          <div className="ct-terminal-title">CodeTrail :: Terminal Access</div>
          <div className="ct-terminal-close-btn" onClick={onClose}>✕</div>
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
  );
};

export default TerminalModal;
