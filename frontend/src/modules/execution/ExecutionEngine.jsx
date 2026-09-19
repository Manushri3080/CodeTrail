import React, { useState } from 'react';
import axios from 'axios';
import { Play, Terminal, Code2, Loader2, CheckCircle2, FileText, History, Trash2 } from 'lucide-react';
import { EXECUTION_LANGUAGES } from '../../constants/execution.constants';

export const ExecutionEngine = () => {
  const [selectedLang, setSelectedLang] = useState('javascript');
  const [isRunning, setIsRunning] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [activeTab, setActiveTab] = useState('output'); // 'output' | 'input' | 'history'
  const [sandboxHistory, setSandboxHistory] = useState([]);
  const [outputLogs, setOutputLogs] = useState([
    'Selected runtime: Node.js v20.11.0',
    'Click "Run Code" to execute script in isolated cloud sandbox.'
  ]);

  const currentLang = EXECUTION_LANGUAGES.find(l => l.id === selectedLang) || EXECUTION_LANGUAGES[0];

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveTab('output');
    setOutputLogs([`Compiling & executing ${currentLang.name} script...`]);

    try {
      const token = localStorage.getItem('ct-auth-token');
      const response = await axios.post('http://localhost:5000/api/execute', {
        language: currentLang.id,
        code: currentLang.snippet,
        stdin: customInput,
        filename: `main.${currentLang.id === 'python' ? 'py' : currentLang.id === 'cpp' ? 'cpp' : 'js'}`
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const data = response.data;
      const lines = (data.output || 'Execution completed with no output.').split('\n');
      lines.push(`\n[Process exited with status code ${data.exitCode ?? 0} in ${data.version || 'sandbox'}]`);
      setOutputLogs(lines);

      // Record in local sandbox history
      const historyItem = {
        id: Date.now(),
        lang: currentLang.name,
        stdin: customInput,
        output: data.output || 'No output',
        exitCode: data.exitCode ?? 0,
        time: new Date().toLocaleTimeString()
      };
      setSandboxHistory(prev => [historyItem, ...prev]);

    } catch (err) {
      console.error('Execution Error:', err);
      const errMsg = err.response?.data?.output || err.response?.data?.message || err.message;
      setOutputLogs([`[Execution Error]: ${errMsg}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section id="execution-engine" className="ct-section ct-execution-section">
      <div className="ct-container">
        
        {/* Section Header */}
        <div className="ct-section-header">
          <span className="ct-demo-badge">CLOUD CODE RUNNER</span>
          <h2 className="ct-section-title">Multi-Language Code Sandbox</h2>
          <p className="ct-section-subtitle">
            Compile and run source code directly in the browser across multiple programming languages with custom input support.
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

            {/* Right: Execution Output Console with Tabs */}
            <div className="ct-exec-console flex flex-col">
              <div className="ct-console-header flex items-center justify-between border-b border-white/10 px-3 py-1.5 bg-[#12131F]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('output')}
                    className={`text-xs font-mono font-bold flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${activeTab === 'output' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Terminal size={13} />
                    <span>Output</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('input')}
                    className={`text-xs font-mono font-bold flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${activeTab === 'input' ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:text-white'}`}
                  >
                    <FileText size={13} />
                    <span>Input (stdin)</span>
                    {customInput.trim() ? <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`text-xs font-mono font-bold flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${activeTab === 'history' ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-400 hover:text-white'}`}
                  >
                    <History size={13} />
                    <span>History ({sandboxHistory.length})</span>
                  </button>
                </div>

                {!isRunning && outputLogs.length > 2 && activeTab === 'output' && (
                  <span className="ct-console-status">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span>Exit 0</span>
                  </span>
                )}
              </div>
              
              <div className="ct-console-body flex-1 overflow-y-auto p-3">
                {activeTab === 'output' && (
                  <>
                    {outputLogs.map((log, idx) => (
                      <div key={idx} className="ct-console-line">
                        <span className="ct-console-prompt">&gt; </span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </>
                )}

                {activeTab === 'input' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-cyan-300 font-mono font-bold">
                      <span>Standard Input (stdin)</span>
                      {customInput && (
                        <button
                          type="button"
                          onClick={() => setCustomInput('')}
                          className="text-[10px] text-gray-400 hover:text-white"
                        >
                          Clear Input
                        </button>
                      )}
                    </div>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Type custom standard input data for script execution here..."
                      className="w-full h-36 bg-[#0B0C14] border border-cyan-500/30 rounded p-2 text-xs font-mono text-cyan-100 outline-none resize-none"
                    />
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-2">
                    {sandboxHistory.length === 0 ? (
                      <div className="text-gray-500 italic text-xs">No execution history recorded in sandbox yet.</div>
                    ) : (
                      sandboxHistory.map(item => (
                        <div key={item.id} className="p-2 rounded bg-white/5 border border-white/10 text-xs font-mono">
                          <div className="flex justify-between text-gray-400 mb-1">
                            <span className="font-bold text-purple-300">{item.lang}</span>
                            <span>{item.time}</span>
                          </div>
                          {item.stdin ? (
                            <div className="text-cyan-300 text-[11px] truncate">stdin: {item.stdin}</div>
                          ) : null}
                          <pre className="text-gray-200 text-[11px] whitespace-pre-wrap max-h-16 overflow-y-auto mt-1">
                            {item.output}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default ExecutionEngine;
