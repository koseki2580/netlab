import type { InFlightPacket } from './packets';
import type { ForwardDecision } from './layers';
import type { RouteEntry } from './routing';
import type { Edit } from '../sandbox/edits';
import type { SandboxMode } from '../sandbox/types';

export type HookFn<T> = (ctx: T, next: () => Promise<void>) => Promise<void>;

export interface HookMap {
  'packet:create': HookFn<{
    packet: InFlightPacket;
    sourceNodeId: string;
  }>;
  'packet:forward': HookFn<{
    packet: InFlightPacket;
    fromNodeId: string;
    toNodeId: string;
    decision: ForwardDecision;
  }>;
  'packet:deliver': HookFn<{
    packet: InFlightPacket;
    destinationNodeId: string;
  }>;
  'packet:drop': HookFn<{
    packet: InFlightPacket;
    nodeId: string;
    reason: string;
  }>;
  'switch:learn': HookFn<{
    nodeId: string;
    mac: string;
    port: string;
  }>;
  'router:lookup': HookFn<{
    nodeId: string;
    destination: string;
    resolvedRoute: RouteEntry | null;
  }>;
  'fetch:intercept': HookFn<{
    request: Request;
    nodeId: string;
    sessionId?: string;
  }>;
  'fetch:respond': HookFn<{
    request: Request;
    response: Response;
    nodeId: string;
    sessionId?: string;
  }>;
  'sandbox:edit-rejected': HookFn<{
    edit: unknown;
    reason: 'unknown-kind' | 'not-paused' | 'validation-failed';
  }>;
  'sandbox:edit-applied': HookFn<{
    edit: Edit;
  }>;
  'sandbox:mode-changed': HookFn<{
    mode: SandboxMode;
  }>;
  'sandbox:panel-tab-opened': HookFn<{
    axis: 'packet' | 'node' | 'parameters' | 'traffic';
  }>;
}

export type HookPoint = keyof HookMap;
