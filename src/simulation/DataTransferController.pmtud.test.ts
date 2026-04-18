import { describe, expect, it, vi } from 'vitest';
import type { InFlightPacket } from '../types/packets';
import { makeEngine } from './__fixtures__/helpers';
import { directTopology, singleRouterTopology } from './__fixtures__/topologies';
import { DataTransferController } from './DataTransferController';

const textEncoder = new TextEncoder();

function payloadBytes(packet: InFlightPacket): number {
  const payload = packet.frame.payload.payload;
  if (!('payload' in payload) || payload.payload.layer !== 'raw') {
    throw new Error('Expected TCP raw payload');
  }

  return textEncoder.encode(payload.payload.data).length;
}

describe('DataTransferController — PMTU-aware chunking', () => {
  it('uses DEFAULT_CHUNK_SIZE when pmtuLookup returns Infinity', async () => {
    const engine = makeEngine(singleRouterTopology());
    const controller = new DataTransferController(engine);
    const sentSizes: number[] = [];
    const packetHeaders: Array<{ dstIp: string; srcIp: string; seq: number }> = [];
    const originalSend = engine.send.bind(engine);

    vi.spyOn(engine, 'send').mockImplementation(async (packet, failureState) => {
      sentSizes.push(payloadBytes(packet));
      const transport = packet.frame.payload.payload;
      packetHeaders.push({
        srcIp: packet.frame.payload.srcIp,
        dstIp: packet.frame.payload.dstIp,
        seq: 'seq' in transport ? transport.seq : -1,
      });
      await originalSend(packet, failureState);
    });

    const transfer = await controller.startTransfer(
      'client-1',
      'server-1',
      'a'.repeat(3000),
      {
        chunkDelay: 0,
        pmtuLookup: () => Number.POSITIVE_INFINITY,
      },
    );

    expect(transfer.expectedChunks).toBe(3);
    expect(sentSizes).toEqual([1400, 1400, 200]);
  });

  it('clamps chunk size to (pathMtu - 40) when pathMtu is finite', async () => {
    const engine = makeEngine(singleRouterTopology());
    const controller = new DataTransferController(engine);
    const sentSizes: number[] = [];
    const originalSend = engine.send.bind(engine);

    vi.spyOn(engine, 'send').mockImplementation(async (packet, failureState) => {
      sentSizes.push(payloadBytes(packet));
      await originalSend(packet, failureState);
    });

    await controller.startTransfer(
      'client-1',
      'server-1',
      'b'.repeat(1400),
      {
        chunkDelay: 0,
        pmtuLookup: () => 600,
      },
    );

    expect(sentSizes[0]).toBe(560);
    expect(sentSizes.every((size) => size <= 560)).toBe(true);
  });

  it('re-evaluates chunk size between chunks when pmtuLookup reports a smaller pathMtu', async () => {
    const engine = makeEngine(singleRouterTopology());
    const controller = new DataTransferController(engine);
    const sentSizes: number[] = [];
    const originalSend = engine.send.bind(engine);
    let currentPmtu = Number.POSITIVE_INFINITY;

    vi.spyOn(engine, 'send').mockImplementation(async (packet, failureState) => {
      sentSizes.push(payloadBytes(packet));
      await originalSend(packet, failureState);

      if (sentSizes.length === 1) {
        currentPmtu = 600;
      }
    });

    await controller.startTransfer(
      'client-1',
      'server-1',
      'c'.repeat(3000),
      {
        chunkDelay: 0,
        pmtuLookup: () => currentPmtu,
      },
    );

    expect(sentSizes[0]).toBe(1400);
    expect(sentSizes[1]).toBe(560);
    expect(sentSizes.slice(1).every((size) => size <= 560)).toBe(true);
  });

  it('never sends a chunk larger than pmtuLookup reports at the moment of send', async () => {
    const engine = makeEngine(singleRouterTopology());
    const controller = new DataTransferController(engine);
    const observations: Array<{ currentPmtu: number; sizeBytes: number }> = [];
    const originalSend = engine.send.bind(engine);
    let currentPmtu = Number.POSITIVE_INFINITY;

    vi.spyOn(engine, 'send').mockImplementation(async (packet, failureState) => {
      observations.push({ currentPmtu, sizeBytes: payloadBytes(packet) });
      await originalSend(packet, failureState);

      if (observations.length === 1) {
        currentPmtu = 900;
      } else if (observations.length === 2) {
        currentPmtu = 600;
      }
    });

    await controller.startTransfer(
      'client-1',
      'server-1',
      'd'.repeat(5000),
      {
        chunkDelay: 0,
        pmtuLookup: () => currentPmtu,
      },
    );

    expect(observations.every(({ currentPmtu, sizeBytes }) => (
      !Number.isFinite(currentPmtu) || sizeBytes <= currentPmtu - 40
    ))).toBe(true);
  });

  it('handles pathMtu = 68 (minimum) without crashing', async () => {
    const engine = makeEngine(directTopology());
    const controller = new DataTransferController(engine);
    const sentSizes: number[] = [];
    const originalSend = engine.send.bind(engine);

    vi.spyOn(engine, 'send').mockImplementation(async (packet, failureState) => {
      sentSizes.push(payloadBytes(packet));
      await originalSend(packet, failureState);
    });

    const transfer = await controller.startTransfer(
      'client-1',
      'server-1',
      'e'.repeat(100),
      {
        chunkDelay: 0,
        pmtuLookup: () => 68,
      },
    );

    expect(transfer.status).toBe('delivered');
    expect(sentSizes.every((size) => size <= 28)).toBe(true);
  });
});

describe('DataTransferController — regression', () => {
  it('an existing 3000-byte transfer demo (no pmtuLookup) behaves byte-for-byte identically to pre-T04', async () => {
    const engine = makeEngine(singleRouterTopology());
    const controller = new DataTransferController(engine);

    const transfer = await controller.startTransfer(
      'client-1',
      'server-1',
      'f'.repeat(3000),
      { chunkDelay: 0 },
    );

    expect(transfer.expectedChunks).toBe(3);
    expect(controller.getChunks(transfer.messageId).map((chunk) => chunk.sizeBytes)).toEqual([1400, 1400, 200]);
  });
});
