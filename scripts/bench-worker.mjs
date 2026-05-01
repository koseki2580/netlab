#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 4173);
const HOST = `http://127.0.0.1:${PORT}`;
const RUNS = Number(process.env.RUNS ?? 20);

function waitForServer(stream) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timed out waiting for Vite')), 30_000);
    stream.on('data', (chunk) => {
      const text = String(chunk);
      if (text.includes(`localhost:${PORT}`) || text.includes(`127.0.0.1:${PORT}`)) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}

async function main() {
  const server = spawn(
    'npm',
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT), '--mode', 'test'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', VITE_E2E: 'true' },
    },
  );
  server.stderr.pipe(process.stderr);
  let browser;

  try {
    await Promise.race([waitForServer(server.stdout), once(server, 'exit')]);
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`${HOST}/#/simulation/step`);
    await page.locator('[data-testid="netlab-root"]').waitFor();
    await page.waitForFunction(() => {
      const trace = window.__NETLAB_TRACE__;
      return trace && Array.isArray(trace.traces) && trace.traces.length > 0;
    });

    const samples = [];
    for (let i = 0; i < RUNS; i += 1) {
      const start = await page.evaluate(() => performance.now());
      await page.getByRole('button', { name: /step/i }).first().click();
      const elapsed = await page.evaluate((then) => performance.now() - then, start);
      samples.push(elapsed);
      await page.getByRole('button', { name: /reset/i }).click();
    }

    await browser.close();
    browser = undefined;
    samples.sort((a, b) => a - b);
    const p50 = samples[Math.floor(samples.length * 0.5)] ?? 0;
    const p95 = samples[Math.floor(samples.length * 0.95)] ?? p50;
    console.log(
      JSON.stringify(
        {
          demo: '/simulation/step',
          runs: RUNS,
          p50Ms: Number(p50.toFixed(2)),
          p95Ms: Number(p95.toFixed(2)),
          targetMs: 1000,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser?.close();
    server.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
