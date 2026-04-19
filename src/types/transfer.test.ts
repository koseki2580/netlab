import { describe, expect, it } from 'vitest';
import type {
  ChunkDeliveryState,
  DataTransferState,
  DeliveryStatus,
  TransferChunk,
  TransferMessage,
} from './transfer';

describe('DeliveryStatus values', () => {
  it('covers all 5 statuses', () => {
    const statuses: DeliveryStatus[] = ['pending', 'in-progress', 'delivered', 'partial', 'failed'];
    expect(statuses).toHaveLength(5);
  });
});

describe('ChunkDeliveryState values', () => {
  it('covers all 4 states', () => {
    const states: ChunkDeliveryState[] = ['pending', 'in-flight', 'delivered', 'dropped'];
    expect(states).toHaveLength(4);
  });
});

describe('TransferMessage shape', () => {
  it('requires all core fields', () => {
    const msg: TransferMessage = {
      messageId: 'msg-1',
      srcNodeId: 'a',
      dstNodeId: 'b',
      protocol: 'tcp',
      payloadPreview: 'Hello...',
      payloadData: 'Hello World!',
      payloadSizeBytes: 12,
      checksum: 'abc123',
      expectedChunks: 1,
      status: 'pending',
      createdAt: Date.now(),
    };
    expect(msg.status).toBe('pending');
    expect(msg.completedAt).toBeUndefined();
  });
});

describe('TransferChunk shape', () => {
  it('has sequence and total info', () => {
    const chunk: TransferChunk = {
      chunkId: 'c-1',
      messageId: 'msg-1',
      sequenceNumber: 0,
      totalChunks: 3,
      data: 'part-1',
      sizeBytes: 6,
      state: 'pending',
    };
    expect(chunk.sequenceNumber).toBe(0);
    expect(chunk.totalChunks).toBe(3);
  });
});

describe('DataTransferState shape', () => {
  it('uses Maps for indexed access', () => {
    const state: DataTransferState = {
      transfers: new Map(),
      chunks: new Map(),
      reassembly: new Map(),
      selectedTransferId: null,
    };
    expect(state.transfers.size).toBe(0);
    expect(state.selectedTransferId).toBeNull();
  });
});
