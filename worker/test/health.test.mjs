import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const port = 8788;
const persistPath = join(tmpdir(), `cuellar-photography-worker-test-${process.pid}`);
const wranglerPath = resolve('node_modules/wrangler/bin/wrangler.js');
const worker = spawn(process.execPath, [
  wranglerPath,
  'dev',
  '--local',
  '--ip',
  '127.0.0.1',
  '--port',
  String(port),
  '--persist-to',
  persistPath,
  '--log-level',
  'error',
], { stdio: ['ignore', 'pipe', 'pipe'] });

async function waitForHealth() {
  let lastError;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError ?? new Error('Worker local did not start.');
}

try {
  const health = await waitForHealth();
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    service: 'cuellar-photography-worker',
    environment: 'local',
  });

  const missingRoute = await fetch(`http://127.0.0.1:${port}/missing`);
  assert.equal(missingRoute.status, 404);

  console.log('PASS Worker health endpoint');
} finally {
  worker.kill();
  await once(worker, 'exit');
  await rm(persistPath, { force: true, recursive: true });
}