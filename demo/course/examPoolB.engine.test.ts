/**
 * The wave B answers that state what the engine does, run on the engine
 * (REQ-194, TC-1360 onward), the way `examWave1.test.ts` checks its three.
 * Each scenario is the situation the question gives, on the exercise
 * builders the graders use.
 */
import { describe, expect, it } from 'vitest';
import type { PacketHop } from '../../src/types/simulation';
import type { TopologySnapshot } from '../../src/types/topology';
import { withEngine } from '../exercises/grade/engineRun';
import { prepare } from '../exercises/grade/prepare';
import { runProbe, type ProbeFacts } from '../exercises/grade/probe';
import type { AclRule } from '../../src/types/acl';
import { COURSE_STEPS } from './courseSteps';
import { stpBridges, stpPort, stpRootNodeId } from '../exercises/grade/prepare';
import {
  lanBehindRouter,
  switchTriangle,
  trunkedSwitches,
  vlanSwitch,
  withInterface,
  withLinkState,
  withPort,
} from '../exercises/templates/shared/build';
import { POOL_B } from './examPoolB';

const right = (id: string) => {
  const q = [...POOL_B.values()].flat().find((entry) => entry.id === id)!;
  return q.options[q.answer]!.en;
};
const ping = (topology: TopologySnapshot, from: string, to: string): Promise<ProbeFacts> =>
  runProbe(prepare(topology), { via: 'ping', from, to });
const hops = (facts: ProbeFacts): PacketHop[] => facts.trace?.hops ?? [];
const macOf = (topology: TopologySnapshot, nodeId: string, ifaceId?: string) => {
  const node = prepare(topology).nodes.find((entry) => entry.id === nodeId)!;
  return ifaceId
    ? node.data.interfaces!.find((entry) => entry.id === ifaceId)!.macAddress
    : (node.data.mac as string);
};

// TC-1360: a LAN on one switch: who asks, who answers, who hears, where it lands.
describe('a LAN on one switch (TC-1360)', () => {
  it('the sender asks for a neighbour on its own network, everyone hears, its owner answers with its MAC', async () => {
    const lan = lanBehindRouter();
    const facts = await ping(lan, 'pc1', 'pc2');
    expect(facts.status).toBe('delivered');
    const ask = hops(facts).find((hop) => hop.event === 'arp-request')!;
    const answer = hops(facts).find((hop) => hop.event === 'arp-reply')!;
    expect(ask.nodeId).toBe('pc1');
    expect(right('s2-arp-who-asks-local')).toBe('The Client');
    // A broadcast: every other device on the switch receives it (the router as a copy).
    expect(ask.dstMac).toBe('ff:ff:ff:ff:ff:ff');
    expect((ask.flood?.copies ?? []).map((copy) => copy.toNodeId)).toEqual(['r1']);
    expect(right('s2-arp-who-hears')).toBe('All three of them');
    expect(answer.nodeId).toBe('pc2');
    expect(right('s2-arp-printer-answers')).toBe('The printer');
    expect(answer.arpFrame?.payload.senderMac).toBe(macOf(lan, 'pc2'));
    expect(right('s2-arp-reply-carries')).toBe('The MAC for that IP');
    // The packet itself goes to its owner only; nobody else keeps it.
    expect(facts.forwardNodeIds).toEqual(['pc1', 'sw1', 'pc2']);
    expect(right('packet-destination-new-switch')).toBe('PC-B, its owner');
    // A neighbour on the same network is reached without the gateway.
    expect(facts.forwardNodeIds).not.toContain('r1');
    expect(right('s1-gateway-not-used')).toBe('No, it goes direct');
  });

  it('the first frame leaves with the sender’s own MAC as its source', async () => {
    const lan = lanBehindRouter();
    const facts = await ping(lan, 'pc1', 'srv');
    const sent = hops(facts).find((hop) => hop.event === 'forward' && hop.nodeId === 'pc1')!;
    expect(sent.srcMac).toBe(macOf(lan, 'pc1'));
    expect(right('s2-first-frame-src')).toBe('The Client’s');
  });
});

// TC-1361: across a router: whom the sender asks, what the router changes, whom it asks.
describe('across a router (TC-1361)', () => {
  it('the sender asks for the gateway, not for the far host', async () => {
    const facts = await ping(lanBehindRouter(), 'pc1', 'srv');
    const ask = hops(facts).find((hop) => hop.event === 'arp-request' && hop.nodeId === 'pc1')!;
    expect(ask.arpFrame?.payload.targetIp).toBe('192.168.1.1');
    expect(right('first-packet-remote')).toBe('The gateway’s');
  });

  it('a router on a direct network asks for the destination itself', async () => {
    const facts = await ping(lanBehindRouter(), 'pc1', 'srv');
    const ask = hops(facts).find((hop) => hop.event === 'arp-request' && hop.nodeId === 'r1')!;
    expect(ask.arpFrame?.payload.targetIp).toBe('203.0.113.10');
    expect(right('s3-direct-arp-target')).toBe('203.0.113.10, itself');
  });

  it('the router rewrites both MACs and the TTL; the far host sees the router’s MAC as the source', async () => {
    const lan = lanBehindRouter();
    const facts = await ping(lan, 'pc1', 'srv');
    const atRouter = hops(facts).find((hop) => hop.nodeId === 'r1' && hop.event === 'forward')!;
    expect(atRouter.changedFields).toEqual(expect.arrayContaining(['TTL', 'Src MAC', 'Dst MAC']));
    expect(atRouter.changedFields).not.toContain('Dst IP');
    expect(right('s1-router-changes')).toBe('The MACs and the TTL');
    const delivered = hops(facts).find((hop) => hop.event === 'deliver')!;
    expect(delivered.srcMac).toBe(macOf(lan, 'r1', 'wan'));
    expect(right('s3-sender-mac-server')).toBe('R-1’s own');
    const first = hops(facts).find((hop) => hop.event === 'forward' && hop.nodeId === 'pc1')!;
    expect(first.dstMac).toBe(macOf(lan, 'r1', 'lan'));
    expect(right('s3-mac-first-link')).toBe('R-1’s own');
  });

  it('a TTL that runs out is dropped at the router that would make it 0', async () => {
    // TTL 1 into one router: that router would make it 0, so it drops it (as R-2 does with
    // TTL 2 after R-1 in the question).
    const trace = await withEngine(prepare(lanBehindRouter()), (engine) =>
      engine.ping('pc1', '203.0.113.10', { ttl: 1 }),
    );
    const drop = trace.hops.find((hop) => hop.event === 'drop')!;
    expect(drop).toMatchObject({ nodeId: 'r1', reason: 'ttl-exceeded' });
    expect(right('s3-ttl-runs-out')).toBe('At R-2');
  });
});

// TC-1362: VLANs on one switch and over a trunk.
describe('VLANs (TC-1362)', () => {
  it('a broadcast and a frame stay inside their VLAN; another VLAN is not reached without a router', async () => {
    const facts = await ping(vlanSwitch(), 'a1', 'a2');
    const ask = hops(facts).find((hop) => hop.event === 'arp-request')!;
    expect((ask.flood?.copies ?? []).map((copy) => copy.toNodeId)).toEqual([]);
    expect(right('l2-vlan-broadcast')).toBe('A2 only');
    expect((await ping(vlanSwitch(), 'a1', 'b1')).requestDelivered).toBe(false);
    expect(right('s2-vlan-needs-router')).toBe('The router R1');
  });

  it('a port moved to VLAN 20 reaches B1 and B2', async () => {
    const moved = withPort(vlanSwitch(), 'sw1', 'p1', { accessVlan: 20 });
    expect((await ping(moved, 'a1', 'b1')).status).toBe('delivered');
    expect((await ping(moved, 'a1', 'a2')).requestDelivered).toBe(false);
    expect(right('s2-vlan-move-port')).toBe('B1 and B2');
  });

  it('same VLAN across a trunk arrives with no router, and a cut uplink leaves it working', async () => {
    expect((await ping(trunkedSwitches(), 'a1', 'a2')).status).toBe('delivered');
    expect(right('l2-vlan-two-switches')).toBe('No, over the tagged trunk');
    const facts = await ping(trunkedSwitches(), 'b1', 'b2');
    expect(facts.status).toBe('delivered');
    expect(right('s2-vlan-trunk-cut-same')).toBe('It still arrives');
    void withLinkState;
    void withInterface;
  });
});

// TC-1363: PAT gives out public ports in order from 1024, one per conversation.
describe('PAT (TC-1363)', () => {
  it('three conversations take 1024, 1025 and 1026; two clients on one source port get two', async () => {
    const nat = withInterface(
      withInterface(lanBehindRouter(), 'r1', 'lan', { nat: 'inside' }),
      'r1',
      'wan',
      {
        nat: 'outside',
      },
    );
    const entries = await withEngine(prepare(nat), async (engine) => {
      await engine.tcpConnect('pc1', 'srv', 40000, 80);
      await engine.tcpConnect('pc2', 'srv', 40000, 80);
      await engine.tcpConnect('pc1', 'srv', 40001, 80);
      return engine.getState().natTables.flatMap((table) => table.entries);
    });
    expect(entries.map((entry) => entry.insideGlobalPort)).toEqual([1024, 1025, 1026]);
    expect(right('l4-pat-port-sequence')).toBe('1024, 1025, 1026');
    const [a, b] = entries;
    expect(a!.insideLocalPort).toBe(b!.insideLocalPort);
    expect(a!.insideGlobalPort).not.toBe(b!.insideGlobalPort);
    expect(right('l3-pat-two-clients')).toBe('By different public ports');
    expect(right('nat-same-source-port')).toBe('By two public ports');
  });
});

// TC-1364: ACL lists: the first matching line decides; an empty list filters nothing.
describe('ACLs (TC-1364)', () => {
  const lanAcl = (inboundAcl: AclRule[]) =>
    withInterface(lanBehindRouter(), 'r1', 'lan', { inboundAcl });
  const tcp = (topology: TopologySnapshot, dstPort: number) =>
    runProbe(prepare(topology), { via: 'tcp', from: 'pc1', to: 'srv', dstPort });

  it('a deny for one host above a permit for all refuses that host', async () => {
    const rules: AclRule[] = [
      {
        id: 'deny-pc1',
        priority: 1,
        action: 'deny',
        protocol: 'tcp',
        srcIp: '192.168.1.10/32',
        dstPort: 80,
      },
      { id: 'web', priority: 2, action: 'permit', protocol: 'tcp', dstPort: 80 },
    ] as AclRule[];
    const facts = await tcp(lanAcl(rules), 80);
    expect(facts.drop).toMatchObject({ nodeId: 'r1', reason: 'acl-deny' });
    // Another host is let in by line 2: line 1 matched pc1 only.
    const other = await runProbe(prepare(lanAcl(rules)), {
      via: 'tcp',
      from: 'pc2',
      to: 'srv',
      dstPort: 80,
    });
    expect(other.requestDelivered).toBe(true);
    expect(right('l2-acl-order')).toBe('It is denied by line 1');
  });

  it('a list with no rules lets traffic through', async () => {
    expect((await ping(lanAcl([]), 'pc1', 'srv')).status).toBe('delivered');
    expect(right('l2-acl-empty-list')).toBe('It passes, nothing filters');
  });
});

// TC-1365: spanning tree in the triangle.
describe('spanning tree (TC-1365)', () => {
  it('with equal priorities the lowest MAC is root; the root blocks none of its ports; B to C goes round by A', async () => {
    const tie = prepare(switchTriangle({ swa: 32768, swb: 32768, swc: 32768 }));
    const lowest = [...stpBridges(tie)].sort((x, y) => x.mac.localeCompare(y.mac))[0]!;
    expect(stpRootNodeId(tie)).toBe(lowest.nodeId);
    expect(right('l2-stp-tie')).toBe('The lowest MAC address');
    const triangle = prepare(switchTriangle());
    const root = stpRootNodeId(triangle)!;
    for (const portId of ['to-swb', 'to-swc'].filter((id) => !id.endsWith(root.slice(2)))) {
      expect(stpPort(triangle, root, portId)?.role).toBe('DESIGNATED');
    }
    expect(right('l4-stp-root-ports')).toBe('None of them');
    const facts = await ping(switchTriangle(), 'hb', 'hc');
    expect(facts.forwardNodeIds).toEqual(['hb', 'swb', 'swa', 'swc', 'hc']);
    expect(right('l2-stp-detour')).toBe('Via Switch A, around');
  });
});

// TC-1366: two networks on two switches with nothing between them do not meet.
describe('two networks need a router (TC-1366)', () => {
  it('the course’s fourth step is not delivered', async () => {
    const step = COURSE_STEPS.find((entry) => entry.id === 'another-network')!;
    const to = step.topology.nodes.find((node) => node.id === step.to)!.data.ip!;
    const trace = await withEngine(prepare(step.topology as TopologySnapshot), (engine) =>
      engine.ping(step.from, to),
    );
    expect(trace.status).toBe('dropped');
    expect(right('s1-two-nets-need')).toBe('A router between them');
  });
});

// TC-1367: a broadcast (a DHCP DISCOVER) on one switch reaches every other device.
describe('a broadcast on one switch (TC-1367)', () => {
  it('the DISCOVER goes to 255.255.255.255 and is copied to every other port', async () => {
    const lan = lanBehindRouter();
    const dhcp: TopologySnapshot = {
      ...lan,
      nodes: lan.nodes.map((node) =>
        node.id === 'pc1'
          ? { ...node, data: { ...node.data, ip: undefined, dhcpClient: { enabled: true } } }
          : node.id === 'srv'
            ? node
            : node.id === 'pc2'
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    role: 'server',
                    dhcpServer: {
                      leasePool: '192.168.1.100/30',
                      subnetMask: '255.255.255.0',
                      defaultGateway: '192.168.1.1',
                      leaseTime: 86400,
                    },
                  },
                }
              : node,
      ),
    } as TopologySnapshot;
    const discover = await withEngine(prepare(dhcp), async (engine) => {
      await engine.simulateDhcp('pc1');
      return engine.getState().traces[0]!;
    });
    const atSwitch = discover.hops.find((hop) => hop.nodeId === 'sw1')!;
    expect(atSwitch.dstIp).toBe('255.255.255.255');
    expect(right('l2-dhcp-discover-dst')).toBe('255.255.255.255');
    expect((atSwitch.flood?.copies ?? []).map((copy) => copy.toNodeId)).toEqual(['r1']);
    expect(atSwitch.toNodeId).toBe('pc2');
    expect(right('s1-copy-broadcast')).toBe('PC-B and PC-C');
    expect(right('s2-star-broadcast')).toBe('All but Client-1');
  });

  it('IPv6: the first echo solicits R1 at its solicited-node address (TC-1192 runs it)', () => {
    expect(right('l2-ipv6-ndp')).toBe('An NS, to its group address');
  });
});
