// @vitest-environment node
/**
 * What the simulator really does, pinned.
 *
 * The exercise grader runs the real engine on a learner's topology. Each
 * `describe` below is one fact the grader's design rests on, asserted as the
 * engine behaves today. A test named "(engine quirk)" records behaviour that
 * looks wrong but that exercises must live with; do not "fix" the expectation
 * without re-reading the templates that depend on it.
 */

import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../src/hooks/HookEngine';
import { MainThreadEngine } from '../../../src/simulation/worker/MainThreadEngine';
import type { AclRule } from '../../../src/types/acl';
import type { StaticRouteConfig } from '../../../src/types/routing';
import type { TopologySnapshot } from '../../../src/types/topology';
import {
  DIAMOND_NETS,
  host,
  lanBehindRouter,
  ospfDiamond,
  routerChain,
  routerDiamond,
  switchTriangle,
  trunkedSwitches,
  vlanSwitch,
  withInterface,
  withLinkState,
  withNodeData,
  withOspfCost,
} from '../templates/shared/build';
import { prepare, routesOf, stpPort, stpRootNodeId } from './prepare';
import { runProbe, type ProbeFacts } from './probe';

const ping = (topology: TopologySnapshot, from: string, to: string): Promise<ProbeFacts> =>
  runProbe(prepare(topology), { via: 'ping', from, to });

const tcp = (topology: TopologySnapshot, from: string, to: string, dstPort = 80) =>
  runProbe(prepare(topology), { via: 'tcp', from, to, dstPort });

const roles = (topology: TopologySnapshot): Record<string, string> =>
  Object.fromEntries([...prepare(topology).stpStates].map(([key, port]) => [key, port.role]));

const natLan = (): TopologySnapshot =>
  withInterface(withInterface(lanBehindRouter(), 'r1', 'lan', { nat: 'inside' }), 'r1', 'wan', {
    nat: 'outside',
  });

/** The diamond with static routes everywhere except r1, whose routes the test supplies. */
function staticDiamond(r1Routes: StaticRouteConfig[]): TopologySnapshot {
  const routes: Record<string, StaticRouteConfig[]> = {
    r1: r1Routes,
    r2: [
      { destination: DIAMOND_NETS.right, nextHop: '10.0.24.2' },
      { destination: DIAMOND_NETS.left, nextHop: '10.0.12.1' },
    ],
    r3: [
      { destination: DIAMOND_NETS.right, nextHop: '10.0.34.2' },
      { destination: DIAMOND_NETS.left, nextHop: '10.0.13.1' },
    ],
    r4: [{ destination: DIAMOND_NETS.left, nextHop: '10.0.34.1' }],
  };
  return Object.entries(routes).reduce(
    (topology, [nodeId, staticRoutes]) => withNodeData(topology, nodeId, { staticRoutes }),
    routerDiamond(),
  );
}

describe('baseline: the shared shapes work before anything is broken', () => {
  it('a PC reaches a server across a switch and a router, and its LAN neighbour', async () => {
    const far = await ping(lanBehindRouter(), 'pc1', 'srv');
    expect(far.status).toBe('delivered');
    expect(far.forwardNodeIds).toEqual(['pc1', 'sw1', 'r1', 'srv']);
    expect(far.forwardEdgeIds).toEqual(['e-pc1', 'e-up', 'e-srv']);
    expect(far.drop).toBeNull();

    const near = await ping(lanBehindRouter(), 'pc1', 'pc2');
    expect(near.status).toBe('delivered');
    expect(near.forwardNodeIds).toEqual(['pc1', 'sw1', 'pc2']);
  });

  it('prepare adds connected routes for every router interface', () => {
    expect(routesOf(prepare(routerChain()), 'r1')).toEqual([
      expect.objectContaining({
        destination: '10.0.1.0/24',
        nextHop: 'direct',
        protocol: 'connected',
      }),
      expect.objectContaining({
        destination: '10.0.12.0/30',
        nextHop: 'direct',
        protocol: 'connected',
      }),
    ]);
  });
});

describe('fact 1: ping reports the reply; the forward leg ends at the first deliver', () => {
  const forwardOnly = () =>
    withNodeData(routerChain(), 'r1', {
      staticRoutes: [{ destination: '10.0.2.0/24', nextHop: '10.0.12.2' }],
    });

  it('a ping whose request arrives but whose reply has no route is "dropped"', async () => {
    const facts = await ping(forwardOnly(), 'pc', 'srv');
    expect(facts.trace?.status).toBe('dropped');
    expect(facts.status).toBe('dropped');
    expect(facts.requestDelivered).toBe(true);
    expect(facts.drop).toEqual({ nodeId: 'r2', reason: 'no-route', leg: 'reply' });
  });

  it('one merged trace holds both legs; cutting at the first deliver gives the request path', async () => {
    const facts = await ping(forwardOnly(), 'pc', 'srv');
    expect(facts.traces).toHaveLength(1);
    expect(facts.trace?.hops.map((hop) => `${hop.event}@${hop.nodeId}`)).toEqual([
      'create@pc',
      'forward@r1',
      'forward@r2',
      'deliver@srv',
      'create@srv',
      'drop@r2',
    ]);
    expect(facts.forwardNodeIds).toEqual(['pc', 'r1', 'r2', 'srv']);
    expect(facts.forwardEdgeIds).toEqual(['e-pc', 'e-12', 'e-srv']);
  });

  it('a request that never arrives drops on the request leg, at the router without a route', async () => {
    const facts = await ping(routerChain(), 'pc', 'srv');
    expect(facts.requestDelivered).toBe(false);
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'no-route', leg: 'request' });
    expect(facts.forwardNodeIds).toEqual(['pc', 'r1']);
  });
});

describe('fact 2: NAT is observable only with transport ports', () => {
  it('a ping through inside/outside interfaces is delivered and carries no natTranslation', async () => {
    const facts = await ping(natLan(), 'pc1', 'srv');
    expect(facts.status).toBe('delivered');
    expect(facts.natTranslations).toEqual([]);
  });

  it('the SYN of a TCP connect is translated at the NAT router: the exact natTranslation shape', async () => {
    const facts = await tcp(natLan(), 'pc1', 'srv');
    expect(facts.natTranslations).toEqual([
      {
        nodeId: 'r1',
        type: 'snat',
        preSrcIp: '192.168.1.10',
        preSrcPort: 49152,
        postSrcIp: '203.0.113.1',
        postSrcPort: 1024,
        preDstIp: '203.0.113.10',
        preDstPort: 80,
        postDstIp: '203.0.113.10',
        postDstPort: 80,
      },
    ]);
    expect(facts.requestDelivered).toBe(true);
    expect(facts.trace?.status).toBe('delivered');
  });

  it('a TCP handshake through NAT fails at the SYN-ACK with no-nat-entry (engine quirk)', async () => {
    // The server answers to the client's inside address, not the translated
    // one, so the NAT router finds no entry for the reply. "Translated" must
    // therefore be judged on the SYN alone, never on handshake success.
    const engine = new MainThreadEngine(prepare(natLan()), new HookEngine());
    const result = await engine.tcpConnect('pc1', 'srv', 49152, 80);
    engine.dispose();
    expect(result.success).toBe(false);
    expect(result.connection).toBeNull();
    expect(result.failureReason).toBe('TCP handshake failed at SYN-ACK');
    expect(result.traces.map((trace) => trace.status)).toEqual(['delivered', 'dropped']);

    const facts = await tcp(natLan(), 'pc1', 'srv');
    expect(facts.status).toBe('dropped');
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'no-nat-entry', leg: 'reply' });
  });

  it('without NAT a TCP connect succeeds with three traces: SYN, SYN-ACK, ACK', async () => {
    const facts = await tcp(lanBehindRouter(), 'pc1', 'srv');
    expect(facts.status).toBe('delivered');
    expect(facts.traces.map((trace) => trace.status)).toEqual([
      'delivered',
      'delivered',
      'delivered',
    ]);
    expect(facts.natTranslations).toEqual([]);
  });
});

describe('fact 3: an ACL denies whatever no rule permits', () => {
  const webOnly: AclRule = {
    id: 'web',
    priority: 10,
    action: 'permit',
    protocol: 'tcp',
    dstPort: 80,
  };
  const withLanAcl = (inboundAcl: AclRule[]) =>
    withInterface(lanBehindRouter(), 'r1', 'lan', { inboundAcl });

  it('no matching rule: dropped at the router with acl-deny and matchedRule null', async () => {
    const facts = await ping(withLanAcl([webOnly]), 'pc1', 'srv');
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'acl-deny', leg: 'request' });
    expect(facts.aclMatches).toEqual([
      {
        nodeId: 'r1',
        direction: 'inbound',
        interfaceId: 'lan',
        interfaceName: 'lan',
        matchedRule: null,
        action: 'deny',
        byConnTrack: false,
      },
    ]);
  });

  it('a matching permit lets the port through and names the rule; another port is denied', async () => {
    const allowed = await tcp(withLanAcl([webOnly]), 'pc1', 'srv', 80);
    expect(allowed.status).toBe('delivered');
    expect(allowed.aclMatches[0]).toMatchObject({ action: 'permit', matchedRule: { id: 'web' } });

    const refused = await tcp(withLanAcl([webOnly]), 'pc1', 'srv', 22);
    expect(refused.drop).toEqual({ nodeId: 'r1', reason: 'acl-deny', leg: 'request' });
  });

  it('an explicit deny names its rule', async () => {
    const facts = await ping(
      withLanAcl([
        { id: 'no-ping', priority: 5, action: 'deny', protocol: 'icmp' },
        { id: 'rest', priority: 10, action: 'permit', protocol: 'any' },
      ]),
      'pc1',
      'srv',
    );
    expect(facts.drop?.reason).toBe('acl-deny');
    expect(facts.aclMatches[0]).toMatchObject({ action: 'deny', matchedRule: { id: 'no-ping' } });
  });

  it('an EMPTY inboundAcl denies everything; only an absent one filters nothing', async () => {
    const empty = await ping(withLanAcl([]), 'pc1', 'srv');
    expect(empty.drop).toEqual({ nodeId: 'r1', reason: 'acl-deny', leg: 'request' });
    expect(empty.aclMatches[0]).toMatchObject({ matchedRule: null, action: 'deny' });

    const absent = await ping(lanBehindRouter(), 'pc1', 'srv');
    expect(absent.status).toBe('delivered');
    expect(absent.aclMatches).toEqual([]);
  });

  it('an outboundAcl drops at the same router, reported with direction outbound', async () => {
    const facts = await ping(
      withInterface(lanBehindRouter(), 'r1', 'wan', {
        outboundAcl: [{ id: 'no-ping', priority: 5, action: 'deny', protocol: 'icmp' }],
      }),
      'pc1',
      'srv',
    );
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'acl-deny', leg: 'request' });
    expect(facts.aclMatches[0]).toMatchObject({ direction: 'outbound', interfaceId: 'wan' });
  });

  it('an ACL filters replies too, and statefulFirewall does not let them back in', async () => {
    const denyWanIn = withInterface(lanBehindRouter(), 'r1', 'wan', {
      inboundAcl: [{ id: 'deny-all', priority: 1, action: 'deny', protocol: 'any' }],
    });
    for (const topology of [denyWanIn, withNodeData(denyWanIn, 'r1', { statefulFirewall: true })]) {
      for (const facts of [await ping(topology, 'pc1', 'srv'), await tcp(topology, 'pc1', 'srv')]) {
        expect(facts.requestDelivered).toBe(true);
        expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'acl-deny', leg: 'reply' });
      }
    }
  });
});

describe('fact 4: spanning tree and a link that is down', () => {
  it('healthy triangle: one port blocks and frames go round the other way', async () => {
    expect(stpRootNodeId(prepare(switchTriangle()))).toBe('swa');
    expect(roles(switchTriangle())['swc:to-swb']).toBe('BLOCKED');
    const facts = await ping(switchTriangle(), 'hb', 'hc');
    expect(facts.status).toBe('delivered');
    expect(facts.forwardNodeIds).toEqual(['hb', 'swb', 'swa', 'swc', 'hc']);
  });

  it('computeStp ignores edge.state "down": the roles do not change', () => {
    expect(roles(withLinkState(switchTriangle(), 'e-ab', 'down'))).toEqual(roles(switchTriangle()));
  });

  it('with a down link in the loop the still-blocked port strands a switch', async () => {
    const down = withLinkState(switchTriangle(), 'e-ab', 'down');
    const facts = await ping(down, 'ha', 'hb');
    expect(facts.status).toBe('dropped');
    expect(facts.forwardEdgeIds).not.toContain('e-ab');
    // The frame is flooded to a bystander, which reports the drop.
    expect(facts.drop).toEqual({ nodeId: 'hc', reason: 'no-route', leg: 'request' });
  });

  it('a frame still crosses the down switch link from its target end (engine quirk)', async () => {
    // e-ab is swa -> swb. swa will not send over it, but swb does.
    const down = withLinkState(switchTriangle(), 'e-ab', 'down');
    const facts = await ping(down, 'hb', 'ha');
    expect(facts.requestDelivered).toBe(true);
    expect(facts.forwardEdgeIds).toEqual(['e-hb', 'e-ab', 'e-ha']);
    expect(facts.status).toBe('dropped');
    expect(facts.drop).toEqual({ nodeId: 'hc', reason: 'no-route', leg: 'reply' });
  });

  it('stpConfig.disabledPortIds is the working way to take a switch link out: STP re-converges', async () => {
    const shut = withNodeData(switchTriangle(), 'swa', {
      stpConfig: { priority: 4096, disabledPortIds: ['to-swb'] },
    });
    expect(roles(shut)).toMatchObject({
      'swa:to-swb': 'DISABLED',
      'swb:to-swa': 'DISABLED',
      'swb:to-swc': 'ROOT',
      'swc:to-swb': 'DESIGNATED',
    });
    const facts = await ping(shut, 'ha', 'hb');
    expect(facts.status).toBe('delivered');
    expect(facts.forwardNodeIds).toEqual(['ha', 'swa', 'swc', 'swb', 'hb']);
  });

  it('a down host cable drops at the host itself with no-route', async () => {
    const facts = await ping(withLinkState(lanBehindRouter(), 'e-pc1', 'down'), 'pc1', 'srv');
    expect(facts.drop).toEqual({ nodeId: 'pc1', reason: 'no-route', leg: 'request' });
    expect(facts.forwardNodeIds).toEqual(['pc1']);
  });

  it('a down switch uplink is reported by a bystander host, not by the switch', async () => {
    const facts = await ping(withLinkState(lanBehindRouter(), 'e-up', 'down'), 'pc1', 'srv');
    expect(facts.drop).toEqual({ nodeId: 'pc2', reason: 'no-route', leg: 'request' });
  });
});

describe('fact 5: hosts with a bad address', () => {
  const wrongSubnet = () => withNodeData(lanBehindRouter(), 'pc1', { ip: '172.16.5.5' });

  it('wrong-subnet host to a same-LAN peer: the request arrives, the reply does not', async () => {
    const facts = await ping(wrongSubnet(), 'pc1', 'pc2');
    expect(facts.requestDelivered).toBe(true);
    expect(facts.status).toBe('dropped');
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'no-route', leg: 'reply' });
  });

  it('a same-LAN peer cannot reach the wrong-subnet host: no-route at the router', async () => {
    const facts = await ping(wrongSubnet(), 'pc2', 'pc1');
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'no-route', leg: 'request' });
  });

  it('wrong-subnet host across a router: not delivered, and the drop is at a bystander', async () => {
    const out = await ping(wrongSubnet(), 'pc1', 'srv');
    expect(out.requestDelivered).toBe(false);
    expect(out.drop).toEqual({ nodeId: 'pc2', reason: 'no-route', leg: 'request' });

    const back = await ping(wrongSubnet(), 'srv', 'pc1');
    expect(back.drop).toEqual({ nodeId: 'r1', reason: 'no-route', leg: 'request' });
  });

  it('a router interface on the wrong network strands its LAN the same way', async () => {
    const facts = await ping(
      withInterface(lanBehindRouter(), 'r1', 'lan', { ipAddress: '192.168.9.1' }),
      'pc1',
      'srv',
    );
    expect(facts.drop).toEqual({ nodeId: 'pc2', reason: 'no-route', leg: 'request' });
  });

  it('a host with no address: the engine throws invariant/no-ip; runProbe reports no-address', async () => {
    const blank = lanBehindRouter();
    blank.nodes[0] = host('pc1', null);
    const prepared = prepare(blank);

    const engine = new MainThreadEngine(prepared, new HookEngine());
    await expect(engine.ping('pc1', '203.0.113.10')).rejects.toMatchObject({
      code: 'invariant/no-ip',
      message: 'Node pc1 has no effective IP',
    });
    expect(await engine.tcpConnect('pc1', 'srv', 49152, 80)).toEqual({
      success: false,
      connection: null,
      traces: [],
      failureReason: 'TCP handshake failed: missing node IP',
    });
    // Pinging an address nobody owns does not throw: it drops at the sender.
    const stray = await engine.ping('srv', '192.168.1.10');
    expect(stray.status).toBe('dropped');
    expect(stray.hops[stray.hops.length - 1]).toMatchObject({ event: 'drop', reason: 'no-route' });
    engine.dispose();

    for (const [from, to] of [
      ['pc1', 'srv'],
      ['srv', 'pc1'],
    ] as const) {
      const facts = await runProbe(prepared, { via: 'ping', from, to });
      expect(facts.status).toBe('no-address');
      expect(facts.trace).toBeNull();
    }
    expect((await runProbe(prepared, { via: 'ping', from: 'nobody', to: 'srv' })).status).toBe(
      'no-address',
    );
  });

  it('two hosts with one address: the second host loses its replies and takes the first one’s', async () => {
    const duplicate = withNodeData(lanBehindRouter(), 'pc2', { ip: '192.168.1.10' });
    // Traffic to the shared address is dropped at pc2, whichever host was meant.
    for (const to of ['pc1', 'pc2']) {
      const facts = await ping(duplicate, 'srv', to);
      expect(facts.drop).toEqual({ nodeId: 'pc2', reason: 'no-route', leg: 'request' });
    }
    expect((await ping(duplicate, 'pc2', 'srv')).status).toBe('delivered');
    const first = await ping(duplicate, 'pc1', 'srv');
    expect(first.requestDelivered).toBe(true);
    expect(first.drop).toEqual({ nodeId: 'pc2', reason: 'no-route', leg: 'reply' });
  });

  it('a host that takes the gateway address breaks only itself (routing-loop on its reply)', async () => {
    const thief = withNodeData(lanBehindRouter(), 'pc2', { ip: '192.168.1.1' });
    expect((await ping(thief, 'pc1', 'srv')).status).toBe('delivered');
    const facts = await ping(thief, 'pc2', 'srv');
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'routing-loop', leg: 'reply' });
  });
});

describe('fact 6: OSPF cost', () => {
  const routeTo = (topology: TopologySnapshot, destination: string) =>
    routesOf(prepare(topology), 'r1').find((route) => route.destination === destination);

  it('several areas entries with one areaId are tolerated; equal costs give one route with two next hops', async () => {
    expect(routeTo(ospfDiamond(), DIAMOND_NETS.right)).toMatchObject({
      nextHop: '10.0.12.2',
      protocol: 'ospf',
      adminDistance: 110,
      metric: 3,
      equalCostNextHops: [{ nextHop: '10.0.12.2' }, { nextHop: '10.0.13.2' }],
    });
    const facts = await ping(ospfDiamond(), 'pc', 'srv');
    expect(facts.status).toBe('delivered');
    expect(facts.forwardNodeIds).toEqual(['pc', 'r1', 'r2', 'r4', 'srv']);
  });

  it('the cost of a link is the cost of the areas entry whose networks holds that network', async () => {
    const raised = withOspfCost(ospfDiamond(), 'r1', DIAMOND_NETS.top1, 50);
    const route = routeTo(raised, DIAMOND_NETS.right);
    expect(route).toMatchObject({ nextHop: '10.0.13.2', metric: 3 });
    expect(route?.equalCostNextHops).toBeUndefined();

    const facts = await ping(raised, 'pc', 'srv');
    expect(facts.status).toBe('delivered');
    expect(facts.forwardNodeIds).toEqual(['pc', 'r1', 'r3', 'r4', 'srv']);
    expect(facts.forwardEdgeIds).toEqual(['e-pc', 'e-13', 'e-34', 'e-srv']);
  });

  it('a cost is outbound only: the reply still comes back over the cheap side of r4', async () => {
    const raised = withOspfCost(ospfDiamond(), 'r1', DIAMOND_NETS.top1, 50);
    const facts = await ping(raised, 'pc', 'srv');
    const reply = facts.trace?.hops.slice(facts.forwardNodeIds.length).map((hop) => hop.nodeId);
    expect(reply).toEqual(['srv', 'r4', 'r2', 'r1', 'pc']);
  });

  it('raising the other side keeps the path on r2', async () => {
    const raised = withOspfCost(ospfDiamond(), 'r1', DIAMOND_NETS.bottom1, 50);
    expect((await ping(raised, 'pc', 'srv')).forwardNodeIds).toEqual([
      'pc',
      'r1',
      'r2',
      'r4',
      'srv',
    ]);
  });

  it('one entry listing several networks gives all of them its cost', () => {
    const single = withNodeData(ospfDiamond(), 'r1', {
      ospfConfig: {
        routerId: '1.1.1.1',
        areas: [
          {
            areaId: '0.0.0.0',
            networks: [DIAMOND_NETS.left, DIAMOND_NETS.top1, DIAMOND_NETS.bottom1],
            cost: 50,
          },
        ],
      },
    });
    expect(routeTo(single, DIAMOND_NETS.right)).toMatchObject({ metric: 52 });
  });

  it('OSPF routes around a down link', async () => {
    const down = withLinkState(ospfDiamond(), 'e-12', 'down');
    const facts = await ping(down, 'pc', 'srv');
    expect(facts.status).toBe('delivered');
    expect(facts.forwardNodeIds).toEqual(['pc', 'r1', 'r3', 'r4', 'srv']);
  });
});

describe('fact 7: an engine keeps state between probes; a fresh engine per probe does not', () => {
  const natPort = (facts: ProbeFacts) => facts.natTranslations[0]?.postSrcPort;

  it('one engine: the second connection gets the next NAT port and the table grows', async () => {
    const engine = new MainThreadEngine(prepare(natLan()), new HookEngine());
    const first = await engine.tcpConnect('pc1', 'srv', 49152, 80);
    const second = await engine.tcpConnect('pc2', 'srv', 49152, 80);
    const port = (traces: typeof first.traces) =>
      traces[0]?.hops.find((hop) => hop.natTranslation)?.natTranslation?.postSrcPort;
    expect([port(first.traces), port(second.traces)]).toEqual([1024, 1025]);
    expect(engine.getState().natTables[0]?.entries).toHaveLength(2);
    expect(engine.getState().traces.length).toBeGreaterThan(2);
    engine.dispose();
    expect(engine.getState().traces).toEqual([]);
  });

  it('fresh engines: each probe sees port 1024, in either order', async () => {
    const prepared = prepare(natLan());
    const a = { via: 'tcp', from: 'pc1', to: 'srv', dstPort: 80 } as const;
    const b = { via: 'tcp', from: 'pc2', to: 'srv', dstPort: 80 } as const;
    const forward = [await runProbe(prepared, a), await runProbe(prepared, b)];
    const reverse = [await runProbe(prepared, b), await runProbe(prepared, a)].reverse();
    expect(forward.map(natPort)).toEqual([1024, 1024]);
    expect(reverse.map(natPort)).toEqual([1024, 1024]);
    expect(forward.map((facts) => facts.forwardNodeIds)).toEqual(
      reverse.map((facts) => facts.forwardNodeIds),
    );
  });

  it('probing does not change the prepared topology', async () => {
    const prepared = prepare(natLan());
    const before = JSON.stringify([prepared.nodes, prepared.edges, [...prepared.routeTables]]);
    await runProbe(prepared, { via: 'tcp', from: 'pc1', to: 'srv', dstPort: 80 });
    await runProbe(prepared, { via: 'ping', from: 'pc2', to: 'srv' });
    expect(JSON.stringify([prepared.nodes, prepared.edges, [...prepared.routeTables]])).toBe(
      before,
    );
  });
});

describe('fact 8: static routes', () => {
  const statics = (topology: TopologySnapshot) =>
    routesOf(prepare(topology), 'r1').filter((route) => route.protocol === 'static');
  const viaR2 = { destination: DIAMOND_NETS.right, nextHop: '10.0.12.2' };
  const viaR3 = { destination: DIAMOND_NETS.right, nextHop: '10.0.13.2' };

  it('of two static routes to one prefix only the lower metric is installed', async () => {
    const topology = staticDiamond([
      { ...viaR3, metric: 10 },
      { ...viaR2, metric: 1 },
    ]);
    expect(statics(topology)).toEqual([
      expect.objectContaining({ nextHop: '10.0.12.2', metric: 1, adminDistance: 1 }),
    ]);
    expect((await ping(topology, 'pc', 'srv')).forwardNodeIds).toEqual([
      'pc',
      'r1',
      'r2',
      'r4',
      'srv',
    ]);

    const swapped = staticDiamond([
      { ...viaR3, metric: 1 },
      { ...viaR2, metric: 10 },
    ]);
    expect((await ping(swapped, 'pc', 'srv')).forwardNodeIds).toEqual([
      'pc',
      'r1',
      'r3',
      'r4',
      'srv',
    ]);
  });

  it('equal metrics become one route with equalCostNextHops', () => {
    expect(statics(staticDiamond([viaR3, viaR2]))).toEqual([
      expect.objectContaining({
        nextHop: '10.0.12.2',
        metric: 0,
        equalCostNextHops: [{ nextHop: '10.0.12.2' }, { nextHop: '10.0.13.2' }],
      }),
    ]);
  });

  it('a floating static does NOT take over when the preferred link is down: no-route', async () => {
    const down = withLinkState(
      staticDiamond([
        { ...viaR3, metric: 10 },
        { ...viaR2, metric: 1 },
      ]),
      'e-12',
      'down',
    );
    // The dead route stays in the table and the backup was never installed.
    expect(statics(down)).toEqual([expect.objectContaining({ nextHop: '10.0.12.2', metric: 1 })]);
    const facts = await ping(down, 'pc', 'srv');
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'no-route', leg: 'request' });
  });

  it('a backup through a LESS SPECIFIC prefix does take over when the preferred link is down', async () => {
    const topology = staticDiamond([viaR2, { destination: '0.0.0.0/0', nextHop: '10.0.13.2' }]);
    expect((await ping(topology, 'pc', 'srv')).forwardNodeIds).toEqual([
      'pc',
      'r1',
      'r2',
      'r4',
      'srv',
    ]);

    const facts = await ping(withLinkState(topology, 'e-12', 'down'), 'pc', 'srv');
    expect(facts.status).toBe('delivered');
    expect(facts.forwardNodeIds).toEqual(['pc', 'r1', 'r3', 'r4', 'srv']);
    const decision = facts.trace?.hops.find((hop) => hop.nodeId === 'r1')?.routingDecision;
    expect(decision?.winner).toMatchObject({ destination: '0.0.0.0/0', selectedByFailover: true });
  });

  it('a router does not fail over for a link that is down further along', async () => {
    const facts = await ping(
      withLinkState(
        staticDiamond([viaR2, { destination: '0.0.0.0/0', nextHop: '10.0.13.2' }]),
        'e-24',
        'down',
      ),
      'pc',
      'srv',
    );
    expect(facts.drop).toEqual({ nodeId: 'r2', reason: 'no-route', leg: 'request' });
  });

  it('a default route 0.0.0.0/0 works as a static route', async () => {
    const facts = await ping(
      staticDiamond([{ destination: '0.0.0.0/0', nextHop: '10.0.12.2' }]),
      'pc',
      'srv',
    );
    expect(facts.status).toBe('delivered');
    expect(facts.forwardNodeIds).toEqual(['pc', 'r1', 'r2', 'r4', 'srv']);
  });

  it('a static route beats OSPF for the same prefix: only the static one is in the table', async () => {
    const ospfPrefersR3 = withOspfCost(ospfDiamond(), 'r1', DIAMOND_NETS.top1, 50);
    const mixed = withNodeData(ospfPrefersR3, 'r1', { staticRoutes: [viaR2] });
    expect(
      routesOf(prepare(mixed), 'r1').filter((route) => route.destination === DIAMOND_NETS.right),
    ).toEqual([
      expect.objectContaining({ protocol: 'static', adminDistance: 1, nextHop: '10.0.12.2' }),
    ]);
    expect((await ping(mixed, 'pc', 'srv')).forwardNodeIds).toEqual([
      'pc',
      'r1',
      'r2',
      'r4',
      'srv',
    ]);
  });

  it('a next hop that is on no connected network is no-route at that router', async () => {
    const facts = await ping(
      staticDiamond([{ destination: DIAMOND_NETS.right, nextHop: '10.9.9.9' }]),
      'pc',
      'srv',
    );
    expect(facts.drop).toEqual({ nodeId: 'r1', reason: 'no-route', leg: 'request' });
  });
});

describe('extra pins: VLANs', () => {
  it('same VLAN on one switch is delivered; another VLAN drops at the switch with no-egress-in-vlan', async () => {
    expect((await ping(vlanSwitch(), 'a1', 'a2')).status).toBe('delivered');
    const facts = await ping(vlanSwitch(), 'a1', 'b1');
    expect(facts.drop).toEqual({ nodeId: 'sw1', reason: 'no-egress-in-vlan', leg: 'request' });
    expect(facts.forwardNodeIds).toEqual(['a1', 'sw1']);
  });

  it('a trunk carries the VLANs it allows, and the far switch keeps them apart', async () => {
    expect((await ping(trunkedSwitches(), 'a1', 'a2')).forwardNodeIds).toEqual([
      'a1',
      'sw1',
      'sw2',
      'a2',
    ]);
    expect((await ping(trunkedSwitches(), 'b1', 'b2')).status).toBe('delivered');
    expect((await ping(trunkedSwitches(), 'a1', 'b2')).drop).toEqual({
      nodeId: 'sw2',
      reason: 'no-egress-in-vlan',
      leg: 'request',
    });
  });

  it('a trunk that omits a VLAN drops that VLAN at the near switch and still carries the other', async () => {
    const onlyTen = trunkedSwitches([10]);
    expect((await ping(onlyTen, 'b1', 'b2')).drop).toEqual({
      nodeId: 'sw1',
      reason: 'no-egress-in-vlan',
      leg: 'request',
    });
    expect((await ping(onlyTen, 'a1', 'a2')).status).toBe('delivered');
  });
});

describe('extra pins: a down trunk with no loop', () => {
  it('drops in both directions at the near switch, reported as no-egress-in-vlan', async () => {
    const down = withLinkState(trunkedSwitches(), 'e-trunk', 'down');
    expect((await ping(down, 'a1', 'a2')).drop).toEqual({
      nodeId: 'sw1',
      reason: 'no-egress-in-vlan',
      leg: 'request',
    });
    expect((await ping(down, 'a2', 'a1')).drop).toEqual({
      nodeId: 'sw2',
      reason: 'no-egress-in-vlan',
      leg: 'request',
    });
  });
});

describe('extra pins: reading spanning tree from the prepared topology', () => {
  it('stpRoot is a bridge id; the root node id and a port role are read through prepare.ts', () => {
    const prepared = prepare(switchTriangle());
    expect(prepared.stpRoot).toMatchObject({ priority: 4096 });
    expect(stpRootNodeId(prepared)).toBe('swa');
    expect(stpPort(prepared, 'swc', 'to-swb')).toMatchObject({
      switchNodeId: 'swc',
      portId: 'to-swb',
      role: 'BLOCKED',
      state: 'BLOCKING',
      rootPathCost: 19,
    });
    expect(stpPort(prepared, 'swb', 'to-swa')?.role).toBe('ROOT');
    expect(stpPort(prepared, 'swa', 'h')?.role).toBe('DESIGNATED');
    expect(stpPort(prepared, 'swa', 'missing')).toBeNull();
  });

  it('lowering a priority moves the root', () => {
    expect(stpRootNodeId(prepare(switchTriangle({ swc: 0 })))).toBe('swc');
  });

  it('a topology with no switches has no root and no port states', () => {
    const prepared = prepare(routerChain());
    expect(prepared.stpRoot).toBeNull();
    expect(stpRootNodeId(prepared)).toBeNull();
    expect(prepared.stpStates.size).toBe(0);
  });
});
