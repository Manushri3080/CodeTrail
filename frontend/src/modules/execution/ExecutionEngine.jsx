import React, { useState } from 'react';
import axios from 'axios';
import { Play, Terminal, Code2, Loader2, CheckCircle2, AlertTriangle, Clock, FileText, History, Trash2, RotateCcw, Copy, Check } from 'lucide-react';
import { EXECUTION_LANGUAGES } from '../../constants/execution.constants';

export const ExecutionEngine = () => {
  const [selectedLang, setSelectedLang] = useState('javascript');
  const [isRunning, setIsRunning] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [activeTab, setActiveTab] = useState('output'); // 'output' | 'input' | 'history'
  const [sandboxHistory, setSandboxHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  
  // Per-language editable code cache
  const [codeSnippets, setCodeSnippets] = useState(() => {
    const initial = {};
    EXECUTION_LANGUAGES.forEach(lang => {
      initial[lang.id] = lang.snippet;
    });
    return initial;
  });

  const [lastExecStatus, setLastExecStatus] = useState(null); // { status: 'success' | 'error' | 'compile_error' | 'timeout', exitCode: 0, timeMs: 14 }
  const [outputLogs, setOutputLogs] = useState([
    'Selected runtime: Node.js (JavaScript)',
    'Type your custom code or test the default template.',
    'Click "Run Code" to compile and execute in the live cloud sandbox.'
  ]);

  const currentLang = EXECUTION_LANGUAGES.find(l => l.id === selectedLang) || EXECUTION_LANGUAGES[0];
  const activeCode = codeSnippets[selectedLang] || currentLang.snippet;

  const handleCodeChange = (newCode) => {
    setCodeSnippets(prev => ({
      ...prev,
      [selectedLang]: newCode
    }));
  };

  const handleResetCode = () => {
    setCodeSnippets(prev => ({
      ...prev,
      [selectedLang]: currentLang.snippet
    }));
  };

  const handleCopyOutput = () => {
    const textToCopy = outputLogs.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveTab('output');
    setOutputLogs([`[Running ${currentLang.name} script...]`]);
    setLastExecStatus(null);

    const startTime = Date.now();

    try {
      const token = localStorage.getItem('ct-auth-token');
      const extMap = { javascript: 'js', python: 'py', cpp: 'cpp', java: 'java' };
      const filename = `main.${extMap[currentLang.id] || 'txt'}`;

      const response = await axios.post('http://localhost:5000/api/execute', {
        language: currentLang.id,
        code: activeCode,
        stdin: customInput,
        filename
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const data = response.data;
      const status = data.status || (data.exitCode === 0 ? 'success' : (data.isCompileError ? 'compile_error' : 'error'));
      const timeMs = data.executionTimeMs ?? (Date.now() - startTime);
      const exitCode = data.exitCode ?? 0;

      setLastExecStatus({
        status,
        exitCode,
        timeMs,
        isCompileError: data.isCompileError,
        isTimeout: data.isTimeout
      });

      const logs = [];
      if (data.compileOutput) {
        logs.push(`[Compiler Diagnostics]:\n${data.compileOutput}`);
      }
      if (data.stdout) {
        logs.push(data.stdout);
      }
      if (data.stderr) {
        logs.push(`[Standard Error]:\n${data.stderr}`);
      }
      if (!data.stdout && !data.stderr && !data.compileOutput) {
        logs.push(data.output || '[Process exited with no output]');
      }

      logs.push(`\n[Process completed: status=${status}, exitCode=${exitCode}, time=${timeMs}ms]`);
      setOutputLogs(logs);

      // Record in local sandbox history
      const historyItem = {
        id: Date.now(),
        lang: currentLang.name,
        code: activeCode,
        stdin: customInput,
        output: data.output || data.stdout || data.stderr || 'No output',
        status,
        exitCode,
        timeMs,
        time: new Date().toLocaleTimeString()
      };
      setSandboxHistory(prev => [historyItem, ...prev]);

    } catch (err) {
      console.error('Execution Error:', err);
      const errMsg = err.response?.data?.output || err.response?.data?.message || err.message;
      setLastExecStatus({
        status: 'error',
        exitCode: 1,
        timeMs: Date.now() - startTime
      });
      setOutputLogs([`[Execution Service Error]: ${errMsg}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const lineCount = activeCode.split('\n').length;

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
                      setLastExecStatus(null);
                      setOutputLogs([
                        `Selected runtime: ${lang.name} (${lang.version})`,
                        'Type your custom code or run the template script.'
                      ]);
                    }}
                  >
                    <Code2 size={13} />
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetCode}
                className="text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 flex items-center gap-1 transition-colors"
                title="Reset code to default template"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>

              <button 
                className="ct-btn-run"
                onClick={handleRunCode}
                disabled={isRunning}
              >
                {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                <span>{isRunning ? 'Executing...' : 'Run Code'}</span>
              </button>
            </div>
          </div>

          {/* Body Split: Code Editor (Left) vs Execution Console (Right) */}
          <div className="ct-exec-split">
            
            {/* Left: Editable Code Editor with Line Numbers */}
            <div className="ct-exec-editor flex flex-col">
              <div className="ct-editor-subbar flex items-center justify-between">
                <span>{currentLang.name} Sandbox ({currentLang.version})</span>
                <span className="text-[10px] text-gray-400 font-mono">{lineCount} line{lineCount > 1 ? 's' : ''}</span>
              </div>
              <div className="ct-editor-code-wrapper flex-1 relative flex">
                <div className="ct-editor-lines select-none">
                  {Array.from({ length: lineCount }).map((_, i) => (
                    <div key={i} className="ct-line-num">{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={activeCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  spellCheck={false}
                  placeholder="Type your code here..."
                  className="flex-1 bg-transparent p-3 font-mono text-xs text-gray-100 outline-none resize-none leading-relaxed border-0 select-text"
                  style={{ tabSize: 2 }}
                />
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
                    {customInput.trim() ? <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" /> : null}
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

                <div className="flex items-center gap-2">
                  {lastExecStatus && activeTab === 'output' && !isRunning && (
                    <div className="flex items-center gap-1">
                      {lastExecStatus.status === 'success' && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                          <CheckCircle2 size={11} />
                          <span>Exit 0</span>
                          {lastExecStatus.timeMs ? <span className="text-[10px] text-emerald-400/80">• {lastExecStatus.timeMs}ms</span> : null}
                        </span>
                      )}
                      {lastExecStatus.status === 'compile_error' && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">
                          <AlertTriangle size={11} />
                          <span>Compile Error</span>
                        </span>
                      )}
                      {lastExecStatus.status === 'timeout' && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">
                          <Clock size={11} />
                          <span>Timeout</span>
                        </span>
                      )}
                      {lastExecStatus.status === 'error' && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-red-400 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/30 font-semibold">
                          <AlertTriangle size={11} />
                          <span>Exit {lastExecStatus.exitCode ?? 1}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {activeTab === 'output' && outputLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyOutput}
                      className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                      title="Copy Output"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  )}

                  {activeTab === 'history' && sandboxHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSandboxHistory([])}
                      className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-white/10 transition-colors"
                      title="Clear Sandbox History"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="ct-console-body flex-1 overflow-y-auto p-3">
                {activeTab === 'output' && (
                  <div className="space-y-1 font-mono text-xs">
                    {outputLogs.map((log, idx) => (
                      <div key={idx} className="whitespace-pre-wrap leading-relaxed text-gray-200">
                        {log}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'input' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-cyan-300 font-mono font-bold">
                      <span>Standard Input (stdin)</span>
                      {customInput && (
                        <button
                          type="button"
                          onClick={() => setCustomInput('')}
                          className="text-[10px] text-gray-400 hover:text-white cursor-pointer"
                        >
                          Clear Input
                        </button>
                      )}
                    </div>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Type custom standard input data for script execution here (e.g. numbers, strings, multiline data)..."
                      className="w-full h-36 bg-[#0B0C14] border border-cyan-500/30 rounded p-2 text-xs font-mono text-cyan-100 outline-none resize-none leading-relaxed"
                    />
                    <div className="text-[11px] text-gray-400 font-mono">
                      Attached stdin is supplied to the standard input stream of the executable during execution.
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-2">
                    {sandboxHistory.length === 0 ? (
                      <div className="text-gray-500 italic text-xs py-4 text-center">No execution history recorded in sandbox yet.</div>
                    ) : (
                      sandboxHistory.map(item => (
                        <div key={item.id} className="p-2.5 rounded bg-white/5 border border-white/10 text-xs font-mono">
                          <div className="flex justify-between items-center text-gray-400 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-purple-300">{item.lang}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${item.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                {item.status} (exit {item.exitCode})
                              </span>
                            </div>
                            <span className="text-[10px]">{item.time} {item.timeMs ? `• ${item.timeMs}ms` : ''}</span>
                          </div>
                          {item.stdin ? (
                            <div className="text-cyan-300 text-[11px] truncate mt-1">stdin: {item.stdin}</div>
                          ) : null}
                          <pre className="text-gray-200 text-[11px] whitespace-pre-wrap max-h-20 overflow-y-auto mt-1 bg-black/30 p-1.5 rounded">
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
