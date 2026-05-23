import { describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import type { InFlightPacket } from '../types/packets';
import type { PacketHop } from '../types/simulation';
import { HookEmitter } from './HookEmitter';

const NODE_ID = 'node-1';
const NEXT_NODE_ID = 'node-2';
const EDGE_ID = 'edge-a';
const INGRESS = 'eth0';
const EGRESS = 'eth1';

function makePacket(): InFlightPacket {
  return {
    id: 'pkt-1',
    srcNodeId: NODE_ID,
    dstNodeId: NEXT_NODE_ID,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '10.0.0.1',
        dstIp: '10.0.0.2',
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 1000,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: '' },
        },
      },
    },
    currentDeviceId: NODE_ID,
    ingressPortId: '',
    path: [],
    timestamp: 0,
  };
}

function baseHop(): Omit<PacketHop, 'event'> {
  return {
    step: 0,
    nodeId: NODE_ID,
    nodeLabel: 'Node-1',
    srcIp: '10.0.0.1',
    dstIp: '10.0.0.2',
    ttl: 64,
    protocol: 'TCP',
    timestamp: 0,
  };
}

describe('HookEmitter.emitForHop', () => {
  it('emits packet:create with the source node id', async () => {
    const hookEngine = new HookEngine();
    const emitter = new HookEmitter(hookEngine);
    const handler = vi.fn(async (_ctx, next) => {
      await next();
    });
    hookEngine.on('packet:create', handler);
    const packet = makePacket();

    emitter.emitForHop({ ...baseHop(), event: 'create' }, packet);
    await Promise.resolve();
    await Promise.resolve();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]?.[0]).toMatchObject({
      packet,
      sourceNodeId: NODE_ID,
    });
  });

  it('emits packet:forward with decision metadata derived from the hop', async () => {
    const hookEngine = new HookEngine();
    const emitter = new HookEmitter(hookEngine);
    const handler = vi.fn(async (_ctx, next) => {
      await next();
    });
    hookEngine.on('packet:forward', handler);
    const packet = makePacket();

    emitter.emitForHop(
      {
        ...baseHop(),
        event: 'forward',
        fromNodeId: NODE_ID,
        toNodeId: NEXT_NODE_ID,
        activeEdgeId: EDGE_ID,
        ingressInterfaceId: INGRESS,
        egressInterfaceId: EGRESS,
      },
      packet,
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]?.[0]).toMatchObject({
      packet,
      fromNodeId: NODE_ID,
      toNodeId: NEXT_NODE_ID,
      decision: {
        action: 'forward',
        nextNodeId: NEXT_NODE_ID,
        edgeId: EDGE_ID,
        egressPort: EGRESS,
        egressInterfaceId: EGRESS,
        packet,
      },
    });
  });

  it('falls back to activeEdgeId for egressPort when egressInterfaceId is absent', async () => {
    const hookEngine = new HookEngine();
    const emitter = new HookEmitter(hookEngine);
    const handler = vi.fn(async (_ctx, next) => {
      await next();
    });
    hookEngine.on('packet:forward', handler);
    const packet = makePacket();

    emitter.emitForHop(
      {
        ...baseHop(),
        event: 'forward',
        fromNodeId: NODE_ID,
        toNodeId: NEXT_NODE_ID,
        activeEdgeId: EDGE_ID,
      },
      packet,
    );
    await Promise.resolve();
    await Promise.resolve();

    const ctx = handler.mock.calls[0]?.[0] as {
      decision: { egressPort: string; egressInterfaceId?: string };
    };
    expect(ctx.decision.egressPort).toBe(EDGE_ID);
    expect(ctx.decision.egressInterfaceId).toBeUndefined();
  });

  it('emits packet:deliver with destinationNodeId', async () => {
    const hookEngine = new HookEngine();
    const emitter = new HookEmitter(hookEngine);
    const handler = vi.fn(async (_ctx, next) => {
      await next();
    });
    hookEngine.on('packet:deliver', handler);
    const packet = makePacket();

    emitter.emitForHop({ ...baseHop(), event: 'deliver' }, packet);
    await Promise.resolve();
    await Promise.resolve();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]?.[0]).toMatchObject({
      packet,
      destinationNodeId: NODE_ID,
    });
  });

  it('emits packet:drop with the hop reason (falling back to "unknown")', async () => {
    const hookEngine = new HookEngine();
    const emitter = new HookEmitter(hookEngine);
    const handler = vi.fn(async (_ctx, next) => {
      await next();
    });
    hookEngine.on('packet:drop', handler);
    const packet = makePacket();

    emitter.emitForHop({ ...baseHop(), event: 'drop', reason: 'ttl-expired' }, packet);
    emitter.emitForHop({ ...baseHop(), event: 'drop' }, packet);
    await Promise.resolve();
    await Promise.resolve();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ reason: 'ttl-expired' });
    expect(handler.mock.calls[1]?.[0]).toMatchObject({ reason: 'unknown' });
  });

  it('does not emit any hook for arp-request / arp-reply events', async () => {
    const hookEngine = new HookEngine();
    const emitter = new HookEmitter(hookEngine);
    const createSpy = vi.fn(async (_ctx, next) => {
      await next();
    });
    const forwardSpy = vi.fn(async (_ctx, next) => {
      await next();
    });
    const deliverSpy = vi.fn(async (_ctx, next) => {
      await next();
    });
    const dropSpy = vi.fn(async (_ctx, next) => {
      await next();
    });
    hookEngine.on('packet:create', createSpy);
    hookEngine.on('packet:forward', forwardSpy);
    hookEngine.on('packet:deliver', deliverSpy);
    hookEngine.on('packet:drop', dropSpy);

    emitter.emitForHop({ ...baseHop(), event: 'arp-request' }, makePacket());
    emitter.emitForHop({ ...baseHop(), event: 'arp-reply' }, makePacket());
    await Promise.resolve();
    await Promise.resolve();

    expect(createSpy).not.toHaveBeenCalled();
    expect(forwardSpy).not.toHaveBeenCalled();
    expect(deliverSpy).not.toHaveBeenCalled();
    expect(dropSpy).not.toHaveBeenCalled();
  });
});
