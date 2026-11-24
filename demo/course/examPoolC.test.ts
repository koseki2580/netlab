/**
 * Wave C (TC-2522 to TC-2527): each new question's right option is what its
 * lesson's model, or the engine running the lesson's network, gives.
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { buildUdpPacket } from '../../src/layers/l4-transport/udpPacketBuilder';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import type { NetworkTopology } from '../../src/types/topology';
import { routeFor } from '../networking/anycast';
import { propagate } from '../networking/bgpPolicy';
import { METHODS, TRANSPORT, networkCan } from '../networking/encryptedDns';
import { greTopology } from '../networking/GreDemo';
import { RTT, happyEyeballs, oneAtATime } from '../networking/happyEyeballs';
import { BASE_NETWORK, adjacency, trace } from '../networking/isis';
import { REQUESTS, assign } from '../networking/loadBalancer';
import { anyoneLinks, knows } from '../networking/masque';
import { cspfPlacement, igpPlacement, lspRequests } from '../networking/mplsTe';
import { failover } from '../networking/mptcp';
import { traverseTypes } from '../networking/natTraversal';
import { netconfPush, startingDevices, uplinkChange } from '../networking/netconf';
import { buildTopology as observabilityTopology } from '../networking/ObservabilityDemo';
import { rpfCheck } from '../networking/pim';
import { ISSUED_CIDS, arrive } from '../networking/quicMigration';
import { ANNOUNCEMENTS, COMPETING, ROAS, forward, validate } from '../networking/rpki';
import { capacityLeftPct, leafToLeafHops, leafToLeafPaths } from '../networking/spineLeaf';
import { POLICIES, SID, readSrPath, srTopology, type SrPolicy } from '../networking/srLesson';
import { LINK_BPS, MAX_UNSCALED_WINDOW, transfer } from '../networking/tcpOptions';
import { OUTAGE, polledStatus, statusChanges } from '../networking/telemetry';
import { observerView } from '../networking/vpnTunnel';
import { APPS, USERS, decide, exposure, vpnReachable } from '../networking/ztna';
import { examLevel } from './examLevels';
import { POOL_C } from './examPoolC';

const right = (id: string) => {
  const q = [...POOL_C.values()].flat().find((entry) => entry.id === id)!;
  return q.options[q.answer]!.en;
};
const engineOn = (topology: NetworkTopology) =>
  new MainThreadEngine(enrichTopology(topology), new HookEngine());

// TC-2522: wave C joins the slots of levels 3, 4 and 8 and asks about the lesson it is taught by.
describe('wave C sits in the slots of its stage’s tests (TC-2522)', () => {
  it('each question is in the slot it is keyed by, after that slot’s three', () => {
    const levels = [3, 4, 8].map((n) => examLevel(n)!);
    for (const [key, questions] of POOL_C) {
      const slot = levels.flatMap((level) => level.slots!).find((s) => s[0]!.id === key)!;
      expect(slot, key).toBeDefined();
      for (const q of questions) expect(slot.indexOf(q), q.id).toBeGreaterThanOrEqual(3);
    }
    expect([...POOL_C.values()].flat()).toHaveLength(22);
  });
});

// TC-2523: the stage 7 questions on access, connectivity and naming.
describe('stage 7: access, connectivity and naming (TC-2523)', () => {
  const contractor = USERS.find((user) => user.id === 'contractor')!;

  it('ZTNA: the contractor reaches only the code repository, the VPN all five apps', () => {
    expect(vpnReachable()).toHaveLength(5);
    expect(exposure('ztna', contractor)).toEqual({ apps: 1, addresses: 0 });
    expect(APPS.filter((app) => decide(contractor, app.id).allow).map((app) => app.id)).toEqual([
      'code-repo',
    ]);
    expect(right('s7-ztna-contractor')).toBe('Only the code repo');
  });

  it('NAT traversal: two symmetric NATs cannot punch through; ICE picks a relayed pair', () => {
    expect(traverseTypes('symmetric', 'symmetric', false).directWorks).toBe(false);
    expect(traverseTypes('symmetric', 'symmetric', false).selected).toBeNull();
    expect(traverseTypes('symmetric', 'symmetric').selected!.remote.type).toBe('relay');
    expect(right('s7-ice-two-symmetric')).toMatch(/TURN relay/);
  });

  it('Happy Eyeballs: a silent IPv6 path gives IPv4 at 250 + 30 ms; one at a time takes over 21 s', () => {
    expect(RTT['v6-broken']).toEqual({ v6: null, v4: 30 });
    expect(happyEyeballs('v6-broken')).toEqual({ family: 'IPv4', connectedMs: 280 });
    expect(oneAtATime('v6-broken').connectedMs).toBeGreaterThan(21_000);
    expect(right('s7-happy-eyeballs-broken-v6')).toBe('Over IPv4, about 280 ms in');
  });

  it('anycast: Frankfurt withdraws and the same prefix leads Singapore to Tokyo', () => {
    expect(routeFor('isp-sg')!.site).toBe('site-fra');
    expect(routeFor('isp-sg', ['site-tyo', 'site-nyc'])!.site).toBe('site-tyo');
    expect(right('s7-anycast-withdraw')).toMatch(/^Nothing; routes now lead to Tokyo/);
  });

  it('encrypted DNS: DoH on TCP 443 is the one method a port block cannot stop alone', () => {
    const escapes = METHODS.filter((method) => !networkCan(method).blockByPortAlone);
    expect(escapes).toEqual(['doh']);
    expect(TRANSPORT.doh).toMatchObject({ proto: 'tcp', port: 443 });
    expect(right('s7-encdns-port-block')).toBe('DNS over HTTPS, TCP 443');
  });

  it('MASQUE: with two relays no one but you links address and site; one proxy does', () => {
    expect(anyoneLinks('two-hop')).toBeNull();
    expect(knows('two-hop', 'wifi').site).toBe(false);
    expect(anyoneLinks('one-proxy')).toBe('relay2');
    expect(right('s7-masque-two-hop')).toBe('No one of them');
  });
});

// TC-2524: the stage 7 questions on transport and operations.
describe('stage 7: transport and operations (TC-2524)', () => {
  it('QUIC migration: the server finds the connection by a spare connection ID; TCP misses', () => {
    expect(arrive('quic', 'new-network')).toMatchObject({
      arrivingKey: ISSUED_CIDS[1],
      matched: true,
    });
    expect(arrive('tcp', 'new-network').matched).toBe(false);
    expect(right('s7-quic-migration-cid')).toBe('By its connection ID');
  });

  it('window scaling: a stripped option leaves 65,535 bytes, about 3.5 Mbit/s, still working', () => {
    const result = transfer(LINK_BPS, 150, { offered: true, stripped: true });
    expect(result.windowBytes).toBe(MAX_UNSCALED_WINDOW);
    expect(result.throughputBps / 1e6).toBeCloseTo(3.5, 1);
    expect(right('s7-wscale-stripped')).toBe('It works, at about 3.5 Mbit/s');
  });

  it('MPTCP: with MP_CAPABLE stripped it is plain TCP and losing Wi-Fi breaks it', () => {
    expect(failover('mptcp', 3, false)).toMatchObject({ mode: 'tcp', finished: false });
    expect(failover('mptcp', 3, true)).toMatchObject({ mode: 'mptcp', finished: true });
    expect(right('s7-mptcp-stripped')).toBe('It breaks: plain TCP');
  });

  it('NETCONF: an out-of-range MTU fails validation and running is exactly as before', () => {
    const r2 = startingDevices()[1]!;
    const result = netconfPush(r2.running, uplinkChange('uplink to core', '10.1.2.1/24', '10000'));
    expect(result.committed).toBe(false);
    expect(result.running).toEqual(r2.running);
    expect(result.errors[0]).toMatchObject({ tag: 'invalid-value' });
    expect(right('s7-netconf-bad-mtu')).toBe('Exactly as it was before');
  });

  it('telemetry: both five-minute polls find the link up; the change stream sees the outage', () => {
    expect(OUTAGE).toEqual({ from: 400, to: 430 });
    expect(polledStatus().map((poll) => poll.status)).toEqual(['UP', 'UP']);
    expect(statusChanges().map((change) => change.at)).toEqual([400, 430]);
    expect(right('s7-telemetry-poll-miss')).toBe('Both UP');
  });
});

// TC-2525: the stage 6 questions on routing and fabrics.
describe('stage 6: routing and fabrics (TC-2525)', () => {
  it('IS-IS: Level 1 routers of two areas form no adjacency; R1 reaches R5 via R2 over Level 2', () => {
    expect(adjacency(BASE_NETWORK, 'R1', 'R5')).toBe('none');
    expect(trace(BASE_NETWORK, 'R1', 'R5')).toMatchObject({
      reached: true,
      hops: ['R1', 'R2', 'R4', 'R5'],
      metric: 30,
    });
    expect(right('l3-isis-l1-areas')).toBe('Via its area’s L1/L2 router');
  });

  it('spine-leaf: one of four spines down leaves three paths, 75 %, still three switches apart', () => {
    const hurt = { leaves: 8, spines: 4, failed: 1 };
    expect(leafToLeafPaths(hurt)).toBe(3);
    expect(capacityLeftPct(hurt)).toBe(75);
    expect(leafToLeafHops(hurt)).toBe(3);
    expect(right('l3-spine-down')).toBe('Three paths, 75 % of capacity');
  });

  it('PIM: on the source tree R5 accepts only from R4, so R3’s copy fails RPF', () => {
    expect(rpfCheck('R5', 'R3', { tree: 'source' })).toEqual({
      rpfNeighbour: 'R4',
      accepted: false,
    });
    expect(right('l3-pim-rpf')).toBe('Drops it: it fails RPF');
  });

  it('community: NO_EXPORT keeps the route in AS65001; nothing is sent to AS65002', () => {
    const holders = propagate('no-export')
      .filter((router) => router.holds)
      .map((router) => router.id);
    expect(holders).toEqual(['cust', 'e1', 'c1', 'e2']);
    expect(right('l4-community-no-export')).toBe('All of AS65001, not AS65002');
  });

  it('RPKI: the /25 from AS64511 under the /24 ROA is Invalid; dropping it keeps the /24', () => {
    const announced = ANNOUNCEMENTS.find((a) => a.id === 'other-origin-25')!;
    expect(announced).toMatchObject({ prefix: '192.0.2.0/25', originAs: 64511 });
    expect(ROAS[0]).toEqual({ prefix: '192.0.2.0/24', maxLength: 24, originAs: 64500 });
    expect(validate(announced, ROAS).state).toBe('Invalid');
    expect(forward(COMPETING, ROAS, '192.0.2.10', 'drop-invalid').chosen).toMatchObject({
      prefix: '192.0.2.0/24',
    });
    expect(right('l4-rpki-more-specific')).toBe('Invalid: no ROA allows it');
  });
});

// TC-2526: the stage 6 questions on services and observability.
describe('stage 6: load balancing and flows (TC-2526)', () => {
  it('source hash: taking web3 out moves some web1 and web2 clients too, not all clients', () => {
    const all = assign('source-hash', REQUESTS).map((a) => a.server);
    const fewer = assign('source-hash', REQUESTS, [true, true, false]).map((a) => a.server);
    expect(fewer).not.toContain(2);
    expect(fewer.some((server, index) => all[index] !== 2 && server !== all[index])).toBe(true);
    expect(fewer.some((server, index) => server === all[index])).toBe(true);
    expect(right('l3-lb-hash-remove')).toBe('web3’s, and some of the others');
  });

  it('NetFlow: three sends of one flow are one record of 3 packets on R1', async () => {
    const engine = engineOn(observabilityTopology());
    for (const n of [1, 2, 3]) {
      await engine.send(
        buildUdpPacket({
          srcNodeId: 'client-1',
          dstNodeId: 'server-1',
          srcIp: '10.0.0.10',
          dstIp: '203.0.113.10',
          srcPort: 53000,
          dstPort: 53,
          srcMac: '02:00:00:00:00:10',
          dstMac: '02:00:00:00:00:20',
          packetId: `observability-udp-${n}`,
          timestamp: 3_000,
          payload: { layer: 'raw', data: 'dns query' },
        }),
      );
    }
    const updates = engine
      .getState()
      .traces.flatMap((t) => t.hops)
      .flatMap((hop) =>
        hop.observabilityTrace?.kind === 'netflow:flow-update' ? [hop.observabilityTrace] : [],
      );
    expect(new Set(updates.map((u) => u.flowKey)).size).toBe(1);
    expect(Math.max(...updates.map((u) => u.packets))).toBe(3);
    expect(right('l3-netflow-one-flow')).toBe('One flow of 3 packets');
  });
});

// TC-2527: the stage 6 questions on labels and tunnels.
describe('stage 6: labels and tunnels (TC-2527)', () => {
  const srPath = async (policy: SrPolicy) =>
    readSrPath(await engineOn(srTopology(policy)).ping('h1', '10.4.0.10'));

  it('segment routing: only R1’s stack changes to go through R3; the core’s tables stay', async () => {
    expect(POLICIES['via-r3']).toEqual([SID.r3, SID.r4]);
    expect((await srPath('via-r3')).routers).toEqual(['R1', 'R3', 'R4']);
    const core = (policy: SrPolicy) =>
      srTopology(policy)
        .nodes.filter((node) => ['r2', 'r3', 'r4'].includes(node.id))
        .map((node) => node.data.mpls);
    expect(core('via-r3')).toEqual(core('shortest'));
    expect(right('l3-sr-steer-r3')).toBe('Only the SIDs R1 pushes');
  });

  it('CSPF: with 4 Gbit/s left on A–B, LSP 2 goes A→C→Z; the IGP would overload A–B', () => {
    const { placements } = cspfPlacement(lspRequests());
    expect(placements[0]!.path!.routers).toEqual(['A', 'B', 'Z']);
    expect(placements[1]!.path!.routers).toEqual(['A', 'C', 'Z']);
    expect(placements[1]!.path!.metric).toBe(30);
    expect(igpPlacement(lspRequests()).worstLink.id).toBe('A-B');
    expect(right('l3-te-cspf')).toBe('A→C→Z, metric 30');
  });

  it('GRE: with Site B on key 200 the ping is dropped at Site B; with 100 it arrives', async () => {
    const mismatched = await engineOn(greTopology(200)).ping('host-a', '10.0.1.10');
    expect(mismatched.status).toBe('dropped');
    expect(mismatched.hops[mismatched.hops.length - 1]!.nodeId).toBe('r2');
    expect((await engineOn(greTopology(100)).ping('host-a', '10.0.1.10')).status).toBe('delivered');
    expect(right('l3-gre-key-mismatch')).toBe('Site B drops it: keys differ');
  });

  it('ESP tunnel mode: the observer reads the public addresses and the ESP header only', () => {
    expect(observerView('ipsec')).toMatchObject({
      publicAddresses: true,
      innerAddresses: false,
      innerPorts: false,
      data: false,
      tunnelId: true,
    });
    expect(observerView('gre').data).toBe(true);
    expect(right('l3-vpn-esp-observer')).toBe('The public addresses and SPI');
  });
});
