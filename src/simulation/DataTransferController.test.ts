import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import type { FailureState } from '../types/failure';
import type { DataTransferState } from '../types/transfer';
import { makeEngine } from './__fixtures__/helpers';
import {
  dataTransferDemoTopology,
  multiHopTopology,
  singleRouterTopology,
} from './__fixtures__/topologies';
import { DataTransferController } from './DataTransferController';

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

afterEach(() => {
  vi.restoreAllMocks();
});

function packetSnapshotAtTraceStep(
  engine: ReturnType<typeof makeEngine>,
  traceId: string,
  step: number,
) {
  engine.selectTrace(traceId);
  engine.selectHop(step);
  const packet = engine.getState().selectedPacket;

  if (!packet) {
    throw new Error(`Missing packet snapshot for trace ${traceId} at step ${step}`);
  }

  return packet;
}

describe('DataTransferController', () => {
  it('single chunk transfer delivers successfully', async () => {
    const engine = makeEngine(singleRouterTopology());
    const controller = new DataTransferController(engine);

    const transfer = await controller.startTransfer(
      'client-1',
      'server-1',
      'hello from netlab',
      { chunkDelay: 0 },
    );

    const chunks = controller.getChunks(transfer.messageId);
    const reassembly = controller.getReassembly(transfer.messageId);

    expect(transfer.expectedChunks).toBe(1);
    expect(transfer.status).toBe('delivered');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].state).toBe('delivered');
    expect(reassembly?.isComplete).toBe(true);
    expect(reassembly?.checksumVerified).toBe(true);
  });

  it('large payload splits into multiple chunks', async () => {
    const engine = makeEngine(singleRouterTopology());
    const controller = new DataTransferController(engine);

    const transfer = await controller.startTransfer(
      'client-1',
      'server-1',
      'a'.repeat(4200),
      { chunkSize: 1400, chunkDelay: 0 },
    );

    expect(transfer.expectedChunks).toBe(3);
    expect(controller.getChunks(transfer.messageId)).toHaveLength(3);
  });

  it('all chunks delivered leads to complete reassembly and checksum match', async () => {
    const engine = makeEngine(multiHopTopology());
    const controller = new DataTransferController(engine);
    const payload = 'netlab-transfer-'.repeat(300);

    const transfer = await controller.startTransfer(
      'client-1',
      'server-1',
      payload,
      { chunkSize: 1400, chunkDelay: 0 },
    );

    const reassembly = controller.getReassembly(transfer.messageId);

    expect(transfer.status).toBe('delivered');
    expect(reassembly?.isComplete).toBe(true);
    expect(reassembly?.reassembledPayload).toBe(payload);
    expect(reassembly?.checksumVerified).toBe(true);
  });

  it('chunk dropped due to failure results in partial delivery', async () => {
    const engine = makeEngine(singleRouterTopology());
    const controller = new DataTransferController(engine);
    const downEdgeIds = new Set<string>();
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds,
      downInterfaceIds: new Set(),
    };
    const originalSend = engine.send.bind(engine);
    let sendCount = 0;

    vi.spyOn(engine, 'send').mockImplementation(async (packet, state = failureState) => {
      sendCount += 1;
      await originalSend(packet, state);
      if (sendCount === 1) {
        downEdgeIds.add('e2');
      }
    });

    const transfer = await controller.startTransfer(
      'client-1',
      'server-1',
      'b'.repeat(4200),
      { chunkSize: 1400, chunkDelay: 0, failureState },
    );

    const chunks = controller.getChunks(transfer.messageId);
    const reassembly = controller.getReassembly(transfer.messageId);

    expect(transfer.status).toBe('partial');
    expect(chunks.filter((chunk) => chunk.state === 'delivered')).toHaveLength(1);
    expect(chunks.filter((chunk) => chunk.state === 'dropped')).toHaveLength(2);
    expect(reassembly?.isComplete).toBe(false);
    expect(reassembly?.checksumVerified).toBeUndefined();
  });

  it('clear resets all state', async () => {
    const engine = makeEngine(singleRouterTopology());
    const controller = new DataTransferController(engine);

    await controller.startTransfer('client-1', 'server-1', 'payload', { chunkDelay: 0 });
    controller.clear();

    const state = controller.getState();
    expect(state.transfers.size).toBe(0);
    expect(state.chunks.size).toBe(0);
    expect(state.reassembly.size).toBe(0);
    expect(state.selectedTransferId).toBeNull();
  });

  it('subscribe notifies on state change', async () => {
    const engine = makeEngine(singleRouterTopology());
    const controller = new DataTransferController(engine);
    const snapshots: DataTransferState[] = [];

    const unsubscribe = controller.subscribe((state) => {
      snapshots.push(state);
    });

    const transfer = await controller.startTransfer(
      'client-1',
      'server-1',
      'payload',
      { chunkDelay: 0 },
    );

    unsubscribe();

    expect(snapshots.length).toBeGreaterThan(0);
    expect(
      snapshots[snapshots.length - 1]?.transfers.get(transfer.messageId)?.status,
    ).toBe('delivered');
  });

  it('getChunks returns chunks in sequence order', async () => {
    const engine = makeEngine(singleRouterTopology());
    const controller = new DataTransferController(engine);

    const transfer = await controller.startTransfer(
      'client-1',
      'server-1',
      'c'.repeat(4200),
      { chunkSize: 1400, chunkDelay: 0 },
    );

    expect(controller.getChunks(transfer.messageId).map((chunk) => chunk.sequenceNumber)).toEqual([0, 1, 2]);
  });

  it('chunk traceId links to PacketTrace', async () => {
    const engine = makeEngine(multiHopTopology());
    const controller = new DataTransferController(engine);

    const transfer = await controller.startTransfer(
      'client-1',
      'server-1',
      'trace-check'.repeat(200),
      { chunkSize: 800, chunkDelay: 0 },
    );

    const traces = engine.getState().traces;

    for (const chunk of controller.getChunks(transfer.messageId)) {
      expect(chunk.traceId).toBeTruthy();
      expect(traces.some((trace) => trace.packetId === chunk.traceId)).toBe(true);
    }
  });

  it('per-hop shows MAC rewrite and TTL decrement', async () => {
    const engine = makeEngine(dataTransferDemoTopology());
    const controller = new DataTransferController(engine);

    const transfer = await controller.startTransfer(
      'server-a',
      'server-b',
      'hop-visualization',
      { chunkDelay: 0 },
    );

    const chunk = controller.getChunks(transfer.messageId)[0];
    const trace = engine.getState().traces.find((candidate) => candidate.packetId === chunk.traceId);

    expect(trace?.hops.map((hop) => hop.ttl)).toEqual([64, 64, 63, 62]);
    expect(trace?.hops.map((hop) => hop.srcIp)).toEqual([
      '10.0.1.10',
      '10.0.1.10',
      '10.0.1.10',
      '10.0.1.10',
    ]);
    expect(trace?.hops.map((hop) => hop.dstIp)).toEqual([
      '10.0.3.10',
      '10.0.3.10',
      '10.0.3.10',
      '10.0.3.10',
    ]);

    const createPacket = packetSnapshotAtTraceStep(engine, chunk.traceId!, 0);
    const firstRouterPacket = packetSnapshotAtTraceStep(engine, chunk.traceId!, 1);
    const secondRouterPacket = packetSnapshotAtTraceStep(engine, chunk.traceId!, 2);

    expect(createPacket.frame.srcMac).toBe('aa:bb:cc:00:01:10');
    expect(createPacket.frame.dstMac).toBe('aa:bb:cc:00:01:01');
    expect(firstRouterPacket.frame.srcMac).toBe('aa:bb:cc:00:02:01');
    expect(firstRouterPacket.frame.dstMac).toBe('aa:bb:cc:00:02:02');
    expect(secondRouterPacket.frame.srcMac).toBe('aa:bb:cc:00:03:01');
    expect(secondRouterPacket.frame.dstMac).toBe('aa:bb:cc:00:03:10');
  });

  it('changedFields includes MAC and TTL at router hops', async () => {
    const engine = makeEngine(dataTransferDemoTopology());
    const controller = new DataTransferController(engine);

    const transfer = await controller.startTransfer(
      'server-a',
      'server-b',
      'field-highlights',
      { chunkDelay: 0 },
    );

    const chunk = controller.getChunks(transfer.messageId)[0];
    const trace = engine.getState().traces.find((candidate) => candidate.packetId === chunk.traceId);

    expect(trace?.hops[1].changedFields).toEqual([
      'TTL',
      'Header Checksum',
      'Src MAC',
      'Dst MAC',
      'FCS',
    ]);
    expect(trace?.hops[2].changedFields).toEqual([
      'TTL',
      'Header Checksum',
      'Src MAC',
      'Dst MAC',
      'FCS',
    ]);
  });

  it('reassembly remains incomplete when a dropped chunk prevents checksum verification', async () => {
    const engine = makeEngine(dataTransferDemoTopology());
    const controller = new DataTransferController(engine);
    const downEdgeIds = new Set<string>();
    const failureState: FailureState = {
      downNodeIds: new Set(),
      downEdgeIds,
      downInterfaceIds: new Set(),
    };
    const originalSend = engine.send.bind(engine);
    let sendCount = 0;

    vi.spyOn(engine, 'send').mockImplementation(async (packet, state = failureState) => {
      sendCount += 1;
      await originalSend(packet, state);
      if (sendCount === 1) {
        downEdgeIds.add('e2');
      }
    });

    const transfer = await controller.startTransfer(
      'server-a',
      'server-b',
      'd'.repeat(4200),
      { chunkSize: 1400, chunkDelay: 0, failureState },
    );

    const reassembly = controller.getReassembly(transfer.messageId);

    expect(transfer.status).toBe('partial');
    expect(reassembly?.isComplete).toBe(false);
    expect(reassembly?.checksumVerified).toBeUndefined();
    expect(reassembly?.receivedChunks.size).toBe(1);
  });

  it('large payload with multiple chunks maintains correct sequence ordering', async () => {
    const engine = makeEngine(dataTransferDemoTopology());
    const controller = new DataTransferController(engine);

    const transfer = await controller.startTransfer(
      'server-a',
      'server-b',
      'sequence-'.repeat(600),
      { chunkSize: 256, chunkDelay: 0 },
    );

    const chunks = controller.getChunks(transfer.messageId);

    expect(chunks.map((chunk) => chunk.sequenceNumber)).toEqual(
      Array.from({ length: chunks.length }, (_, index) => index),
    );
    expect(chunks.every((chunk) => chunk.totalChunks === chunks.length)).toBe(true);
  });
});
