import { describe, expect, it } from 'vitest';
import type { PacketHop, PacketTrace } from '../../src/types/simulation';
import { arpLearnedAt, arpTablesAtStep } from '../components/stateAtStep';

function hop(
  step: number,
  nodeId: string,
  event: PacketHop['event'],
  arp?: { senderIp: string; senderMac: string; targetIp: string },
): PacketHop {
  return {
    step,
    nodeId,
    nodeLabel: nodeId,
    srcIp: '0.0.0.0',
    dstIp: '0.0.0.0',
    ttl: 64,
    protocol: arp ? 'ARP' : 'ICMP',
    event,
    timestamp: step,
    ...(arp
      ? {
          arpFrame: {
            layer: 'L2',
            srcMac: arp.senderMac,
            dstMac: 'ff:ff:ff:ff:ff:ff',
            etherType: 0x0806,
            payload: {
              layer: 'ARP',
              hardwareType: 1,
              protocolType: 0x0800,
              operation: event === 'arp-request' ? 'request' : 'reply',
              senderMac: arp.senderMac,
              senderIp: arp.senderIp,
              targetMac: '00:00:00:00:00:00',
              targetIp: arp.targetIp,
            },
          } as unknown as NonNullable<PacketHop['arpFrame']>,
        }
      : {}),
  };
}

const ROUTER_TO_SERVER = '00:00:00:01:00:01';
const ROUTER_TO_CLIENT = '00:00:00:01:00:00';
const SERVER_MAC = '02:e1:2e:d8:d4:08';
const CLIENT_MAC = '02:ba:f8:a8:e8:08';

/** The ARP lesson's ping as the engine records it: out and back, the Router asking both ways. */
const TRACE: PacketTrace = {
  packetId: 'ping',
  srcNodeId: 'client-1',
  dstNodeId: 'server-1',
  status: 'delivered',
  hops: [
    hop(0, 'client-1', 'create'),
    hop(1, 'router-1', 'arp-request', {
      senderIp: '203.0.113.1',
      senderMac: ROUTER_TO_SERVER,
      targetIp: '203.0.113.10',
    }),
    hop(2, 'server-1', 'arp-reply', {
      senderIp: '203.0.113.10',
      senderMac: SERVER_MAC,
      targetIp: '203.0.113.1',
    }),
    hop(3, 'router-1', 'forward'),
    hop(4, 'server-1', 'deliver'),
    hop(5, 'server-1', 'create'),
    hop(6, 'router-1', 'arp-request', {
      senderIp: '10.0.0.1',
      senderMac: ROUTER_TO_CLIENT,
      targetIp: '10.0.0.10',
    }),
    hop(7, 'client-1', 'arp-reply', {
      senderIp: '10.0.0.10',
      senderMac: CLIENT_MAC,
      targetIp: '10.0.0.1',
    }),
    hop(8, 'router-1', 'forward'),
    hop(9, 'client-1', 'deliver'),
  ],
};

/** What the engine reports once the whole exchange has run. */
const FINAL = {
  'router-1': { '203.0.113.10': SERVER_MAC, '10.0.0.10': CLIENT_MAC },
  'server-1': { '203.0.113.1': ROUTER_TO_SERVER },
  'client-1': { '10.0.0.1': ROUTER_TO_CLIENT },
};

// TC-700: the ARP tables follow the step, and Reset (no step) goes back to the start.
describe('ARP tables at a step (TC-700)', () => {
  it('before any step holds only what the Client and Server knew from the start', () => {
    expect(arpTablesAtStep(TRACE, FINAL, -1)).toEqual({
      'router-1': {},
      'server-1': { '203.0.113.1': ROUTER_TO_SERVER },
      'client-1': { '10.0.0.1': ROUTER_TO_CLIENT },
    });
  });

  it('at the Router question the Router still knows nothing', () => {
    expect(arpTablesAtStep(TRACE, FINAL, 1)['router-1']).toEqual({});
  });

  it('at the Server answer the Router knows the Server, and only the Server', () => {
    expect(arpTablesAtStep(TRACE, FINAL, 2)['router-1']).toEqual({ '203.0.113.10': SERVER_MAC });
  });

  it('at the last step the tables are the engine’s final tables', () => {
    expect(arpTablesAtStep(TRACE, FINAL, 9)).toEqual(FINAL);
  });
});

// TC-701: the change card never shows a device learning its own address.
describe('what the Router learned at a step (TC-701)', () => {
  it('learns nothing at its own question', () => {
    expect(arpLearnedAt(TRACE, 1)).toEqual([]);
  });

  it('learns the Server’s address and MAC at the Server’s answer', () => {
    expect(arpLearnedAt(TRACE, 2)).toEqual([
      { nodeId: 'router-1', ip: '203.0.113.10', mac: SERVER_MAC },
    ]);
  });

  it('never lists the Router’s own addresses at any step', () => {
    const own = new Set(['203.0.113.1', '10.0.0.1']);
    for (let step = -1; step < TRACE.hops.length; step += 1) {
      const router = arpTablesAtStep(TRACE, FINAL, step)['router-1'] ?? {};
      expect(Object.keys(router).filter((ip) => own.has(ip))).toEqual([]);
    }
  });
});
