// @vitest-environment node
/**
 * What the simulator really does with a hand-built packet, pinned.
 *
 * Packet exercises (build a packet, fragment, read a packet) will be judged by
 * the real engine. Each `describe` below is one question their design rests
 * on, asserted as the engine behaves today. A test named "(engine quirk)"
 * records behaviour a real network would not show but that exercises must live
 * with; do not "fix" the expectation without re-reading `README.md`, which
 * says what each fact means for the three exercise kinds.
 *
 * TC ids are not allocated yet: the specification is outside this folder.
 */

import { describe, expect, it } from 'vitest';
import type { AclRule } from '../../src/types/acl';
import type { IpPacket } from '../../src/types/packets';
import type { TopologySnapshot } from '../../src/types/topology';
import { prepare } from '../exercises/grade/prepare';
import {
  host,
  iface,
  link,
  macFor,
  port,
  router,
  snapshot,
  switchNode,
  withInterface,
} from '../exercises/templates/shared/build';
import {
  BROADCAST_MAC,
  buildPacket,
  fragmentsFromStatement,
  reassemble,
  sendPacket,
  sendPackets,
  type FragmentStatement,
  type PacketFacts,
  type PacketFields,
} from './facts';

// --- Topologies ----------------------------------------------------------------

/** pc1, pc2 — sw1 — r1 — sw2 — srv, srv2      192.168.1.0/24 and 203.0.113.0/24 */
function twoLans(): TopologySnapshot {
  return snapshot(
    [
      host('pc1', '192.168.1.10'),
      host('pc2', '192.168.1.11'),
      switchNode('sw1', [port('p1'), port('p2'), port('up')]),
      router('r1', [iface('lan', '192.168.1.1/24'), iface('far', '203.0.113.1/24')]),
      switchNode('sw2', [port('up'), port('p1'), port('p2')]),
      host('srv', '203.0.113.10', { role: 'server' }),
      host('srv2', '203.0.113.11', { role: 'server' }),
    ],
    [
      link('e-pc1', 'pc1', 'sw1:p1'),
      link('e-pc2', 'pc2', 'sw1:p2'),
      link('e-up', 'sw1:up', 'r1:lan'),
      link('e-far', 'r1:far', 'sw2:up'),
      link('e-srv', 'sw2:p1', 'srv'),
      link('e-srv2', 'sw2:p2', 'srv2'),
    ],
  );
}

/** pc — r1 — r2 — r3 — srv      10.0.1.0/24, 10.0.12.0/30, 10.0.23.0/30, 10.0.2.0/24 */
function threeRouters(): TopologySnapshot {
  return snapshot(
    [
      host('pc', '10.0.1.10'),
      router('r1', [iface('lan', '10.0.1.1/24'), iface('to-r2', '10.0.12.1/30')], {
        staticRoutes: [{ destination: '10.0.2.0/24', nextHop: '10.0.12.2' }],
      }),
      router('r2', [iface('to-r1', '10.0.12.2/30'), iface('to-r3', '10.0.23.1/30')], {
        staticRoutes: [
          { destination: '10.0.2.0/24', nextHop: '10.0.23.2' },
          { destination: '10.0.1.0/24', nextHop: '10.0.12.1' },
        ],
      }),
      router('r3', [iface('to-r2', '10.0.23.2/30'), iface('lan', '10.0.2.1/24')], {
        staticRoutes: [{ destination: '10.0.1.0/24', nextHop: '10.0.23.1' }],
      }),
      host('srv', '10.0.2.10', { role: 'server' }),
    ],
    [
      link('e-pc', 'pc', 'r1:lan'),
      link('e-12', 'r1:to-r2', 'r2:to-r1'),
      link('e-23', 'r2:to-r3', 'r3:to-r2'),
      link('e-srv', 'r3:lan', 'srv'),
    ],
  );
}

/** A link's MTU lives on the edge: `edge.data.mtuBytes`. */
function withLinkMtu(topology: TopologySnapshot, edgeId: string, mtuBytes: number) {
  return {
    ...topology,
    edges: topology.edges.map((edge) =>
      edge.id === edgeId ? { ...edge, data: { ...edge.data, mtuBytes } } : edge,
    ),
  };
}

// --- Packets -------------------------------------------------------------------

/** pc1 → srv across `twoLans`. */
const lanPacket = (over: Partial<PacketFields> = {}) =>
  buildPacket({ from: 'pc1', to: 'srv', srcIp: '192.168.1.10', dstIp: '203.0.113.10', ...over });

/** pc → srv across `threeRouters`. */
const chainPacket = (over: Partial<PacketFields> = {}) =>
  buildPacket({ from: 'pc', to: 'srv', srcIp: '10.0.1.10', dstIp: '10.0.2.10', ...over });

/** 1200 bytes of ICMP data: 1208 bytes to carry, a 1228-byte packet. */
const bigPing = (over: Partial<PacketFields> = {}) =>
  chainPacket({ transport: { kind: 'icmp-echo', dataBytes: 1200 }, ...over });

const onLans = (over: Partial<PacketFields> = {}, topology = twoLans()) =>
  sendPacket(prepare(topology), lanPacket(over));

const onChain = (over: Partial<PacketFields> = {}, topology = threeRouters()) =>
  sendPacket(prepare(topology), chainPacket(over));

const GATEWAY_MAC = macFor('r1:lan');
const NOBODY_MAC = '02:de:ad:be:ef:00';

const last = <T>(list: readonly T[] | undefined): T | undefined => list?.[list.length - 1];

/** `[totalLength, fragmentOffset (8-byte units), MF]` of every fragment, in trace order. */
const split = (facts: PacketFacts) =>
  facts.fragments.map((piece) => [piece.totalLength, piece.fragmentOffset, piece.mf]);

const pieces = (...list: [number, number, boolean][]): FragmentStatement[] =>
  list.map(([fragmentOffset, payloadBytes, mf]) => ({ fragmentOffset, payloadBytes, mf }));

// --- 1. Destination IP ---------------------------------------------------------

describe('1. destination IP', () => {
  it('a packet addressed to the server is delivered to it', async () => {
    const facts = await onLans();
    expect(facts.status).toBe('delivered');
    expect(facts.deliveredTo).toBe('srv');
    expect(facts.path).toEqual(['pc1', 'sw1', 'r1', 'sw2', 'srv']);
    expect(facts.edges).toEqual(['e-pc1', 'e-up', 'e-far', 'e-srv']);
    expect(facts.hops.map((hop) => hop.event)).toEqual([
      'create',
      'forward',
      'forward',
      'forward',
      'deliver',
    ]);
  });

  it('a packet addressed to another host of the far LAN goes to that host', async () => {
    const facts = await onLans({ dstIp: '203.0.113.11', to: 'srv2' });
    expect(facts.deliveredTo).toBe('srv2');
    expect(facts.path).toEqual(['pc1', 'sw1', 'r1', 'sw2', 'srv2']);
  });

  it('a packet addressed to a host of the sender’s own LAN never reaches the router', async () => {
    const facts = await onLans({ dstIp: '192.168.1.11', to: 'pc2' });
    expect(facts.deliveredTo).toBe('pc2');
    expect(facts.path).toEqual(['pc1', 'sw1', 'pc2']);
  });

  it('a router’s own address is delivered at the router', async () => {
    const facts = await onLans({ dstIp: '203.0.113.1', to: 'r1' });
    expect(facts.deliveredTo).toBe('r1');
    expect(facts.path).toEqual(['pc1', 'sw1', 'r1']);
  });

  it('an address no route covers is dropped at the first router with `no-route`', async () => {
    const facts = await onLans({ dstIp: '8.8.8.8' });
    expect(facts.status).toBe('dropped');
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'no-route' });
    expect(facts.path).toEqual(['pc1', 'sw1', 'r1']);
    const dropHop = last(facts.hops)?.hop;
    expect(dropHop?.routingDecision?.winner).toBeNull();
    expect(dropHop?.routingDecision?.dstIp).toBe('8.8.8.8');
  });

  it('no ICMP destination-unreachable is generated for `no-route` (engine quirk)', async () => {
    const facts = await onLans({ dstIp: '8.8.8.8' });
    expect(facts.icmp).toEqual([]);
    expect(last(facts.hops)?.hop.icmpGenerated).toBeUndefined();
  });

  it('an unused address of a connected LAN is sent back and dropped at the sender as `routing-loop` (engine quirk)', async () => {
    // A real router would ask for the address with ARP on the far LAN, get no
    // answer, and drop the packet itself.
    const facts = await onLans({ dstIp: '203.0.113.99' });
    expect(facts.drop).toEqual({ nodeId: 'pc1', reason: 'routing-loop' });
    expect(facts.path).toEqual(['pc1', 'sw1', 'r1', 'sw1', 'pc1']);
  });

  it('routers follow `dstIp`, but delivery needs `dstNodeId` to name the owner of `dstIp` (engine quirk)', async () => {
    // dstIp is the server's, dstNodeId names another node: it arrives and is refused.
    const wrongNode = await onLans({ to: 'srv2' });
    expect(wrongNode.path).toEqual(['pc1', 'sw1', 'r1', 'sw2', 'srv']);
    expect(wrongNode.drop).toEqual({ nodeId: 'srv', reason: 'no-route' });

    // A dstNodeId that names nothing at all behaves the same.
    const noNode = await onLans({ to: 'nowhere' });
    expect(noNode.drop).toEqual({ nodeId: 'srv', reason: 'no-route' });

    // dstIp is srv2's, dstNodeId is srv: the last switch follows dstNodeId, and srv refuses it.
    const wrongIp = await onLans({ dstIp: '203.0.113.11', to: 'srv' });
    expect(wrongIp.path).toEqual(['pc1', 'sw1', 'r1', 'sw2', 'srv']);
    expect(wrongIp.drop).toEqual({ nodeId: 'srv', reason: 'no-route' });

    // The same on the sender's own LAN: pc2 owns the address but is not the node named.
    const ownLan = await onLans({ dstIp: '192.168.1.11', to: 'srv' });
    expect(ownLan.drop).toEqual({ nodeId: 'pc2', reason: 'no-route' });
  });
});

// --- 2. Destination MAC --------------------------------------------------------

describe('2. destination MAC', () => {
  it('left unset, the engine resolves the gateway’s MAC and the sender’s own', async () => {
    const facts = await onLans();
    expect(facts.hops[0]?.srcMac).toBe(macFor('pc1'));
    expect(facts.hops[0]?.dstMac).toBe(GATEWAY_MAC);
  });

  it.each([
    ['the gateway’s', GATEWAY_MAC],
    ['the server’s', macFor('srv')],
    ['one nobody has', NOBODY_MAC],
    ['broadcast', BROADCAST_MAC],
  ])('a given MAC (%s) is kept as given until the router', async (_label, dstMac) => {
    const facts = await onLans({ dstMac });
    expect(facts.hops[0]).toMatchObject({ nodeId: 'pc1', dstMac });
    expect(facts.hops[1]).toMatchObject({ nodeId: 'sw1', dstMac });
  });

  it('with the gateway’s MAC the packet is delivered', async () => {
    const facts = await onLans({ dstMac: GATEWAY_MAC });
    expect(facts.deliveredTo).toBe('srv');
  });

  it.each([
    ['the server’s MAC, the classic mistake', macFor('srv')],
    ['a MAC nobody has', NOBODY_MAC],
    ['the broadcast MAC', BROADCAST_MAC],
  ])(
    'with %s the router still accepts and forwards the frame (engine quirk)',
    async (_label, dstMac) => {
      // A real router only takes frames addressed to its own MAC (or broadcast,
      // which it would not route either): all three would go nowhere.
      const facts = await onLans({ dstMac });
      expect(facts.status).toBe('delivered');
      expect(facts.path).toEqual(['pc1', 'sw1', 'r1', 'sw2', 'srv']);
    },
  );

  it('the same holds with no switch between the host and the router (engine quirk)', async () => {
    const facts = await onChain({ dstMac: NOBODY_MAC });
    expect(facts.hops[0]?.dstMac).toBe(NOBODY_MAC);
    expect(facts.deliveredTo).toBe('srv');
  });

  it('the one wrong MAC that fails is another host’s on the LAN: the switch hands it the frame and it refuses', async () => {
    const facts = await onLans({ dstMac: macFor('pc2') });
    expect(facts.path).toEqual(['pc1', 'sw1', 'pc2']);
    // The reason is the engine's generic one: a host has nowhere to forward to.
    expect(facts.drop).toEqual({ nodeId: 'pc2', reason: 'no-route' });
  });

  it('after the router the frame is the router’s: source its far interface, destination the next device', async () => {
    for (const dstMac of [GATEWAY_MAC, macFor('srv'), NOBODY_MAC]) {
      const facts = await onLans({ dstMac });
      const leavingRouter = facts.hops.find((hop) => hop.nodeId === 'r1');
      expect(leavingRouter).toMatchObject({
        srcMac: macFor('r1:far'),
        dstMac: macFor('srv'),
        srcIp: '192.168.1.10',
        dstIp: '203.0.113.10',
      });
      expect(last(facts.hops)).toMatchObject({ nodeId: 'srv', srcMac: macFor('r1:far') });
    }
  });

  it('between routers the frame is rewritten at every router', async () => {
    const facts = await onChain();
    const frames = facts.hops.map((hop) => [hop.nodeId, hop.srcMac, hop.dstMac]);
    expect(frames).toEqual([
      ['pc', macFor('pc'), macFor('r1:lan')],
      ['r1', macFor('r1:to-r2'), macFor('r2:to-r1')],
      ['r2', macFor('r2:to-r3'), macFor('r3:to-r2')],
      ['r3', macFor('r3:lan'), macFor('srv')],
      ['srv', macFor('r3:lan'), macFor('srv')],
    ]);
  });

  it('the frame at every hop is observable, in the hop and in the packet recorded with it', async () => {
    const facts = await onLans({ dstMac: macFor('srv') });
    for (const hop of facts.hops) {
      expect(hop.hop.srcMac).toBe(hop.packet.frame.srcMac);
      expect(hop.hop.dstMac).toBe(hop.packet.frame.dstMac);
    }
  });

  it('on the sender’s own LAN the gateway’s MAC sends the packet through the router and back', async () => {
    const facts = await onLans({ dstIp: '192.168.1.11', to: 'pc2', dstMac: GATEWAY_MAC });
    expect(facts.deliveredTo).toBe('pc2');
    expect(facts.path).toEqual(['pc1', 'sw1', 'r1', 'sw1', 'pc2']);
  });

  it('on the sender’s own LAN a host accepts a frame whose MAC is not its own (engine quirk)', async () => {
    const facts = await onLans({ dstIp: '192.168.1.11', to: 'pc2', dstMac: NOBODY_MAC });
    expect(facts.deliveredTo).toBe('pc2');
    expect(last(facts.hops)?.dstMac).toBe(NOBODY_MAC);
  });
});

// --- 3. Source addresses -------------------------------------------------------

describe('3. source addresses', () => {
  it('a source IP that is not the sender’s is carried unchanged and delivered', async () => {
    const facts = await onLans({ srcIp: '192.168.1.11' });
    expect(facts.deliveredTo).toBe('srv');
    expect(facts.hops.map((hop) => hop.srcIp)).toEqual(Array(5).fill('192.168.1.11'));
  });

  it('`engine.send`, the app’s Send button, replaces the source IP with the sender’s own (engine quirk)', async () => {
    const facts = await sendPacket(
      prepare(twoLans()),
      lanPacket({ srcIp: '192.168.1.11' }),
      'send',
    );
    expect(facts.deliveredTo).toBe('srv');
    expect(facts.hops.map((hop) => hop.srcIp)).toEqual(Array(5).fill('192.168.1.10'));
  });

  it('`engine.send` and the pipeline otherwise report the same packet', async () => {
    const strip = (facts: PacketFacts) =>
      facts.hops.map(({ hop: _hop, packet: _packet, identification: _id, ...rest }) => rest);
    const prepared = prepare(twoLans());
    const sent = await sendPacket(prepared, lanPacket({ ttl: 9, dstMac: macFor('srv') }), 'send');
    const piped = await sendPacket(prepared, lanPacket({ ttl: 9, dstMac: macFor('srv') }));
    expect(strip(sent)).toEqual(strip(piped));
  });

  it('a delivered packet gets no reply: the trace ends at the delivery', async () => {
    const facts = await onLans();
    expect(last(facts.trace?.hops)).toMatchObject({ nodeId: 'srv', event: 'deliver' });
    expect(facts.icmp).toEqual([]);
  });

  it('an ICMP error is addressed to the claimed source but steered to the real sender, which refuses it (engine quirk)', async () => {
    // A real network would deliver it to pc2, the host whose address was claimed.
    const facts = await onLans({ srcIp: '192.168.1.11', ttl: 1 });
    expect(facts.icmp).toEqual([
      {
        fromNodeId: 'r1',
        srcIp: '192.168.1.1',
        dstIp: '192.168.1.11',
        type: 11,
        code: 0,
        nextHopMtu: null,
        deliveredTo: null,
        drop: { nodeId: 'pc1', reason: 'no-route' },
      },
    ]);
  });

  it('a source MAC that is not the sender’s is kept until the router and changes nothing', async () => {
    const facts = await onLans({ srcMac: macFor('pc2') });
    expect(facts.deliveredTo).toBe('srv');
    expect(facts.hops[0]?.srcMac).toBe(macFor('pc2'));
    expect(facts.hops[1]?.srcMac).toBe(macFor('pc2'));
    expect(facts.hops[2]?.srcMac).toBe(macFor('r1:far'));
  });
});

// --- 4. TTL --------------------------------------------------------------------

describe('4. TTL', () => {
  it('the given TTL is honoured and each router takes one off', async () => {
    const facts = await onChain({ ttl: 9 });
    expect(facts.hops.map((hop) => [hop.nodeId, hop.ttl])).toEqual([
      ['pc', 9],
      ['r1', 8],
      ['r2', 7],
      ['r3', 6],
      ['srv', 6],
    ]);
  });

  it('at a router the hop carries the TTL on arrival, the recorded packet the TTL on leaving', async () => {
    const facts = await onChain({ ttl: 9 });
    const atR1 = facts.hops.find((hop) => hop.nodeId === 'r1');
    expect(atR1?.hop.ttl).toBe(9);
    expect(atR1?.packet.frame.payload.ttl).toBe(8);
  });

  it('through three routers the smallest TTL that arrives is 4, and it arrives as 1', async () => {
    const facts = await onChain({ ttl: 4 });
    expect(facts.deliveredTo).toBe('srv');
    expect(last(facts.hops)?.ttl).toBe(1);
  });

  it.each([
    [1, 'r1', '10.0.1.1'],
    [2, 'r2', '10.0.12.2'],
    [3, 'r3', '10.0.23.2'],
  ])(
    'TTL %i is dropped at %s with `ttl-exceeded`, and that router answers with ICMP time exceeded',
    async (ttl, routerId, routerIp) => {
      const facts = await onChain({ ttl });
      expect(facts.status).toBe('dropped');
      expect(facts.drop).toEqual({ nodeId: routerId, reason: 'ttl-exceeded' });
      const dropHop = last(facts.hops);
      expect(dropHop?.ttl).toBe(1);
      expect(dropHop?.hop.icmpGenerated).toBe(true);
      expect(dropHop?.hop.routingDecision).toBeUndefined();
      // The source is the interface the packet came in on.
      expect(facts.icmp).toEqual([
        {
          fromNodeId: routerId,
          srcIp: routerIp,
          dstIp: '10.0.1.10',
          type: 11,
          code: 0,
          nextHopMtu: null,
          deliveredTo: 'pc',
          drop: null,
        },
      ]);
    },
  );

  it('the ICMP error is in the same trace, after the drop, and the trace stays `dropped`', async () => {
    const facts = await onChain({ ttl: 2 });
    expect(facts.trace?.hops.map((hop) => [hop.nodeId, hop.event, hop.srcIp, hop.dstIp])).toEqual([
      ['pc', 'create', '10.0.1.10', '10.0.2.10'],
      ['r1', 'forward', '10.0.1.10', '10.0.2.10'],
      ['r2', 'drop', '10.0.1.10', '10.0.2.10'],
      ['r2', 'create', '10.0.12.2', '10.0.1.10'],
      ['r1', 'forward', '10.0.12.2', '10.0.1.10'],
      ['pc', 'deliver', '10.0.12.2', '10.0.1.10'],
    ]);
    expect(facts.trace?.status).toBe('dropped');
    // The packet's own hops stop at the drop.
    expect(facts.hops).toHaveLength(3);
  });

  it('switches do not take anything off the TTL', async () => {
    const arrives = await onLans({ ttl: 2 });
    expect(arrives.deliveredTo).toBe('srv');
    expect(arrives.hops.map((hop) => [hop.nodeId, hop.ttl])).toEqual([
      ['pc1', 2],
      ['sw1', 2],
      ['r1', 1],
      ['sw2', 1],
      ['srv', 1],
    ]);
    const dropped = await onLans({ ttl: 1 });
    expect(dropped.drop).toEqual({ nodeId: 'r1', reason: 'ttl-exceeded' });
  });

  it('a TTL of 1 is enough on the sender’s own LAN', async () => {
    const facts = await onLans({ ttl: 1, dstIp: '192.168.1.11', to: 'pc2' });
    expect(facts.deliveredTo).toBe('pc2');
  });

  it('a TTL of 0 still leaves the sender, and a TTL above 255 is accepted (engine quirk)', async () => {
    const zeroRouted = await onChain({ ttl: 0 });
    expect(zeroRouted.drop).toEqual({ nodeId: 'r1', reason: 'ttl-exceeded' });
    const zeroLocal = await onLans({ ttl: 0, dstIp: '192.168.1.11', to: 'pc2' });
    expect(zeroLocal.deliveredTo).toBe('pc2');
    const huge = await onChain({ ttl: 300 });
    expect(last(huge.hops)?.ttl).toBe(297);
  });
});

// --- 5. Ports and protocol -----------------------------------------------------

describe('5. ports and protocol', () => {
  const permit = (rule: Partial<AclRule>): TopologySnapshot =>
    withInterface(twoLans(), 'r1', 'lan', {
      inboundAcl: [{ id: 'rule', priority: 10, action: 'permit', protocol: 'tcp', ...rule }],
    });
  const webOnly = permit({ dstPort: 80 });

  it('TCP to the permitted port passes, and the trace names the rule', async () => {
    const facts = await onLans({ transport: { kind: 'tcp', dstPort: 80 } }, webOnly);
    expect(facts.deliveredTo).toBe('srv');
    expect(facts.aclMatches).toHaveLength(1);
    expect(facts.aclMatches[0]).toMatchObject({
      nodeId: 'r1',
      direction: 'inbound',
      interfaceId: 'lan',
      action: 'permit',
    });
    expect(facts.aclMatches[0]?.matchedRule?.id).toBe('rule');
    expect(facts.hops[0]).toMatchObject({ protocol: 6, srcPort: 49152, dstPort: 80 });
  });

  it.each([
    ['TCP to another port', { kind: 'tcp', dstPort: 22 }],
    ['UDP to the same port number', { kind: 'udp', dstPort: 80 }],
    ['ICMP', { kind: 'icmp-echo' }],
  ] as const)(
    '%s is dropped at the router with `acl-deny` by the implicit deny',
    async (_l, transport) => {
      const facts = await onLans({ transport }, webOnly);
      expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'acl-deny' });
      expect(facts.aclMatches[0]).toMatchObject({ action: 'deny', matchedRule: null });
      expect(facts.icmp).toEqual([]);
    },
  );

  it('`protocol` is not checked against the payload: without an ACL a mismatch is delivered (engine quirk)', async () => {
    const facts = await onLans({ protocol: 17, transport: { kind: 'tcp', dstPort: 80 } });
    expect(facts.deliveredTo).toBe('srv');
    // The hop names the protocol by the number and still shows the payload's ports.
    expect(facts.hops[0]?.hop.protocol).toBe('UDP');
    expect(facts.hops[0]?.dstPort).toBe(80);
  });

  it('an ACL needs the number and the payload to agree: a mismatch is neither TCP nor UDP (engine quirk)', async () => {
    const tcpNumberUdpPayload = await onLans(
      { protocol: 6, transport: { kind: 'udp', dstPort: 80 } },
      webOnly,
    );
    expect(tcpNumberUdpPayload.drop?.reason).toBe('acl-deny');
    const udpNumberTcpPayload = await onLans(
      { protocol: 17, transport: { kind: 'tcp', dstPort: 80 } },
      permit({ protocol: 'udp', dstPort: 80 }),
    );
    expect(udpNumberTcpPayload.drop?.reason).toBe('acl-deny');
  });

  it('protocol number 1 makes the packet ICMP for an ACL whatever it carries (engine quirk)', async () => {
    const facts = await onLans(
      { protocol: 1, transport: { kind: 'tcp', dstPort: 22 } },
      permit({ protocol: 'icmp' }),
    );
    expect(facts.deliveredTo).toBe('srv');
  });
});

// --- 6. DF and MTU -------------------------------------------------------------

describe('6. DF and MTU', () => {
  const narrowMiddle = withLinkMtu(threeRouters(), 'e-12', 604);

  it('a link’s MTU is `edge.data.mtuBytes`; a packet that does not fit is cut by the router sending onto it', async () => {
    const facts = await sendPacket(prepare(narrowMiddle), bigPing());
    expect(facts.status).toBe('delivered');
    expect(facts.fragments.map((piece) => piece.nodeId)).toEqual(['r1', 'r1', 'r1']);
    expect(facts.fragments.every((piece) => piece.mtu === 604)).toBe(true);
    // In the trace a fragment leaving is a `forward` hop whose `action` is `fragment`.
    const cut = facts.hops.filter((hop) => hop.action === 'fragment');
    expect(cut.map((hop) => hop.event)).toEqual(['forward', 'forward', 'forward']);
    expect(cut.map((hop) => hop.hop.fragmentCount)).toEqual([3, 3, 3]);
  });

  it('an interface’s MTU is `interface.mtu` on the sending router, and the smaller of the two wins', async () => {
    const byInterface = withInterface(threeRouters(), 'r1', 'to-r2', { mtu: 604 });
    expect((await sendPacket(prepare(byInterface), bigPing())).fragments).toHaveLength(3);
    const both = withInterface(narrowMiddle, 'r1', 'to-r2', { mtu: 300 });
    const facts = await sendPacket(prepare(both), bigPing());
    expect(facts.fragments).toHaveLength(5);
    expect(facts.fragments[0]?.mtu).toBe(300);
  });

  it('the MTU of the receiving interface does not matter', async () => {
    const receiving = withInterface(threeRouters(), 'r2', 'to-r1', { mtu: 604 });
    const facts = await sendPacket(prepare(receiving), bigPing());
    expect(facts.fragments).toEqual([]);
    expect(facts.deliveredTo).toBe('srv');
  });

  it('a narrow last link is cut by the last router', async () => {
    const facts = await sendPacket(prepare(withLinkMtu(threeRouters(), 'e-srv', 604)), bigPing());
    expect(facts.fragments.map((piece) => piece.nodeId)).toEqual(['r3', 'r3', 'r3']);
  });

  it('a host never checks the MTU of its own link (engine quirk)', async () => {
    // A real host would fragment (or, with DF, refuse to send).
    const prepared = prepare(withLinkMtu(threeRouters(), 'e-pc', 604));
    const clear = await sendPacket(prepared, bigPing());
    expect(clear.fragments).toEqual([]);
    expect(clear.deliveredTo).toBe('srv');
    expect((await sendPacket(prepared, bigPing({ df: true }))).deliveredTo).toBe('srv');
  });

  it('a packet exactly the size of the MTU is not cut; one byte more is', async () => {
    const fits = await sendPacket(prepare(withLinkMtu(threeRouters(), 'e-12', 1228)), bigPing());
    expect(fits.fragments).toEqual([]);
    const over = await sendPacket(prepare(withLinkMtu(threeRouters(), 'e-12', 1227)), bigPing());
    expect(split(over)).toEqual([
      [1220, 0, true],
      [28, 150, false],
    ]);
  });

  it('with DF set it is dropped at that router with `fragmentation-needed`, which carries the MTU', async () => {
    const facts = await sendPacket(prepare(narrowMiddle), bigPing({ df: true }));
    expect(facts.status).toBe('dropped');
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'fragmentation-needed' });
    expect(facts.fragments).toEqual([]);
    const dropHop = last(facts.hops);
    expect(dropHop?.hop.nextHopMtu).toBe(604);
    expect(dropHop?.hop.icmpGenerated).toBe(true);
    expect(dropHop?.df).toBe(true);
  });

  it('the router answers with ICMP type 3 code 4 carrying the next-hop MTU, in the same trace', async () => {
    const facts = await sendPacket(prepare(narrowMiddle), bigPing({ df: true }));
    expect(facts.icmp).toEqual([
      {
        fromNodeId: 'r1',
        srcIp: '10.0.1.1',
        dstIp: '10.0.1.10',
        type: 3,
        code: 4,
        nextHopMtu: 604,
        deliveredTo: 'pc',
        drop: null,
      },
    ]);
    expect(facts.trace?.hops.map((hop) => [hop.nodeId, hop.event])).toEqual([
      ['pc', 'create'],
      ['r1', 'drop'],
      ['r1', 'create'],
      ['pc', 'deliver'],
    ]);
    expect(facts.trace?.status).toBe('dropped');
  });

  it('the app’s Send button gives the same DF result', async () => {
    const facts = await sendPacket(prepare(narrowMiddle), bigPing({ df: true }), 'send');
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'fragmentation-needed' });
    expect(facts.icmp[0]).toMatchObject({ type: 3, code: 4, nextHopMtu: 604, deliveredTo: 'pc' });
  });

  it('with DF set a packet that fits is delivered whole', async () => {
    const facts = await sendPacket(prepare(narrowMiddle), chainPacket({ df: true }));
    expect(facts.deliveredTo).toBe('srv');
    expect(last(facts.hops)?.df).toBe(true);
  });

  it('`totalLength`, when given, is believed over the real size (engine quirk)', async () => {
    const understated = await sendPacket(prepare(narrowMiddle), bigPing({ totalLength: 100 }));
    expect(understated.fragments).toEqual([]);
    expect(understated.deliveredTo).toBe('srv');
    // Overstated on an empty ping: "cut" into one 28-byte piece.
    const overstated = await sendPacket(prepare(narrowMiddle), chainPacket({ totalLength: 1500 }));
    expect(split(overstated)).toEqual([[28, 0, false]]);
  });

  it('an MTU under 28 makes the engine throw instead of dropping (engine quirk)', async () => {
    const facts = await sendPacket(prepare(withLinkMtu(threeRouters(), 'e-12', 20)), bigPing());
    expect(facts.status).toBe('engine-error');
    expect(facts.error).toContain('too small for IPv4 fragmentation');
  });
});

// --- 7. Fragments in detail ----------------------------------------------------

describe('7. fragments in detail', () => {
  const send = (mtu: number, over: Partial<PacketFields> = {}) =>
    sendPacket(prepare(withLinkMtu(threeRouters(), 'e-12', mtu)), bigPing(over));

  it('1200 bytes of ICMP data over MTU 604: three fragments', async () => {
    const facts = await send(604, { identification: 4242 });
    expect(facts.fragments).toEqual([
      {
        nodeId: 'r1',
        index: 0,
        count: 3,
        mtu: 604,
        identification: 4242,
        totalLength: 604,
        payloadBytes: 584,
        fragmentOffset: 0,
        offsetBytes: 0,
        mf: true,
        df: false,
      },
      {
        nodeId: 'r1',
        index: 1,
        count: 3,
        mtu: 604,
        identification: 4242,
        totalLength: 604,
        payloadBytes: 584,
        fragmentOffset: 73,
        offsetBytes: 584,
        mf: true,
        df: false,
      },
      {
        nodeId: 'r1',
        index: 2,
        count: 3,
        mtu: 604,
        identification: 4242,
        totalLength: 60,
        payloadBytes: 40,
        fragmentOffset: 146,
        offsetBytes: 1168,
        mf: false,
        df: false,
      },
    ]);
  });

  it('1200 bytes of ICMP data over MTU 300: five fragments', async () => {
    const facts = await send(300);
    expect(split(facts)).toEqual([
      [300, 0, true],
      [300, 35, true],
      [300, 70, true],
      [300, 105, true],
      [108, 140, false],
    ]);
    expect(facts.fragments.map((piece) => piece.payloadBytes)).toEqual([280, 280, 280, 280, 88]);
    expect(facts.fragments.map((piece) => piece.count)).toEqual([5, 5, 5, 5, 5]);
  });

  it('`fragmentOffset` is in 8-byte units, and the 8-byte ICMP header is part of what is cut', async () => {
    const facts = await send(604);
    const carried = facts.fragments.reduce((sum, piece) => sum + piece.payloadBytes, 0);
    expect(carried).toBe(1200 + 8);
    for (const [index, piece] of facts.fragments.entries()) {
      const before = facts.fragments.slice(0, index).reduce((sum, p) => sum + p.payloadBytes, 0);
      expect(piece.fragmentOffset * 8).toBe(before);
    }
  });

  it.each([604, 300, 1000, 577, 68])(
    'at MTU %i every fragment but the last carries the largest multiple of 8 that fits',
    async (mtu) => {
      const facts = await send(mtu);
      const largest = Math.floor((mtu - 20) / 8) * 8;
      const tail = last(facts.fragments);
      expect(facts.fragments.slice(0, -1).every((piece) => piece.payloadBytes === largest)).toBe(
        true,
      );
      expect(tail?.payloadBytes).toBeGreaterThan(0);
      expect(tail?.payloadBytes).toBeLessThanOrEqual(largest);
      expect(facts.fragments.every((piece) => piece.totalLength <= mtu)).toBe(true);
      expect(facts.fragments.map((piece) => piece.mf)).toEqual([
        ...Array(facts.fragments.length - 1).fill(true),
        false,
      ]);
    },
  );

  it('every fragment carries the packet’s identification: the one given, else one the engine derives', async () => {
    const given = await send(604, { identification: 4242 });
    expect(given.fragments.map((piece) => piece.identification)).toEqual([4242, 4242, 4242]);
    const derived = await send(604);
    const id = derived.hops[0]?.identification;
    expect(typeof id).toBe('number');
    expect(derived.fragments.map((piece) => piece.identification)).toEqual([id, id, id]);
  });

  it('the hop gives index, count, identification and MTU; lengths, offset and MF are only in the recorded packet', async () => {
    const facts = await send(604, { identification: 4242 });
    const second = facts.hops.filter((hop) => hop.action === 'fragment')[1];
    expect(second?.hop).toMatchObject({
      nodeId: 'r1',
      event: 'forward',
      action: 'fragment',
      fragmentIndex: 1,
      fragmentCount: 3,
      identification: 4242,
      nextHopMtu: 604,
    });
    expect(second?.packet.frame.payload).toMatchObject({
      totalLength: 604,
      fragmentOffset: 73,
      flags: { df: false, mf: true },
      identification: 4242,
    });
  });

  it('each fragment travels to the destination before the next is cut, and keeps its fields on the way', async () => {
    const facts = await send(604);
    expect(facts.hops.map((hop) => [hop.nodeId, hop.fragmentOffset, hop.action])).toEqual([
      ['pc', 0, null],
      ['r1', 0, 'fragment'],
      ['r2', 0, null],
      ['r3', 0, null],
      ['srv', 0, 'reassembly-pending'],
      ['r1', 73, 'fragment'],
      ['r2', 73, null],
      ['r3', 73, null],
      ['srv', 73, 'reassembly-pending'],
      ['r1', 146, 'fragment'],
      ['r2', 146, null],
      ['r3', 146, null],
      ['srv', 0, 'reassembly-complete'],
    ]);
  });

  it('the destination reassembles: the last delivery says so and holds the whole packet again', async () => {
    const facts = await send(604);
    expect(facts.status).toBe('delivered');
    expect(facts.reassembled).toEqual({ nodeId: 'srv', fragmentCount: 3, totalLength: 1228 });
    const arrival = last(facts.hops);
    expect(arrival).toMatchObject({ event: 'deliver', mf: false, fragmentOffset: 0 });
    expect(arrival?.hop.fragmentCount).toBe(3);
    expect(arrival?.packet.frame.payload.payload).toMatchObject({
      type: 8,
      data: 'x'.repeat(1200),
    });
  });

  it('UDP is cut the same way, its 8-byte header counted', async () => {
    const facts = await sendPacket(
      prepare(withLinkMtu(threeRouters(), 'e-12', 604)),
      chainPacket({ transport: { kind: 'udp', dstPort: 53, dataBytes: 1200 } }),
    );
    expect(split(facts)).toEqual([
      [604, 0, true],
      [604, 73, true],
      [60, 146, false],
    ]);
    expect(facts.reassembled?.totalLength).toBe(1228);
  });

  it('a wider link after a narrow one changes nothing: fragments are not merged on the way', async () => {
    const facts = await sendPacket(
      prepare(withLinkMtu(withLinkMtu(threeRouters(), 'e-12', 300), 'e-23', 604)),
      bigPing(),
    );
    expect(facts.fragments.map((piece) => piece.nodeId)).toEqual(Array(5).fill('r1'));
    expect(facts.reassembled).toEqual({ nodeId: 'srv', fragmentCount: 5, totalLength: 1228 });
  });

  it('a narrower second link cuts the fragments again, observably, but with offsets that restart at 0 (engine quirk)', async () => {
    // RFC 791: offsets stay relative to the original packet (0, 35, 70, 73, 108,
    // 143, 146) and MF stays set on every piece but the very last.
    const facts = await sendPacket(
      prepare(withLinkMtu(withLinkMtu(threeRouters(), 'e-12', 604), 'e-23', 300)),
      bigPing(),
    );
    expect(
      facts.fragments.map((piece) => [
        piece.nodeId,
        ...split({ ...facts, fragments: [piece] })[0]!,
      ]),
    ).toEqual([
      ['r1', 604, 0, true],
      ['r2', 300, 0, true],
      ['r2', 300, 35, true],
      ['r2', 44, 70, false],
      ['r1', 604, 73, true],
      ['r2', 300, 0, true],
      ['r2', 300, 35, true],
      ['r2', 44, 70, false],
      ['r1', 60, 146, false],
    ]);
  });

  it('after a second cut the destination puts together one 604-byte piece and calls it complete (engine quirk)', async () => {
    const facts = await sendPacket(
      prepare(withLinkMtu(withLinkMtu(threeRouters(), 'e-12', 604), 'e-23', 300)),
      bigPing(),
    );
    expect(facts.reassembled).toEqual({ nodeId: 'srv', fragmentCount: 3, totalLength: 604 });
    expect(last(facts.hops)?.action).toBe('reassembly-pending');
    // Both the engine and these facts therefore report a delivery: compare
    // `reassembled.totalLength` with the size sent before believing it.
    expect(facts.trace?.status).toBe('delivered');
    expect(facts.status).toBe('delivered');
  });
});

// --- 8. A learner-supplied fragment set ----------------------------------------

describe('8. a learner-supplied fragment set', () => {
  const whole = bigPing({ identification: 7 });
  const RIGHT = pieces([0, 584, true], [73, 584, true], [146, 40, false]);

  /** The fragments the engine itself cuts at MTU 604, as packets and as IP packets. */
  async function engineFragments() {
    const facts = await sendPacket(prepare(withLinkMtu(threeRouters(), 'e-12', 604)), whole);
    const packets = facts.hops.filter((hop) => hop.action === 'fragment').map((hop) => hop.packet);
    return { packets, ips: packets.map((packet) => packet.frame.payload as IpPacket) };
  }

  it('a fragment sent on its own arrives and waits; the engine’s trace calls that `delivered` (engine quirk)', async () => {
    const lone = chainPacket({
      identification: 7,
      mf: true,
      protocol: 1,
      transport: { kind: 'raw', dataBytes: 584 },
    });
    const facts = await sendPacket(prepare(threeRouters()), lone);
    expect(last(facts.hops)).toMatchObject({
      nodeId: 'srv',
      event: 'deliver',
      action: 'reassembly-pending',
    });
    expect(facts.trace?.status).toBe('delivered');
    expect(facts.status).toBe('pending');
    expect(facts.delivered).toBe(false);
  });

  it('fragments sent one after another on one engine are never put together: each send has its own reassembler (engine quirk)', async () => {
    const { packets } = await engineFragments();
    const results = await sendPackets(
      prepare(threeRouters()),
      packets.map((packet, index) => ({
        ...packet,
        id: `fragment-${index}`,
        currentDeviceId: 'pc',
        ingressPortId: '',
      })),
    );
    expect(results.map((facts) => facts.status)).toEqual(['pending', 'pending', 'pending']);
    expect(results.map((facts) => facts.reassembled)).toEqual([null, null, null]);
  });

  it('the engine’s reassembler, called directly, completes the engine’s own fragments in any order', async () => {
    const { ips } = await engineFragments();
    expect(reassemble(ips)?.totalLength).toBe(1228);
    expect(reassemble([...ips].reverse())?.totalLength).toBe(1228);
    expect(reassemble([ips[0]!, ips[2]!])).toBeNull();
  });

  it('it restores the payload from an internal field of the first fragment, so plain hand-built fragments never complete (engine quirk)', async () => {
    const { ips } = await engineFragments();
    expect(ips[0]?.reassemblyPayload).toMatchObject({ type: 8, data: 'x'.repeat(1200) });
    const plain = ips.map(({ reassemblyPayload: _internal, ...fragment }) => fragment);
    expect(reassemble(plain)).toBeNull();
  });

  it('a stated split, given that field, is accepted when it is right', () => {
    expect(reassemble(fragmentsFromStatement(whole, RIGHT))?.totalLength).toBe(1228);
  });

  it('any gapless split is accepted, not only the one a router makes', () => {
    const smaller = pieces([0, 400, true], [50, 400, true], [100, 408, false]);
    expect(reassemble(fragmentsFromStatement(whole, smaller))?.totalLength).toBe(1228);
  });

  it.each([
    ['a gap', pieces([0, 584, true], [146, 40, false])],
    ['an overlap', pieces([0, 584, true], [70, 584, true], [146, 40, false])],
    ['MF set on the last piece', pieces([0, 584, true], [73, 584, true], [146, 40, true])],
    [
      'a size that is not a multiple of 8',
      pieces([0, 580, true], [72, 588, true], [146, 40, false]),
    ],
    ['too few bytes in all', pieces([0, 584, true], [73, 584, true], [146, 32, false])],
    ['too many bytes in all', pieces([0, 584, true], [73, 584, true], [146, 48, false])],
    ['offsets in bytes', pieces([0, 584, true], [584, 584, true], [1168, 40, false])],
  ])('a split with %s never completes', (_label, statement) => {
    expect(reassemble(fragmentsFromStatement(whole, statement))).toBeNull();
  });

  it('MF cleared on a middle piece goes unnoticed (engine quirk)', () => {
    const statement = pieces([0, 584, true], [73, 584, false], [146, 40, false]);
    expect(reassemble(fragmentsFromStatement(whole, statement))?.totalLength).toBe(1228);
  });

  it('a hand-built fragment too big for a link is cut again by the router, losing its place (engine quirk)', async () => {
    const [oversized] = fragmentsFromStatement(whole, pieces([0, 800, true]));
    const facts = await sendPacket(prepare(withLinkMtu(threeRouters(), 'e-12', 604)), {
      ...whole,
      frame: { ...whole.frame, payload: oversized! },
    });
    // The second piece of a fragment that had MF set should keep MF set.
    expect(split(facts)).toEqual([
      [604, 0, true],
      [236, 73, false],
    ]);
  });
});

// --- 9. Determinism and cost ---------------------------------------------------

describe('9. determinism and cost', () => {
  /** Everything but the wall-clock timestamps. */
  const stable = (facts: PacketFacts) => ({
    hops: facts.trace?.hops.map(({ timestamp: _timestamp, ...hop }) => hop),
    packets: facts.hops.map((hop) => ({ ...hop.packet, timestamp: 0 })),
    fragments: facts.fragments,
    icmp: facts.icmp,
  });

  it('the same packet on a fresh engine gives the same trace, timestamps aside', async () => {
    const prepared = prepare(withLinkMtu(threeRouters(), 'e-12', 604));
    for (const over of [{}, { df: true }, { ttl: 2 }]) {
      const first = await sendPacket(prepared, bigPing(over));
      const second = await sendPacket(prepared, bigPing(over));
      expect(stable(second)).toEqual(stable(first));
    }
  });

  it('the derived identification depends on the addresses, not on the packet id or the clock', async () => {
    const prepared = prepare(threeRouters());
    const first = await sendPacket(prepared, chainPacket({ id: 'one' }));
    const second = await sendPacket(prepared, chainPacket({ id: 'two' }));
    expect(second.hops[0]?.identification).toBe(first.hops[0]?.identification);
  });

  const RUNS = 50;
  // Generous on purpose: it catches a regression of an order of magnitude, not noise.
  const CEILING_MS = 250;

  it(`one send and its facts (a fragmented packet over three routers) stays under ${CEILING_MS} ms`, async () => {
    const prepared = prepare(withLinkMtu(threeRouters(), 'e-12', 604));
    const durations: number[] = [];
    for (let run = 0; run < RUNS; run += 1) {
      const started = performance.now();
      const facts = await sendPacket(prepared, bigPing());
      expect(facts.fragments).toHaveLength(3);
      durations.push(performance.now() - started);
    }
    const mean = durations.reduce((sum, value) => sum + value, 0) / RUNS;
    const median = [...durations].sort((left, right) => left - right)[RUNS / 2] ?? 0;
    console.log(
      `packet-lab: one send + facts, mean ${mean.toFixed(2)} ms, median ${median.toFixed(2)} ms, max ${Math.max(...durations).toFixed(2)} ms over ${RUNS} runs`,
    );
    expect(mean).toBeLessThan(CEILING_MS);
  });
});
