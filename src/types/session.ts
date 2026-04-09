import type { PacketTrace } from './simulation';

export type SessionPhase =
  | 'request:initiated'
  | 'request:routing'
  | 'request:delivered'
  | 'response:generated'
  | 'response:routing'
  | 'response:delivered'
  | 'drop';

export type SessionStatus = 'pending' | 'success' | 'failed';

export interface SessionEvent {
  phase: SessionPhase;
  timestamp: number;
  seq: number;
  nodeId?: string;
  meta?: Record<string, unknown>;
}

export interface NetworkSession {
  sessionId: string;
  srcNodeId: string;
  dstNodeId: string;
  protocol?: string;
  requestType?: string;
  status: SessionStatus;
  createdAt: number;
  completedAt?: number;
  requestTrace?: PacketTrace;
  responseTrace?: PacketTrace;
  events: SessionEvent[];
  error?: {
    reason: string;
    nodeId: string;
  };
}
