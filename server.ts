// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
/**
 * Mouhassil — Universal Server Runner
 * Works seamlessly across both Development and Production deployments:
 * 1. Production (Cloud Run): Runs pre-bundled dist/server.js with pure Node (zero flags needed)
 * 2. Development: Spawns/loads with tsx and mounts Vite middleware
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bundledServer = path.resolve(__dirname, 'dist', 'server.js');

if (fs.existsSync(bundledServer)) {
  // Production mode: run pre-bundled server
  await import(bundledServer);
} else {
  // Development / direct mode: ensure tsx loader is active
  const isTsxActive = process.execArgv.some(arg => arg.includes('tsx')) || process.env._TSX_LOADED === '1';
  if (!isTsxActive) {
    process.env._TSX_LOADED = '1';
    const child = spawn(process.execPath, ['--import', 'tsx', __filename, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: process.env
    });
    child.on('exit', (code, signal) => {
      process.exit(code ?? (signal ? 1 : 0));
    });
  } else {
    await import('./src/server/app.ts');
  }
}
