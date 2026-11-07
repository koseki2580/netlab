import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { dnsLabTopology } from '../../src/services/dnsFixture';
import { SimulationEngine } from '../../src/simulation/SimulationEngine';
import { describeStep, dnsSteps } from './dnsResolutionLesson';

const en = (english: string) => english;
const ja = (_english: string, japanese: string) => japanese;

async function lookup(engine: SimulationEngine, client: string, name: string) {
  engine.clearTraces();
  await engine.simulateDns(client, name);
  return dnsSteps(engine.getTopology(), engine.getState().traces, (id) =>
    engine.exportPcapRecords(id),
  );
}

// TC-1233
describe('the DNS resolution lesson, read from the simulator', () => {
  it('shows the walk, then the cache, then NXDOMAIN and its negative cache', async () => {
    const engine = new SimulationEngine(enrichTopology(dnsLabTopology()), new HookEngine(), {
      useMainThread: true,
    });
    const first = await lookup(engine, 'client', 'www.example.com');
    expect(first.map((step) => describeStep(step, en))).toEqual([
      'PC → Resolver: query www.example.com A? (RD 1)',
      'Resolver → Root: query www.example.com A? (RD 0)',
      'Root → Resolver: referral: ask com at a.gtld-servers.net (a.gtld-servers.net = 192.5.6.30)',
      'Resolver → com: query www.example.com A? (RD 0)',
      'com → Resolver: referral: ask example.com at ns1.example.com (ns1.example.com = 192.0.2.53)',
      'Resolver → example.com: query www.example.com A? (RD 0)',
      'example.com → Resolver: authoritative answer: www.example.com CNAME web.example.com (TTL 300); web.example.com A 192.0.2.80 (TTL 300)',
      expect.stringMatching(
        /^Resolver → PC: answer: www\.example\.com CNAME web\.example\.com \(TTL (300|299)\)/,
      ),
    ]);

    const second = await lookup(engine, 'client-b', 'www.example.com');
    expect(second).toHaveLength(2);
    expect(describeStep(second[1]!, ja)).toMatch(/^Resolver → PC-B: 回答：www\.example\.com CNAME/);

    const nx = await lookup(engine, 'client', 'nope.example.com');
    expect(describeStep(nx[nx.length - 1]!, en)).toBe(
      'Resolver → PC: NXDOMAIN: no such name (SOA example.com, keep for 60 s)',
    );
    const nxAgain = await lookup(engine, 'client-b', 'nope.example.com');
    expect(nxAgain).toHaveLength(2);
    expect(describeStep(nxAgain[1]!, en)).toMatch(/^Resolver → PC-B: NXDOMAIN/);
    engine.dispose();
  });
});
