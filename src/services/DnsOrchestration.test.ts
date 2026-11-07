import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../cli/runtime';
import { HookEngine } from '../hooks/HookEngine';
import { SimulationEngine } from '../simulation/SimulationEngine';
import type { PacketTrace } from '../types/simulation';
import { dnsLabTopology } from './dnsFixture';

function engine() {
  return new SimulationEngine(enrichTopology(dnsLabTopology()), new HookEngine(), {
    useMainThread: true,
  });
}

/** Who sent each DNS message, and whether it is a query or a response. */
const steps = (traces: readonly PacketTrace[]) =>
  traces.map((trace) => {
    const create = trace.hops[0];
    return `${create?.nodeLabel ?? '?'}→${create?.dstIp ?? '?'} ${trace.label ?? ''}`.trim();
  });

// TC-1221
describe('the resolution chain in the engine', () => {
  it('puts the stub query, three exchanges and the answer on the wire, in order', async () => {
    const sim = engine();
    expect(await sim.simulateDns('client', 'www.example.com')).toBe('192.0.2.80');
    const traces = sim.getState().traces;
    expect(traces.every((trace) => trace.status === 'delivered')).toBe(true);
    expect(steps(traces)).toEqual([
      'PC→10.0.0.53 DNS QUERY',
      'Resolver→198.41.0.4 DNS QUERY',
      'Root→10.0.0.53 DNS RESPONSE',
      'Resolver→192.5.6.30 DNS QUERY',
      'com→10.0.0.53 DNS RESPONSE',
      'Resolver→192.0.2.53 DNS QUERY',
      'example.com→10.0.0.53 DNS RESPONSE',
      'Resolver→10.0.0.10 DNS RESPONSE',
    ]);
    sim.dispose();
  });

  it('answers a second client from the resolver’s cache, with nobody else asked', async () => {
    const sim = engine();
    await sim.simulateDns('client', 'www.example.com');
    sim.clearTraces();
    expect(await sim.simulateDns('client-b', 'www.example.com')).toBe('192.0.2.80');
    expect(steps(sim.getState().traces)).toEqual([
      'PC-B→10.0.0.53 DNS QUERY',
      'Resolver→10.0.0.11 DNS RESPONSE',
    ]);
    sim.dispose();
  });

  it('gives NXDOMAIN for an unknown name, and no address', async () => {
    const sim = engine();
    expect(await sim.simulateDns('client', 'nope.example.com')).toBeNull();
    const all = sim.getState().traces;
    const last = all[all.length - 1];
    expect(last?.label).toBe('DNS RESPONSE');
    sim.dispose();
  });
});
