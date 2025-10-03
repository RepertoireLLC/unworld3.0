import { spawn } from 'child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function startProcess(name, args) {
  const child = spawn(npmCmd, args, { stdio: 'inherit', env: process.env });
  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`[enclypse] ${name} exited with code ${code}`);
    }
    shutdown();
  });
  return child;
}

const backend = startProcess('backend', ['run', 'backend:start']);
let electronProcess;

setTimeout(() => {
  electronProcess = startProcess('electron', ['run', 'electron:start']);
}, 1500);

function shutdown() {
  if (backend && !backend.killed) backend.kill();
  if (electronProcess && !electronProcess.killed) electronProcess.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
