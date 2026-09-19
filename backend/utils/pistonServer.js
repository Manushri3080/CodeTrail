const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');

const PORT = 2000;
const COMPILE_TIMEOUT_MS = 10000;
const RUN_TIMEOUT_MS = 3000;

// Host compiler versions
const RUNTIMES = [
  {
    language: 'c++',
    version: '6.3.0',
    aliases: ['cpp', 'g++', 'cxx', 'c']
  },
  {
    language: 'python',
    version: '3.13.14',
    aliases: ['py', 'python3', 'py3']
  },
  {
    language: 'javascript',
    version: '24.14.1',
    aliases: ['js', 'node', 'nodejs']
  }
];

const tempDir = path.join(os.tmpdir(), 'codetrail-piston');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

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

        if (lang === 'c++' || lang === 'cpp' || lang === 'c') {
          const srcFile = path.join(workDir, 'main.cpp');
          const binFile = path.join(workDir, 'main.exe');
          fs.writeFileSync(srcFile, fileContent, 'utf8');

          // Compile Stage
          exec(`g++ "${srcFile}" -o "${binFile}"`, { timeout: COMPILE_TIMEOUT_MS, cwd: workDir }, (compileErr, compileStdout, compileStderr) => {
            if (compileErr) {
              const isCompileTimeout = compileErr.killed;
              const compileOutput = (compileStderr || compileStdout || compileErr.message || '').trim();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                language: 'c++',
                version: '6.3.0',
                compile: {
                  stdout: compileStdout || '',
                  stderr: compileStderr || compileErr.message,
                  output: compileOutput,
                  code: isCompileTimeout ? 124 : (compileErr.code || 1),
                  signal: isCompileTimeout ? 'SIGKILL' : null,
                  status: isCompileTimeout ? 'timeout' : null
                }
              }));
            }

            // Run Stage
            const child = spawn(binFile, [], { cwd: workDir, timeout: RUN_TIMEOUT_MS });
            let runStdout = '';
            let runStderr = '';
            let timedOut = false;

            const timer = setTimeout(() => {
              timedOut = true;
              try { child.kill('SIGKILL'); } catch (e) {}
            }, RUN_TIMEOUT_MS);

            if (stdin) {
              child.stdin.write(stdin);
              child.stdin.end();
            }

            child.stdout.on('data', d => { runStdout += d.toString(); });
            child.stderr.on('data', d => { runStderr += d.toString(); });

            child.on('close', (code, signal) => {
              clearTimeout(timer);
              const output = (runStdout + runStderr).trim();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                language: 'c++',
                version: '6.3.0',
                compile: {
                  stdout: compileStdout || '',
                  stderr: compileStderr || '',
                  output: (compileStdout + compileStderr).trim(),
                  code: 0,
                  signal: null
                },
                run: {
                  stdout: runStdout,
                  stderr: runStderr,
                  output,
                  code: timedOut ? 124 : (code ?? 0),
                  signal: timedOut ? 'SIGKILL' : (signal || null),
                  status: timedOut ? 'timeout' : null
                }
              }));

              // Cleanup
              try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}
            });

            child.on('error', (err) => {
              clearTimeout(timer);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                language: 'c++',
                version: '6.3.0',
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
          const srcFile = path.join(workDir, 'main.py');
          fs.writeFileSync(srcFile, fileContent, 'utf8');

          const child = spawn('python', ['-u', srcFile], { cwd: workDir, timeout: RUN_TIMEOUT_MS });
          let runStdout = '';
          let runStderr = '';
          let timedOut = false;

          const timer = setTimeout(() => {
            timedOut = true;
            try { child.kill('SIGKILL'); } catch (e) {}
          }, RUN_TIMEOUT_MS);

          if (stdin) {
            child.stdin.write(stdin);
            child.stdin.end();
          }

          child.stdout.on('data', d => { runStdout += d.toString(); });
          child.stderr.on('data', d => { runStderr += d.toString(); });

          child.on('close', (code, signal) => {
            clearTimeout(timer);
            const output = (runStdout + runStderr).trim();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              language: 'python',
              version: '3.13.14',
              run: {
                stdout: runStdout,
                stderr: runStderr,
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
              version: '3.13.14',
              run: {
                stdout: '',
                stderr: err.message,
                output: err.message,
                code: 1,
                signal: null
              }
            }));
          });

        } else {
          // JavaScript / Node.js
          const srcFile = path.join(workDir, 'main.js');
          fs.writeFileSync(srcFile, fileContent, 'utf8');

          const child = spawn('node', [srcFile], { cwd: workDir, timeout: RUN_TIMEOUT_MS });
          let runStdout = '';
          let runStderr = '';
          let timedOut = false;

          const timer = setTimeout(() => {
            timedOut = true;
            try { child.kill('SIGKILL'); } catch (e) {}
          }, RUN_TIMEOUT_MS);

          if (stdin) {
            child.stdin.write(stdin);
            child.stdin.end();
          }

          child.stdout.on('data', d => { runStdout += d.toString(); });
          child.stderr.on('data', d => { runStderr += d.toString(); });

          child.on('close', (code, signal) => {
            clearTimeout(timer);
            const output = (runStdout + runStderr).trim();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              language: 'javascript',
              version: '24.14.1',
              run: {
                stdout: runStdout,
                stderr: runStderr,
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
              version: '24.14.1',
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

server.listen(PORT, () => {
  console.log(`Local Piston API Server v2 listening on http://localhost:${PORT}`);
});
