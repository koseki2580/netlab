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

export type SessionMode = 'legacy' | 'http';

export type HttpSessionPhase = 'tcp-open' | 'http-request' | 'http-response' | 'tcp-close';

export interface HttpPhases {
  tcpOpen?: PacketTrace;
  httpRequest?: PacketTrace;
  httpResponse?: PacketTrace;
  tcpClose?: PacketTrace;
}

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
  transferId?: string;
  httpPhases?: HttpPhases;
  httpMeta?: {
    method?: string;
    path?: string;
    statusCode?: number;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    requestBody?: string;
    responseBody?: string;
  };
}
