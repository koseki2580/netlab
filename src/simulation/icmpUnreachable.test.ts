import { beforeAll, describe, expect, it } from 'vitest';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { IcmpMessage } from '../types/packets';
import type { PacketHop, PacketTrace } from '../types/simulation';
import { bytesToRawString, buildIpv4HeaderBytes } from '../utils/packetLayout';
import { dataHops, makeEngine, makePacket } from './__fixtures__/helpers';
import { singleRouterTopology } from './__fixtures__/topologies';
import { ICMP_CODE, ICMP_TYPE } from './icmp';
import { DROP_LESSONS } from '../components/simulation/dropLessons';
import { simulation as en } from '../i18n/locales/en/simulation';
import { simulation as ja } from '../i18n/locales/ja/simulation';
import { canvasPanel as enCanvas } from '../i18n/locales/en/canvasPanel';
import { canvasPanel as jaCanvas } from '../i18n/locales/ja/canvasPanel';

/**
 * TC-1530..TC-1534 — a router with no route for a destination tells the
 * sender so with ICMP Destination Unreachable, network unreachable
 * (RFC 1812 §5.2.7.1, RFC 792), instead of dropping the packet silently.
 */
beforeAll(() => {
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new RouterForwarder(nodeId, topology),
  });
  layerRegistry.register({
    layerId: 'l2',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new SwitchForwarder(nodeId, topology),
  });
});

const UNROUTED = '198.51.100.10';

const noRouteDrop = (trace: PacketTrace): PacketHop | undefined =>
  dataHops(trace).find(
    (hop) => hop.nodeId === 'router-1' && hop.event === 'drop' && hop.reason === 'no-route',
  );

describe('a router with no route reports it to the sender (TC-1530, TC-1531)', () => {
  it('drops with no-route and delivers ICMP type 3 code 0 back to the client', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.ping('client-1', UNROUTED);

    expect(trace.status).toBe('dropped');
    const drop = noRouteDrop(trace);
    expect(drop?.icmpGenerated).toBe(true);

    const hops = dataHops(trace);
    const back = hops.slice(hops.indexOf(drop!) + 1);
    const delivered = back.find((hop) => hop.nodeId === 'client-1' && hop.event === 'deliver');
    expect(delivered?.protocol).toBe('ICMP');
    expect(delivered?.srcIp).toBe('10.0.0.1');
    expect(delivered?.dstIp).toBe('10.0.0.10');

    engine.selectHop(delivered!.step);
    const icmp = engine.getState().selectedPacket?.frame.payload.payload as IcmpMessage;
    expect(icmp.type).toBe(ICMP_TYPE.DESTINATION_UNREACHABLE);
    expect(icmp.code).toBe(ICMP_CODE.NET_UNREACHABLE);
  });

  it('quotes the dropped packet’s IP header and its first 8 bytes', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.ping('client-1', UNROUTED);
    const drop = noRouteDrop(trace)!;
    const delivered = dataHops(trace).find(
      (hop) => hop.nodeId === 'client-1' && hop.event === 'deliver',
    )!;

    engine.selectHop(drop.step);
    const dropped = engine.getState().selectedPacket!.frame.payload;
    engine.selectHop(delivered.step);
    const icmp = engine.getState().selectedPacket!.frame.payload.payload as IcmpMessage;
    const quotedHeader = bytesToRawString(buildIpv4HeaderBytes(dropped));
    expect(icmp.data?.startsWith(quotedHeader)).toBe(true);
    expect(icmp.data?.length).toBe(quotedHeader.length + 8);
  });
});

describe('no message about a packet with no sender to tell (TC-1532)', () => {
  it('a packet from 0.0.0.0 is dropped with no ICMP', async () => {
    const engine = makeEngine(singleRouterTopology());
    const trace = await engine.precompute(
      makePacket('p0', 'client-1', 'server-1', '0.0.0.0', UNROUTED),
    );
    const drop = noRouteDrop(trace);
    expect(drop).toBeDefined();
    expect(drop?.icmpGenerated).toBeUndefined();
    expect(dataHops(trace)[dataHops(trace).length - 1]).toBe(drop);
  });
});

describe('a traceroute stops where the destination is unreachable (TC-1533)', () => {
  it('ends at the first attempt the router answers with Destination Unreachable', async () => {
    const engine = makeEngine(singleRouterTopology());
    const traces = await engine.traceroute('client-1', UNROUTED);
    // TTL 1 expires at router-1; TTL 2 reaches it with no route and is reported.
    expect(traces).toHaveLength(2);
    expect(traces[1]!.hops.some((hop) => hop.reason === 'no-route' && hop.icmpGenerated)).toBe(
      true,
    );
  });
});

describe('the words for a no-route drop say what the router sends (TC-1534)', () => {
  it('the drop card names Destination Unreachable, network unreachable, type 3 code 0', () => {
    const lesson = DROP_LESSONS['no-route']!;
    expect(lesson.response.meta).toBe('type 3 · code 0');
    expect(lesson.response.text).toBe(en['simulation.dropLesson.noRoute.response']);
    expect(en['simulation.dropLesson.noRoute.response']).toMatch(/network unreachable/);
    expect(ja['simulation.dropLesson.noRoute.response']).toMatch(/ネットワーク到達不能/);
  });

  it('the packet story says the sender is told', () => {
    expect(enCanvas['simulation.packetStory.dropNoRoute']).toMatch(/sender told/);
    expect(jaCanvas['simulation.packetStory.dropNoRoute']).toMatch(/送信元に通知/);
  });
});
