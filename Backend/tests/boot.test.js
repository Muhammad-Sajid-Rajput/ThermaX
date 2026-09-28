/**
 * Phase 1 proof test: the server fails fast at boot when no JWT secret is
 * configured. Spawns the real server.js in a child process with all JWT
 * secret sources removed AND a clean working directory, so the repo's
 * Backend/.env (which carries a dev secret) cannot be discovered by dotenv.
 */
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

function bootWithoutSecrets() {
  return new Promise((resolve) => {
    const emptyCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'thermax-boot-'));
    const env = { ...process.env };
    delete env.JWT_SECRET;
    delete env.JWT_ACCESS_SECRET;
    delete env.ACCESS_TOKEN_SECRET;

    // Absolute script path + empty cwd: dotenv finds no .env anywhere.
    const child = spawn(process.execPath, [path.join(backendDir, 'server.js')], {
      cwd: emptyCwd,
      env,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      fs.rmSync(emptyCwd, { recursive: true, force: true });
      resolve({ code: 'timeout', stderr });
    }, 20000);
    child.on('exit', (code) => {
      clearTimeout(timer);
      fs.rmSync(emptyCwd, { recursive: true, force: true });
      resolve({ code, stderr });
    });
  });
}

describe('boot fail-fast (Phase 1)', () => {
  it('exits nonzero with a FATAL message when no JWT secret is configured', async () => {
    const { code, stderr } = await bootWithoutSecrets();
    expect(code, `expected a nonzero exit, got ${code}; stderr: ${stderr}`).not.toBe(0);
    expect(code, `server should not have started; stderr: ${stderr}`).not.toBe('timeout');
    expect(stderr).toMatch(/FATAL/);
  }, 30000);
});
