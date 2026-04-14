import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  DataTransferState,
  ReassemblyState,
  TransferChunk,
  TransferMessage,
} from '../types/transfer';
import { DataTransferController, type DataTransferOptions } from './DataTransferController';
import { useSimulation } from './SimulationContext';

export interface DataTransferContextValue {
  controller: DataTransferController;
  state: DataTransferState;
  startTransfer: (
    srcNodeId: string,
    dstNodeId: string,
    payload: string,
    options?: DataTransferOptions,
  ) => Promise<TransferMessage>;
  getChunks: (messageId: string) => TransferChunk[];
  getReassembly: (messageId: string) => ReassemblyState | undefined;
  clear: () => void;
  selectedTransferId: string | null;
  selectTransfer: (messageId: string | null) => void;
}

export const DataTransferContext = createContext<DataTransferContextValue | null>(null);

export interface DataTransferProviderProps {
  children: ReactNode;
}

export function DataTransferProvider({ children }: DataTransferProviderProps) {
  const { engine } = useSimulation();
  const controller = useMemo(() => new DataTransferController(engine), [engine]);
  const [controllerState, setControllerState] = useState<DataTransferState>(() => controller.getState());
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const effectiveSelectedTransferId = selectedTransferId ?? controllerState.selectedTransferId;

  useEffect(() => {
    setControllerState(controller.getState());
    setSelectedTransferId(null);
    return controller.subscribe((state) => {
      setControllerState(state);
    });
  }, [controller]);

  useEffect(() => {
    if (!selectedTransferId) {
      return;
    }

    if (controllerState.transfers.has(selectedTransferId)) {
      return;
    }

    setSelectedTransferId(null);
  }, [controllerState, selectedTransferId]);

  const startTransfer = useCallback<DataTransferContextValue['startTransfer']>(
    async (srcNodeId, dstNodeId, payload, options) => {
      const transfer = await controller.startTransfer(srcNodeId, dstNodeId, payload, options);
      setSelectedTransferId(transfer.messageId);
      return transfer;
    },
    [controller],
  );

  const getChunks = useCallback<DataTransferContextValue['getChunks']>(
    (messageId) => controller.getChunks(messageId),
    [controller],
  );

  const getReassembly = useCallback<DataTransferContextValue['getReassembly']>(
    (messageId) => controller.getReassembly(messageId),
    [controller],
  );

  const clear = useCallback(() => {
    controller.clear();
    setSelectedTransferId(null);
  }, [controller]);

  const state = useMemo<DataTransferState>(
    () => ({
      ...controllerState,
      selectedTransferId: effectiveSelectedTransferId,
    }),
    [controllerState, effectiveSelectedTransferId],
  );

  const value = useMemo<DataTransferContextValue>(
    () => ({
      controller,
      state,
      startTransfer,
      getChunks,
      getReassembly,
      clear,
      selectedTransferId: effectiveSelectedTransferId,
      selectTransfer: setSelectedTransferId,
    }),
    [
      controller,
      state,
      startTransfer,
      getChunks,
      getReassembly,
      clear,
      effectiveSelectedTransferId,
    ],
  );

  return (
    <DataTransferContext.Provider value={value}>
      {children}
    </DataTransferContext.Provider>
  );
}

export function useDataTransfer(): DataTransferContextValue {
  const context = useContext(DataTransferContext);
  if (!context) {
    throw new Error('[netlab] useDataTransfer must be used within <DataTransferProvider>');
  }
  return context;
}

export function useOptionalDataTransfer(): DataTransferContextValue | null {
  return useContext(DataTransferContext);
}
