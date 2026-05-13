#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let api;
try {
  api = require('../dist/netlab.cjs.js');
} catch (error) {
  console.error('Run `npm run build` before `node scripts/bench-tls.mjs`.');
  throw error;
}

const { TlsOrchestrator, WebCryptoProvider } = api;

function percentile(values, pct) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length));
  return sorted[index] ?? 0;
}

async function runOnce(provider) {
  const started = performance.now();
  await new TlsOrchestrator(provider).runHandshake({
    clientNodeId: 'client-1',
    serverNodeId: 'server-1',
    clientIp: '10.0.0.10',
    serverIp: '203.0.113.10',
    clientAlpn: ['http/1.1'],
    server: { enabled: true, alpnProtocols: ['http/1.1'] },
  });
  return performance.now() - started;
}

export async function benchTls({ iterations = 100 } = {}) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto subtle is unavailable; TLS WebCrypto bench cannot run.');
  }

  const provider = new WebCryptoProvider();
  const timings = [];
  for (let index = 0; index < iterations; index += 1) {
    timings.push(await runOnce(provider));
  }

  return {
    iterations,
    minMs: Math.min(...timings),
    maxMs: Math.max(...timings),
    medianMs: percentile(timings, 50),
    p95Ms: percentile(timings, 95),
  };
}

async function main() {
  const ci = process.argv.includes('--ci');
  const metrics = await benchTls();
  console.log(JSON.stringify(metrics));
  if (ci && (metrics.medianMs > 50 || metrics.p95Ms > 120)) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('bench-tls.mjs')) {
  await main();
}
