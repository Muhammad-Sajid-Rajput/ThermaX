import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mlDir = path.join(__dirname, '..', 'ML');

function getPythonExecutable() {
  const candidates = [
    // Windows virtual environments
    path.join(mlDir, '.venv', 'Scripts', 'python.exe'),
    path.join(mlDir, 'venv', 'Scripts', 'python.exe'),
    // Unix/macOS virtual environments
    path.join(mlDir, '.venv', 'bin', 'python'),
    path.join(mlDir, 'venv', 'bin', 'python'),
    // System fallbacks
    'python',
    'python3',
    'py',
  ];

  for (const candidate of candidates) {
    if (candidate.includes(path.sep)) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  // Fallback to bare system command
  return process.platform === 'win32' ? 'py' : 'python3';
}

const pythonCmd = getPythonExecutable();
console.log(`[ML Runner] Starting ML microservice with: ${pythonCmd}`);

const proc = spawn(pythonCmd, ['main.py'], {
  cwd: mlDir,
  stdio: 'inherit',
});

proc.on('error', (err) => {
  console.error(`[ML Runner] Failed to start Python process: ${err.message}`);
  process.exit(1);
});

proc.on('close', (code) => {
  process.exit(code ?? 0);
});

process.on('SIGINT', () => {
  proc.kill('SIGINT');
});

process.on('SIGTERM', () => {
  proc.kill('SIGTERM');
});
