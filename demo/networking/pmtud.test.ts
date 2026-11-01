import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { buildFragmentedEchoTopology } from '../../src/scenarios/fragmented-echo';
import { SimulationEngine } from '../../src/simulation/SimulationEngine';
import type { PacketTrace } from '../../src/types/simulation';
import { buildEchoPacket, pathMtuOf, pmtudDataBytes, readFragNeeded } from './pmtud';

const HOST_B_IP = '203.0.113.10';

async function sendDf(engine: SimulationEngine, dataBytes: number): Promise<PacketTrace> {
  const topology = engine.getTopology();
  const packet = buildEchoPacket(topology, true, dataBytes);
  if (!packet) throw new Error('the lesson topology lost a host');
  await engine.send(packet);
  const trace = engine.getState().traces.find((t) => t.packetId === packet.id);
  if (!trace) throw new Error('no trace for the packet');
  return trace;
}

function lessonEngine(tunnelMtu: number): SimulationEngine {
  return new SimulationEngine(
    enrichTopology(buildFragmentedEchoTopology(tunnelMtu)),
    new HookEngine(),
    {
      useMainThread: true,
    },
  );
}

// TC-980 — path MTU discovery (RFC 1191) as the MTU lesson reads it from the simulator.
describe('path MTU discovery in the MTU lesson', () => {
  it.each([604, 300, 1000])(
    'at tunnel MTU %i: R1 answers with the MTU, Host A remembers it, and a packet that size arrives',
    async (tunnelMtu) => {
      const engine = lessonEngine(tunnelMtu);
      expect(pathMtuOf(engine, HOST_B_IP)).toBeNull();

      const first = await sendDf(engine, 1200);
      expect(readFragNeeded(first)).toEqual({ routerLabel: 'R1', reportedMtu: tunnelMtu });
      expect(pathMtuOf(engine, HOST_B_IP)).toBe(tunnelMtu);

      const fits = await sendDf(engine, pmtudDataBytes(tunnelMtu));
      expect(readFragNeeded(fits)).toBeNull();
      expect(fits.hops[fits.hops.length - 1]).toMatchObject({ nodeId: 'host-b', event: 'deliver' });
      expect(fits.hops.some((hop) => hop.action === 'fragment')).toBe(false);

      // One byte more is refused again: the reported MTU is the largest that passes.
      const tooBig = await sendDf(engine, pmtudDataBytes(tunnelMtu) + 1);
      expect(readFragNeeded(tooBig)?.reportedMtu).toBe(tunnelMtu);
      engine.dispose();
    },
  );

  it('fills a packet of the path MTU with the IP and ICMP headers counted', () => {
    expect(pmtudDataBytes(604)).toBe(576);
  });
});
