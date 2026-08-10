import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Copy, Check, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { unlockAudioContext, playKeypressSound } from '../../utils/audio.utils';

export function Terminal({
  commands = [
    "git clone https://github.com/codetrail/app.git",
    "npm run dev"
  ],
  outputs = {
    0: [
      "Cloned repository (42 objects, done)"
    ],
    1: [
      "Workspace server connected",
      "Client environment ready at http://localhost:5173"
    ]
  },
  typingSpeed = 40,
  delayBetweenCommands = 1000
}) {
  const [currentCmdIndex, setCurrentCmdIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [displayedLogs, setDisplayedLogs] = useState([]);
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioActivated, setAudioActivated] = useState(false);
  
  const bodyRef = useRef(null);

  const handleInitAudio = () => {
    const success = unlockAudioContext();
    if (success) {
      setAudioActivated(true);
    }
  };

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [currentText, displayedLogs]);

  useEffect(() => {
    if (currentCmdIndex >= commands.length) return;

    const fullCommand = commands[currentCmdIndex];
    let charIndex = 0;
    setCurrentText("");

    const typingInterval = setInterval(() => {
      if (charIndex <= fullCommand.length) {
        const nextSub = fullCommand.slice(0, charIndex);
        setCurrentText(nextSub);
        if (charIndex > 0) {
          playKeypressSound(false, soundEnabled);
        }
        charIndex++;
      } else {
        clearInterval(typingInterval);
        playKeypressSound(true, soundEnabled);

        setTimeout(() => {
          setDisplayedLogs((prev) => [
            ...prev,
            { type: 'command', text: fullCommand },
            ...(outputs[currentCmdIndex] || []).map(line => ({ type: 'output', text: line }))
          ]);

          setCurrentText("");
          setCurrentCmdIndex((prev) => prev + 1);
        }, delayBetweenCommands);
      }
    }, typingSpeed);

    return () => clearInterval(typingInterval);
  }, [currentCmdIndex, commands, outputs, typingSpeed, delayBetweenCommands, soundEnabled]);

  const handleCopy = () => {
    const textToCopy = commands.join("\n");
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReplay = () => {
    handleInitAudio();
    setDisplayedLogs([]);
    setCurrentText("");
    setCurrentCmdIndex(0);
  };

  return (
    <div className="ct-terminal-component" onClick={handleInitAudio}>
      {!audioActivated && soundEnabled && (
        <div className="ct-audio-banner" onClick={handleInitAudio}>
          <Volume2 size={14} />
          <span>Click terminal to enable typing sound</span>
        </div>
      )}

      <div className="ct-terminal-comp-header">
        <div className="ct-terminal-comp-dots">
          <span className="ct-dot red"></span>
          <span className="ct-dot yellow"></span>
          <span className="ct-dot green"></span>
        </div>

        <div className="ct-terminal-comp-title">
          <TerminalIcon size={13} />
          <span>bash -- dev-workspace</span>
        </div>

        <div className="ct-terminal-actions-group">
          <button 
            className={`ct-terminal-action-btn ${soundEnabled ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleInitAudio();
              setSoundEnabled(!soundEnabled);
            }}
            title={soundEnabled ? "Sound On (Click to Mute)" : "Sound Off (Click to Enable)"}
          >
            {soundEnabled ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} />}
          </button>

          <button 
            className="ct-terminal-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleReplay();
            }}
            title="Replay sequence"
          >
            <RotateCcw size={13} />
          </button>

          <button 
            className="ct-terminal-action-btn" 
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            title="Copy script"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      <div className="ct-terminal-comp-body" ref={bodyRef}>
        {displayedLogs.map((log, i) => (
          <div key={i} className={`ct-comp-line ${log.type}`}>
            {log.type === 'command' && <span className="ct-comp-prompt">$ </span>}
            <span>{log.text}</span>
          </div>
        ))}

        {currentCmdIndex < commands.length ? (
          <div className="ct-comp-line command active">
            <span className="ct-comp-prompt">$ </span>
            <span>{currentText}</span>
            <span className="ct-cursor">▌</span>
          </div>
        ) : (
          <div className="ct-comp-line command active">
            <span className="ct-comp-prompt">$ </span>
            <span className="ct-cursor">▌</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Terminal;
