import React, { useState } from 'react';
import { Play, Terminal, Code2, Loader2, CheckCircle2 } from 'lucide-react';
import { EXECUTION_LANGUAGES } from '../../constants/execution.constants';

export const ExecutionEngine = () => {
  const [selectedLang, setSelectedLang] = useState('javascript');
  const [isRunning, setIsRunning] = useState(false);
  const [outputLogs, setOutputLogs] = useState([
    'Selected runtime: Node.js v20.11.0',
    'Click "Run Code" to execute script in isolated cloud sandbox.'
  ]);

  const currentLang = EXECUTION_LANGUAGES.find(l => l.id === selectedLang) || EXECUTION_LANGUAGES[0];

  const handleRunCode = () => {
    setIsRunning(true);
    setOutputLogs([`Compiling & executing ${currentLang.name} script...`]);

    setTimeout(() => {
      setIsRunning(false);
      setOutputLogs(currentLang.expectedOutput);
    }, 650);
  };

  return (
    <section id="execution-engine" className="ct-section ct-execution-section">
      <div className="ct-container">
        
        {/* Section Header */}
        <div className="ct-section-header">
          <span className="ct-demo-badge">CLOUD CODE RUNNER</span>
          <h2 className="ct-section-title">Multi-Language Code Sandbox</h2>
          <p className="ct-section-subtitle">
            Compile and run source code directly in the browser across multiple programming languages.
          </p>
        </div>

        {/* Interactive Code Execution Box */}
        <div className="ct-execution-box">
          
          {/* Top IDE Header: Mac Window Controls + Language Tabs + Refined Run Button */}
          <div className="ct-exec-header">
            <div className="ct-exec-header-left">
              <div className="ct-ide-dots">
                <span className="ct-dot red"></span>
                <span className="ct-dot yellow"></span>
                <span className="ct-dot green"></span>
              </div>

              <div className="ct-lang-tabs">
                {EXECUTION_LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    className={`ct-lang-tab ${selectedLang === lang.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedLang(lang.id);
                      setOutputLogs([`Selected runtime: ${lang.name} (${lang.version})`]);
                    }}
                  >
                    <Code2 size={13} />
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              className="ct-btn-run"
              onClick={handleRunCode}
              disabled={isRunning}
            >
              {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              <span>{isRunning ? 'Executing...' : 'Run Code'}</span>
            </button>
          </div>

          {/* Body Split: Code Editor (Left) vs Execution Console (Right) */}
          <div className="ct-exec-split">
            
            {/* Left: Code Snippet Display with Line Numbers */}
            <div className="ct-exec-editor">
              <div className="ct-editor-subbar">
                <span>{currentLang.name} Sandbox ({currentLang.version})</span>
              </div>
              <div className="ct-editor-code-wrapper">
                <div className="ct-editor-lines">
                  {currentLang.snippet.split('\n').map((_, i) => (
                    <div key={i} className="ct-line-num">{i + 1}</div>
                  ))}
                </div>
                <pre className="ct-code-pre">
                  <code>{currentLang.snippet}</code>
                </pre>
              </div>
            </div>

            {/* Right: Execution Output Console */}
            <div className="ct-exec-console">
              <div className="ct-console-header">
                <div className="ct-console-title">
                  <Terminal size={14} />
                  <span>Terminal Output</span>
                </div>
                {!isRunning && outputLogs.length > 2 && (
                  <span className="ct-console-status">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span>Exit 0</span>
                  </span>
                )}
              </div>
              
              <div className="ct-console-body">
                {outputLogs.map((log, idx) => (
                  <div key={idx} className="ct-console-line">
                    <span className="ct-console-prompt">&gt; </span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default ExecutionEngine;
