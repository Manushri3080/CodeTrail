import React, { useState } from 'react';
import { Cpu, Play, CheckCircle2, Terminal, Code2, Loader2 } from 'lucide-react';

export function ExecutionEngine() {
  const [selectedLang, setSelectedLang] = useState('javascript');
  const [isRunning, setIsRunning] = useState(false);
  const [outputLogs, setOutputLogs] = useState([
    '[Piston Engine] Selected runtime: Node.js v20.11.0',
    'Click "RUN CODE" to execute in cloud sandbox environment.'
  ]);

  const languages = [
    { 
      id: 'javascript', 
      name: 'Node.js', 
      version: 'v20.11.0', 
      snippet: 'console.log("CodeTrail Execution Active!");\nconst sum = (a, b) => a + b;\nconsole.log(`Calculated Sum: ${sum(10, 32)}`);',
      expectedOutput: [
        'CodeTrail Execution Active!',
        'Calculated Sum: 42',
        '\n[Process exited with status code 0 in 14ms]'
      ]
    },
    { 
      id: 'python', 
      name: 'Python 3', 
      version: 'v3.10.12', 
      snippet: 'print("CodeTrail Python Runner Initialized")\ndef fibonacci(n):\n    return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)\nprint("Fib(10) =", fibonacci(10))',
      expectedOutput: [
        'CodeTrail Python Runner Initialized',
        'Fib(10) = 55',
        '\n[Process exited with status code 0 in 18ms]'
      ]
    },
    { 
      id: 'cpp', 
      name: 'C++ 20', 
      version: 'GCC 13.2', 
      snippet: '#include <iostream>\nint main() {\n    std::cout << "CodeTrail C++20 Sandbox Ready\\n";\n    return 0;\n}',
      expectedOutput: [
        'CodeTrail C++20 Sandbox Ready',
        '\n[Process exited with status code 0 in 22ms]'
      ]
    },
    { 
      id: 'java', 
      name: 'Java', 
      version: 'OpenJDK 21', 
      snippet: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("CodeTrail Java Sandbox Engine");\n    }\n}',
      expectedOutput: [
        'CodeTrail Java Sandbox Engine',
        '\n[Process exited with status code 0 in 35ms]'
      ]
    }
  ];

  const currentLang = languages.find(l => l.id === selectedLang) || languages[0];

  const handleRunCode = () => {
    setIsRunning(true);
    setOutputLogs([`[Piston Engine] Compiling & running ${currentLang.name}...`]);

    setTimeout(() => {
      setIsRunning(false);
      setOutputLogs(currentLang.expectedOutput);
    }, 600);
  };

  return (
    <section id="execution-engine" className="ct-section ct-execution-section">
      <div className="ct-container">
        
        {/* Section Header */}
        <div className="ct-section-header">
          <span className="ct-demo-badge">CLOUD CODE RUNNER</span>
          <h2 className="ct-section-title">Piston Code Execution Sandbox</h2>
          <p className="ct-section-subtitle">
            Compile and run source code directly in the browser across multiple programming languages.
          </p>
        </div>

        {/* Interactive Code Execution Box */}
        <div className="ct-execution-box">
          
          {/* Top Bar with Language Tabs & Run Button */}
          <div className="ct-exec-header">
            <div className="ct-lang-tabs">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  className={`ct-lang-tab ${selectedLang === lang.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedLang(lang.id);
                    setOutputLogs([`[Piston Engine] Selected runtime: ${lang.name} (${lang.version})`]);
                  }}
                >
                  <Code2 size={14} />
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>

            <button 
              className="ct-btn-run"
              onClick={handleRunCode}
              disabled={isRunning}
            >
              {isRunning ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              <span>{isRunning ? 'EXECUTING...' : 'RUN CODE'}</span>
            </button>
          </div>

          {/* Body Split: Code Input vs Output Console */}
          <div className="ct-exec-split">
            {/* Snippet Display */}
            <div className="ct-exec-editor">
              <div className="ct-editor-label">{currentLang.name} Sandbox ({currentLang.version})</div>
              <pre className="ct-code-pre">
                <code>{currentLang.snippet}</code>
              </pre>
            </div>

            {/* Execution Console Output */}
            <div className="ct-exec-console">
              <div className="ct-console-header">
                <Terminal size={14} />
                <span>Console Output</span>
              </div>
              <div className="ct-console-body">
                {outputLogs.map((log, idx) => (
                  <div key={idx} className="ct-console-line">{log}</div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

export default ExecutionEngine;
