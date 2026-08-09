import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Copy, Check, Volume2, VolumeX, RotateCcw } from 'lucide-react';

export function Terminal({
  commands = [
    "git clone https://github.com/codetrail/app.git",
    "npm run dev"
  ],
  outputs = {
    0: [
      "✔ Cloned repository (42 objects, done)"
    ],
    1: [
      "✔ Socket.IO server running at ws://localhost:5000",
      "✔ Client dev server ready at http://localhost:5173"
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
  
  const audioCtxRef = useRef(null);

  // Initialize and unlock Web Audio API on user interaction
  const initAudio = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioCtxRef.current = new AudioContext();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      setAudioActivated(true);
    } catch (e) {
      console.warn("Audio unlock failed:", e);
    }
  };

  // Synthesize audible mechanical key press sound
  const playClickSound = (isReturn = false) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        initAudio();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isReturn) {
        // Return key sound (Clear 440Hz tone)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else {
        // Crisp keypress click sound (800Hz - 1000Hz triangle burst)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
    } catch (e) {
      // Gracefully handle browser restrictions
    }
  };

  // Typing animation loop
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
          playClickSound(false);
        }
        charIndex++;
      } else {
        clearInterval(typingInterval);
        playClickSound(true);

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
    initAudio();
    setDisplayedLogs([]);
    setCurrentText("");
    setCurrentCmdIndex(0);
  };

  return (
    <div className="ct-terminal-component" onClick={initAudio}>
      {/* Sound Autoplay Overlay / Banner if audio needs user click */}
      {!audioActivated && soundEnabled && (
        <div className="ct-audio-banner" onClick={initAudio}>
          <Volume2 size={14} />
          <span>Click terminal to enable typing sound</span>
        </div>
      )}

      {/* Header Bar */}
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
          {/* Sound Toggle Button */}
          <button 
            className={`ct-terminal-action-btn ${soundEnabled ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              initAudio();
              setSoundEnabled(!soundEnabled);
            }}
            title={soundEnabled ? "Sound On (Click to Mute)" : "Sound Off (Click to Enable)"}
          >
            {soundEnabled ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} />}
          </button>

          {/* Replay Sequence Button */}
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

          {/* Copy Script Button */}
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

      {/* Terminal Screen Body */}
      <div className="ct-terminal-comp-body">
        {displayedLogs.map((log, i) => (
          <div key={i} className={`ct-comp-line ${log.type}`}>
            {log.type === 'command' && <span className="ct-comp-prompt">$ </span>}
            <span>{log.text}</span>
          </div>
        ))}

        {/* Active Typing Line */}
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
