export type DeliveryStatus =
  | 'pending'
  | 'in-progress'
  | 'delivered'
  | 'partial'
  | 'failed';

export interface TransferMessage {
  messageId: string;
  srcNodeId: string;
  dstNodeId: string;
  protocol: string;
  payloadPreview: string;
  payloadData: string;
  payloadSizeBytes: number;
  checksum: string;
  expectedChunks: number;
  status: DeliveryStatus;
  createdAt: number;
  completedAt?: number;
}

export type ChunkDeliveryState =
  | 'pending'
  | 'in-flight'
  | 'delivered'
  | 'dropped';

export interface TransferChunk {
  chunkId: string;
  messageId: string;
  sequenceNumber: number;
  totalChunks: number;
  data: string;
  sizeBytes: number;
  state: ChunkDeliveryState;
  traceId?: string;
}

export interface ReassemblyState {
  messageId: string;
  receivedChunks: Map<number, TransferChunk>;
  expectedTotal: number;
  isComplete: boolean;
  reassembledPayload?: string;
  reassembledChecksum?: string;
  checksumVerified?: boolean;
}

export interface DataTransferState {
  transfers: Map<string, TransferMessage>;
  chunks: Map<string, TransferChunk[]>;
  reassembly: Map<string, ReassemblyState>;
  selectedTransferId: string | null;
}
