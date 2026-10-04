// @vitest-environment node
/**
 * How long one grade takes: prepare a ten-device topology once, then run six
 * probes on fresh engines. The ceiling is generous on purpose — it catches a
 * regression of an order of magnitude, not noise.
 */

import { expect, it } from 'vitest';
import type { Probe } from '../model/types';
import { tenNodeCampus } from '../templates/shared/build';
import { prepare } from './prepare';
import { runProbe } from './probe';

const PROBES: readonly Probe[] = [
  { via: 'ping', from: 'pc1', to: 'srv1' },
  { via: 'ping', from: 'pc2', to: 'srv2' },
  { via: 'ping', from: 'srv1', to: 'pc1' },
  { via: 'ping', from: 'pc1', to: 'pc2' },
  { via: 'tcp', from: 'pc1', to: 'srv1', dstPort: 80 },
  { via: 'tcp', from: 'pc2', to: 'srv2', dstPort: 443 },
];

const RUNS = 50;
const CEILING_MS = 250;

it(`a grade (prepare + six probes, ten devices) stays under ${CEILING_MS} ms`, async () => {
  const topology = tenNodeCampus();
  expect(topology.nodes).toHaveLength(10);

  const durations: number[] = [];
  for (let run = 0; run < RUNS; run += 1) {
    const started = performance.now();
    const prepared = prepare(topology);
    for (const probe of PROBES) {
      const facts = await runProbe(prepared, probe);
      expect(facts.status).toBe('delivered');
    }
    durations.push(performance.now() - started);
  }

  const mean = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  const sorted = [...durations].sort((left, right) => left - right);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  console.log(
    `[exercise timing] one grade: mean ${mean.toFixed(2)} ms, median ${(sorted[Math.floor(sorted.length / 2)] ?? 0).toFixed(2)} ms, ` +
      `p95 ${p95.toFixed(2)} ms, max ${Math.max(...durations).toFixed(2)} ms over ${RUNS} runs`,
  );
  expect(mean).toBeLessThan(CEILING_MS);
});
