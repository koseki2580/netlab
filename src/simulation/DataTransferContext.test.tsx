/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationContext } from './SimulationContext';
import type { SimulationContextValue } from './SimulationContext';
import {
  DataTransferProvider,
  useDataTransfer,
  useOptionalDataTransfer,
  type DataTransferContextValue,
} from './DataTransferContext';
import type {
  DataTransferState,
  ReassemblyState,
  TransferChunk,
  TransferMessage,
} from '../types/transfer';

const controllerMocks = vi.hoisted(() => ({
  instances: [] as unknown[],
  nextId: 1,
}));

vi.mock('./DataTransferController', () => {
  function createState(): DataTransferState {
    return {
      transfers: new Map(),
      chunks: new Map(),
      reassembly: new Map(),
      selectedTransferId: null,
    };
  }

  function cloneChunks(chunks: TransferChunk[]) {
    return chunks.map((chunk) => ({ ...chunk }));
  }

  function cloneReassembly(reassembly: ReassemblyState): ReassemblyState {
    return {
      ...reassembly,
      receivedChunks: new Map(reassembly.receivedChunks),
    };
  }

  function cloneState(state: DataTransferState): DataTransferState {
    return {
      transfers: new Map(
        Array.from(state.transfers.entries(), ([messageId, transfer]) => [
          messageId,
          { ...transfer, sessionIds: transfer.sessionIds ? [...transfer.sessionIds] : undefined },
        ]),
      ),
      chunks: new Map(
        Array.from(state.chunks.entries(), ([messageId, chunks]) => [
          messageId,
          cloneChunks(chunks),
        ]),
      ),
      reassembly: new Map(
        Array.from(state.reassembly.entries(), ([messageId, reassembly]) => [
          messageId,
          cloneReassembly(reassembly),
        ]),
      ),
      selectedTransferId: state.selectedTransferId,
    };
  }

  class DataTransferController {
    state = createState();

    listeners = new Set<(state: DataTransferState) => void>();

    constructor(
      public engine: unknown,
      public sessionTracker?: unknown,
    ) {
      controllerMocks.instances.push(this);
    }

    getState(): DataTransferState {
      return cloneState(this.state);
    }

    async startTransfer(
      srcNodeId: string,
      dstNodeId: string,
      payload: string,
    ): Promise<TransferMessage> {
      const messageId = `transfer-${controllerMocks.nextId++}`;
      const message: TransferMessage = {
        messageId,
        srcNodeId,
        dstNodeId,
        protocol: 'raw',
        payloadPreview: payload,
        payloadData: payload,
        payloadSizeBytes: payload.length,
        checksum: 'checksum',
        expectedChunks: 1,
        status: 'delivered',
        createdAt: 1,
        completedAt: 2,
      };
      const chunk: TransferChunk = {
        chunkId: `${messageId}-chunk-0`,
        messageId,
        sequenceNumber: 0,
        totalChunks: 1,
        data: payload,
        sizeBytes: payload.length,
        state: 'delivered',
      };
      const reassembly: ReassemblyState = {
        messageId,
        receivedChunks: new Map([[0, chunk]]),
        expectedTotal: 1,
        isComplete: true,
        reassembledPayload: payload,
        reassembledChecksum: 'checksum',
        checksumVerified: true,
      };

      this.state.transfers.set(messageId, message);
      this.state.chunks.set(messageId, [chunk]);
      this.state.reassembly.set(messageId, reassembly);
      if (!this.state.selectedTransferId) {
        this.state.selectedTransferId = messageId;
      }
      this.notify();

      return { ...message };
    }

    getChunks(messageId: string): TransferChunk[] {
      return cloneChunks(this.state.chunks.get(messageId) ?? []);
    }

    getReassembly(messageId: string): ReassemblyState | undefined {
      const reassembly = this.state.reassembly.get(messageId);
      return reassembly ? cloneReassembly(reassembly) : undefined;
    }

    clear() {
      this.state = createState();
      this.notify();
    }

    subscribe(listener: (state: DataTransferState) => void) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    removeTransfer(messageId: string) {
      this.state.transfers.delete(messageId);
      this.state.chunks.delete(messageId);
      this.state.reassembly.delete(messageId);
      if (this.state.selectedTransferId === messageId) {
        this.state.selectedTransferId = null;
      }
      this.notify();
    }

    private notify() {
      const snapshot = this.getState();
      this.listeners.forEach((listener) => listener(snapshot));
    }
  }

  return { DataTransferController };
});

interface FakeDataTransferController {
  getState(): DataTransferState;
  removeTransfer(messageId: string): void;
}

const SIMULATION_VALUE: SimulationContextValue = {
  engine: { name: 'engine' } as never,
  state: {
    status: 'idle',
    traces: [],
    currentTraceId: null,
    currentStep: -1,
    activeEdgeIds: [],
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
  },
  sendPacket: async () => {},
  simulateDhcp: async () => false,
  simulateDns: async () => null,
  getDhcpLeaseState: () => null,
  getDnsCache: () => null,
  exportPcap: () => new Uint8Array(),
  animationSpeed: 500,
  setAnimationSpeed: () => {},
  isRecomputing: false,
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latestDataTransfer: DataTransferContextValue | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function CaptureDataTransfer() {
  latestDataTransfer = useDataTransfer();
  return null;
}

function OptionalOutsideConsumer() {
  return <div>{String(useOptionalDataTransfer() === null)}</div>;
}

function RequiredOutsideConsumer() {
  useDataTransfer();
  return null;
}

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(ui);
  });
}

function renderProvider() {
  render(
    <SimulationContext.Provider value={SIMULATION_VALUE}>
      <DataTransferProvider>
        <CaptureDataTransfer />
      </DataTransferProvider>
    </SimulationContext.Provider>,
  );
}

function currentDataTransfer() {
  if (!latestDataTransfer) {
    throw new Error('DataTransfer context was not captured');
  }

  return latestDataTransfer;
}

function currentController() {
  return currentDataTransfer().controller as unknown as FakeDataTransferController;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  latestDataTransfer = null;
  controllerMocks.instances.length = 0;
  controllerMocks.nextId = 1;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  latestDataTransfer = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  vi.restoreAllMocks();
});

describe('DataTransferProvider', () => {
  describe('transfer lifecycle', () => {
    it('starts with empty state and null selection', () => {
      renderProvider();

      expect(currentDataTransfer().state.transfers.size).toBe(0);
      expect(currentDataTransfer().selectedTransferId).toBeNull();
      expect(currentDataTransfer().state.selectedTransferId).toBeNull();
    });

    it('startTransfer creates transfer and auto-selects it', async () => {
      renderProvider();
      let transfer: TransferMessage | undefined;

      await act(async () => {
        transfer = await currentDataTransfer().startTransfer('client-1', 'server-1', 'payload');
      });

      expect(transfer?.messageId).toBe('transfer-1');
      expect(currentDataTransfer().state.transfers.get('transfer-1')).toMatchObject({
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
      });
      expect(currentDataTransfer().selectedTransferId).toBe('transfer-1');
      expect(currentDataTransfer().state.selectedTransferId).toBe('transfer-1');
    });

    it('clear removes all transfers and resets selection', async () => {
      renderProvider();

      await act(async () => {
        await currentDataTransfer().startTransfer('client-1', 'server-1', 'payload');
      });

      act(() => {
        currentDataTransfer().clear();
      });

      expect(currentDataTransfer().state.transfers.size).toBe(0);
      expect(currentDataTransfer().selectedTransferId).toBeNull();
      expect(currentDataTransfer().state.selectedTransferId).toBeNull();
    });
  });

  describe('selectTransfer', () => {
    it('selects a transfer by messageId', async () => {
      renderProvider();
      let first: TransferMessage | undefined;
      let second: TransferMessage | undefined;

      await act(async () => {
        first = await currentDataTransfer().startTransfer('client-1', 'server-1', 'one');
        second = await currentDataTransfer().startTransfer('client-1', 'server-1', 'two');
      });

      act(() => {
        currentDataTransfer().selectTransfer(first!.messageId);
      });

      expect(second?.messageId).toBe('transfer-2');
      expect(currentDataTransfer().selectedTransferId).toBe(first?.messageId);
      expect(currentDataTransfer().state.selectedTransferId).toBe(first?.messageId);
    });

    it('falls back to controller selection when selectTransfer(null) is called', async () => {
      renderProvider();
      let first: TransferMessage | undefined;

      await act(async () => {
        first = await currentDataTransfer().startTransfer('client-1', 'server-1', 'one');
      });

      act(() => {
        currentDataTransfer().selectTransfer(null);
      });

      expect(currentDataTransfer().selectedTransferId).toBe(first?.messageId);
      expect(currentDataTransfer().state.selectedTransferId).toBe(first?.messageId);
    });

    it('clears selection when selected transfer no longer exists in state', async () => {
      renderProvider();
      let transfer: TransferMessage | undefined;

      await act(async () => {
        transfer = await currentDataTransfer().startTransfer('client-1', 'server-1', 'one');
      });

      act(() => {
        currentDataTransfer().selectTransfer(transfer!.messageId);
      });

      act(() => {
        currentController().removeTransfer(transfer!.messageId);
      });

      expect(currentDataTransfer().selectedTransferId).toBeNull();
      expect(currentDataTransfer().state.selectedTransferId).toBeNull();
    });
  });

  describe('getChunks / getReassembly', () => {
    it('delegates getChunks to controller', async () => {
      renderProvider();
      let transfer: TransferMessage | undefined;

      await act(async () => {
        transfer = await currentDataTransfer().startTransfer('client-1', 'server-1', 'payload');
      });

      expect(currentDataTransfer().getChunks(transfer!.messageId)).toEqual([
        expect.objectContaining({
          messageId: transfer?.messageId,
          sequenceNumber: 0,
        }),
      ]);
    });

    it('delegates getReassembly to controller', async () => {
      renderProvider();
      let transfer: TransferMessage | undefined;

      await act(async () => {
        transfer = await currentDataTransfer().startTransfer('client-1', 'server-1', 'payload');
      });

      expect(currentDataTransfer().getReassembly(transfer!.messageId)).toMatchObject({
        messageId: transfer?.messageId,
        isComplete: true,
        checksumVerified: true,
      });
    });
  });

  describe('useDataTransfer', () => {
    it('throws when used outside DataTransferProvider', () => {
      expect(() => renderToStaticMarkup(<RequiredOutsideConsumer />)).toThrow(
        '[netlab] useDataTransfer must be used within <DataTransferProvider>',
      );
    });
  });

  describe('useOptionalDataTransfer', () => {
    it('returns null outside DataTransferProvider', () => {
      expect(renderToStaticMarkup(<OptionalOutsideConsumer />)).toContain('true');
    });
  });
});
