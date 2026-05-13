#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let api;
try {
  api = require('../dist/netlab.cjs.js');
} catch (error) {
  console.error('Run `npm run build` before `node scripts/bench-h2-h3.mjs`.');
  throw error;
}

const { QuicHandshake, WebCryptoProvider } = api;

function percentile(values, pct) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))] ?? 0;
}

export async function benchH2H3({ iterations = 100 } = {}) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto subtle is unavailable; QUIC WebCrypto bench cannot run.');
  }
  const provider = new WebCryptoProvider();
  const timings = [];
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    await new QuicHandshake(provider).connect({ alpn: 'h3' });
    timings.push(performance.now() - started);
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
  const metrics = await benchH2H3();
  console.log(JSON.stringify(metrics));
  if (ci && metrics.medianMs > 100) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('bench-h2-h3.mjs')) {
  await main();
}
