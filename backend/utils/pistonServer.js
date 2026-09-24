const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');

const PORT = 2000;
const COMPILE_TIMEOUT_MS = 15000;
const RUN_TIMEOUT_MS = 6000;
const MAX_OUTPUT_BYTES = 128 * 1024; // 128 KB output limit

// Host compiler versions
const RUNTIMES = [
  {
    language: 'c++',
    version: '14.2.0',
    aliases: ['cpp', 'g++', 'cxx', 'c']
  },
  {
    language: 'python',
    version: '3.13.13',
    aliases: ['py', 'python3', 'py3']
  },
  {
    language: 'javascript',
    version: '22.13.1',
    aliases: ['js', 'node', 'nodejs']
  },
  {
    language: 'java',
    version: '17.0.10',
    aliases: ['java', 'openjdk']
  }
];

const tempDir = path.join(os.tmpdir(), 'codetrail-piston');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Helper to spawn process safely on Windows with retry for temporary file handle locks
const spawnWithRetry = (cmd, args, options, maxRetries = 5) => {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const trySpawn = () => {
      attempt++;
      try {
        const child = spawn(cmd, args, options);
        return resolve(child);
      } catch (err) {
        if (attempt < maxRetries && (err.code === 'UNKNOWN' || (err.message && err.message.includes('spawn UNKNOWN')))) {
          setTimeout(trySpawn, 40 * attempt);
        } else {
          return reject(err);
        }
      }
    };
    trySpawn();
  });
};

const truncateOutput = (str) => {
  if (!str) return '';
  if (Buffer.byteLength(str, 'utf8') > MAX_OUTPUT_BYTES) {
    return str.slice(0, 30000) + '\n... [Output truncated: exceeded output limit]';
  }
  return str;
};

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // GET /api/v2/runtimes
  if (req.method === 'GET' && (req.url === '/api/v2/runtimes' || req.url === '/api/v2/packages')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(RUNTIMES));
  }

  // POST /api/v2/execute
  if (req.method === 'POST' && (req.url === '/api/v2/execute' || req.url === '/api/v2/piston/execute')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const lang = (payload.language || 'javascript').toLowerCase();
        const files = payload.files || [];
        const stdin = payload.stdin || '';

        const fileContent = files[0]?.content || '';
        const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const workDir = path.join(tempDir, runId);
        fs.mkdirSync(workDir, { recursive: true });

        // C / C++
        if (lang === 'c++' || lang === 'cpp' || lang === 'c' || lang === 'cxx' || lang === 'g++' || lang === 'gcc') {
          const isC = lang === 'c' || lang === 'gcc';
          const srcFile = path.join(workDir, isC ? 'main.c' : 'main.cpp');
          const binFile = path.join(workDir, 'main.exe');
          fs.writeFileSync(srcFile, fileContent, 'utf8');

          const compilerCmd = isC ? `gcc "${srcFile}" -o "${binFile}"` : `g++ "${srcFile}" -o "${binFile}"`;

          // Compile Stage
          exec(compilerCmd, { timeout: COMPILE_TIMEOUT_MS, cwd: workDir }, async (compileErr, compileStdout, compileStderr) => {
            if (compileErr) {
              const isCompileTimeout = compileErr.killed;
              const compileOutput = truncateOutput((compileStderr || compileStdout || compileErr.message || '').trim());
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                language: isC ? 'c' : 'c++',
                version: '14.2.0',
                compile: {
                  stdout: truncateOutput(compileStdout || ''),
                  stderr: truncateOutput(compileStderr || compileErr.message),
                  output: compileOutput,
                  code: isCompileTimeout ? 124 : (compileErr.code || 1),
                  signal: isCompileTimeout ? 'SIGKILL' : null,
                  status: isCompileTimeout ? 'timeout' : null
                }
              }));
            }

            // Run Stage with retry for Windows filesystem file locks
            let child;
            let runStdout = '';
            let runStderr = '';
            let timedOut = false;

            try {
              child = await spawnWithRetry(binFile, [], { cwd: workDir });
            } catch (spawnErr) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                language: isC ? 'c' : 'c++',
                version: '14.2.0',
                run: {
                  stdout: '',
                  stderr: spawnErr.message,
                  output: `[Spawn Error]: ${spawnErr.message}`,
                  code: 1,
                  signal: null
                }
              }));
            }

            const timer = setTimeout(() => {
              timedOut = true;
              try { child.kill('SIGKILL'); } catch (e) {}
            }, RUN_TIMEOUT_MS);

            // Handle standard input (stdin) & always close stdin stream
            if (stdin) {
              try {
                child.stdin.write(stdin);
                child.stdin.end();
              } catch (stdinErr) {}
            } else {
              try {
                child.stdin.end();
              } catch (e) {}
            }

            child.stdout.on('data', d => {
              if (runStdout.length < MAX_OUTPUT_BYTES) {
                runStdout += d.toString();
              }
            });
            child.stderr.on('data', d => {
              if (runStderr.length < MAX_OUTPUT_BYTES) {
                runStderr += d.toString();
              }
            });

            child.on('close', (code, signal) => {
              clearTimeout(timer);
              const output = truncateOutput((runStdout + runStderr).trim());
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                language: isC ? 'c' : 'c++',
                version: '14.2.0',
                compile: {
                  stdout: compileStdout || '',
                  stderr: compileStderr || '',
                  output: (compileStdout + compileStderr).trim(),
                  code: 0,
                  signal: null
                },
                run: {
                  stdout: truncateOutput(runStdout),
                  stderr: truncateOutput(runStderr),
                  output,
                  code: timedOut ? 124 : (code ?? 0),
                  signal: timedOut ? 'SIGKILL' : (signal || null),
                  status: timedOut ? 'timeout' : null
                }
              }));

              try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}
            });

            child.on('error', (err) => {
              clearTimeout(timer);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                language: isC ? 'c' : 'c++',
                version: '14.2.0',
                run: {
                  stdout: '',
                  stderr: err.message,
                  output: err.message,
                  code: 1,
                  signal: null
                }
              }));
            });
          });

        } else if (lang === 'python' || lang === 'py' || lang === 'python3') {
          // Python
          const srcFile = path.join(workDir, 'main.py');
          fs.writeFileSync(srcFile, fileContent, 'utf8');

          let child;
          let runStdout = '';
          let runStderr = '';
          let timedOut = false;

          try {
            child = spawn('python', ['-u', srcFile], { cwd: workDir, windowsHide: true });
          } catch (spawnErr) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              language: 'python',
              version: '3.13.13',
              run: {
                stdout: '',
                stderr: spawnErr.message,
                output: spawnErr.message,
                code: 1,
                signal: null
              }
            }));
          }

          const timer = setTimeout(() => {
            timedOut = true;
            try { child.kill('SIGKILL'); } catch (e) {}
          }, RUN_TIMEOUT_MS);

          if (stdin) {
            try {
              child.stdin.write(stdin);
              child.stdin.end();
            } catch (stdinErr) {}
          } else {
            try {
              child.stdin.end();
            } catch (e) {}
          }

          child.stdout.on('data', d => {
            if (runStdout.length < MAX_OUTPUT_BYTES) {
              runStdout += d.toString();
            }
          });
          child.stderr.on('data', d => {
            if (runStderr.length < MAX_OUTPUT_BYTES) {
              runStderr += d.toString();
            }
          });

          child.on('close', (code, signal) => {
            clearTimeout(timer);
            const output = truncateOutput((runStdout + runStderr).trim());
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              language: 'python',
              version: '3.13.13',
              run: {
                stdout: truncateOutput(runStdout),
                stderr: truncateOutput(runStderr),
                output,
                code: timedOut ? 124 : (code ?? 0),
                signal: timedOut ? 'SIGKILL' : (signal || null),
                status: timedOut ? 'timeout' : null
              }
            }));
            try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}
          });

          child.on('error', (err) => {
            clearTimeout(timer);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              language: 'python',
              version: '3.13.13',
              run: {
                stdout: '',
                stderr: err.message,
                output: err.message,
                code: 1,
                signal: null
              }
            }));
          });

        } else if (lang === 'java') {
          // Java
          const srcFile = path.join(workDir, 'Main.java');
          fs.writeFileSync(srcFile, fileContent, 'utf8');

          exec(`javac "Main.java"`, { timeout: COMPILE_TIMEOUT_MS, cwd: workDir }, async (compileErr, compileStdout, compileStderr) => {
            if (compileErr) {
              const isCompileTimeout = compileErr.killed;
              const compileOutput = truncateOutput((compileStderr || compileStdout || compileErr.message || '').trim());
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                language: 'java',
                version: '17.0.10',
                compile: {
                  stdout: truncateOutput(compileStdout || ''),
                  stderr: truncateOutput(compileStderr || compileErr.message),
                  output: compileOutput,
                  code: isCompileTimeout ? 124 : (compileErr.code || 1),
                  signal: isCompileTimeout ? 'SIGKILL' : null,
                  status: isCompileTimeout ? 'timeout' : null
                }
              }));
            }

            let child;
            let runStdout = '';
            let runStderr = '';
            let timedOut = false;

            try {
              child = spawn('java', ['-cp', '.', 'Main'], { cwd: workDir, windowsHide: true });
            } catch (spawnErr) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                language: 'java',
                version: '17.0.10',
                run: {
                  stdout: '',
                  stderr: spawnErr.message,
                  output: spawnErr.message,
                  code: 1,
                  signal: null
                }
              }));
            }

            const timer = setTimeout(() => {
              timedOut = true;
              try { child.kill('SIGKILL'); } catch (e) {}
            }, RUN_TIMEOUT_MS);

            if (stdin) {
              try {
                child.stdin.write(stdin);
                child.stdin.end();
              } catch (stdinErr) {}
            } else {
              try {
                child.stdin.end();
              } catch (e) {}
            }

            child.stdout.on('data', d => {
              if (runStdout.length < MAX_OUTPUT_BYTES) {
                runStdout += d.toString();
              }
            });
            child.stderr.on('data', d => {
              if (runStderr.length < MAX_OUTPUT_BYTES) {
                runStderr += d.toString();
              }
            });

            child.on('close', (code, signal) => {
              clearTimeout(timer);
              const output = truncateOutput((runStdout + runStderr).trim());
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                language: 'java',
                version: '17.0.10',
                compile: {
                  stdout: compileStdout || '',
                  stderr: compileStderr || '',
                  output: (compileStdout + compileStderr).trim(),
                  code: 0,
                  signal: null
                },
                run: {
                  stdout: truncateOutput(runStdout),
                  stderr: truncateOutput(runStderr),
                  output,
                  code: timedOut ? 124 : (code ?? 0),
                  signal: timedOut ? 'SIGKILL' : (signal || null),
                  status: timedOut ? 'timeout' : null
                }
              }));
              try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}
            });

            child.on('error', (err) => {
              clearTimeout(timer);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                language: 'java',
                version: '17.0.10',
                run: {
                  stdout: '',
                  stderr: err.message,
                  output: err.message,
                  code: 1,
                  signal: null
                }
              }));
            });
          });

        } else {
          // JavaScript / Node.js
          const srcFile = path.join(workDir, 'main.js');
          fs.writeFileSync(srcFile, fileContent, 'utf8');

          let child;
          let runStdout = '';
          let runStderr = '';
          let timedOut = false;

          try {
            child = spawn('node', [srcFile], { cwd: workDir, windowsHide: true });
          } catch (spawnErr) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              language: 'javascript',
              version: '22.13.1',
              run: {
                stdout: '',
                stderr: spawnErr.message,
                output: spawnErr.message,
                code: 1,
                signal: null
              }
            }));
          }

          const timer = setTimeout(() => {
            timedOut = true;
            try { child.kill('SIGKILL'); } catch (e) {}
          }, RUN_TIMEOUT_MS);

          if (stdin) {
            try {
              child.stdin.write(stdin);
              child.stdin.end();
            } catch (stdinErr) {}
          } else {
            try {
              child.stdin.end();
            } catch (e) {}
          }

          child.stdout.on('data', d => {
            if (runStdout.length < MAX_OUTPUT_BYTES) {
              runStdout += d.toString();
            }
          });
          child.stderr.on('data', d => {
            if (runStderr.length < MAX_OUTPUT_BYTES) {
              runStderr += d.toString();
            }
          });

          child.on('close', (code, signal) => {
            clearTimeout(timer);
            const output = truncateOutput((runStdout + runStderr).trim());
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              language: 'javascript',
              version: '22.13.1',
              run: {
                stdout: truncateOutput(runStdout),
                stderr: truncateOutput(runStderr),
                output,
                code: timedOut ? 124 : (code ?? 0),
                signal: timedOut ? 'SIGKILL' : (signal || null),
                status: timedOut ? 'timeout' : null
              }
            }));
            try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}
          });

          child.on('error', (err) => {
            clearTimeout(timer);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              language: 'javascript',
              version: '22.13.1',
              run: {
                stdout: '',
                stderr: err.message,
                output: err.message,
                code: 1,
                signal: null
              }
            }));
          });
        }

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Piston execution internal error', error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Not Found' }));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Local Piston API Server v2 already running on http://localhost:${PORT}`);
  } else {
    console.error('Local Piston API Server error:', err.message);
  }
});

server.listen(PORT, () => {
  console.log(`Local Piston API Server v2 listening on http://localhost:${PORT}`);
});
