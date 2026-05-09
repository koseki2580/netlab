import type { EditSession } from '../../sandbox/EditSession';
import type { Scenario } from '../../scenarios/types';
import type { MainThreadEngine } from '../../simulation/worker/MainThreadEngine';
import type { NetworkTopology } from '../../types/topology';

export type Assertion =
  | {
      readonly kind: 'packet-reaches';
      readonly source: string;
      readonly destination: string;
      readonly within: number;
    }
  | {
      readonly kind: 'packet-fails';
      readonly source: string;
      readonly destination: string;
      readonly reason: 'ttl' | 'no-route' | 'mtu' | 'filtered';
    }
  | { readonly kind: 'arp-cache-contains'; readonly nodeId: string; readonly ip: string }
  | {
      readonly kind: 'route-table-contains';
      readonly nodeId: string;
      readonly destination: string;
      readonly nextHop: string;
    }
  | { readonly kind: 'fragmentation-occurs'; readonly atNodeId: string }
  | { readonly kind: 'tcp-established'; readonly client: string; readonly server: string }
  | { readonly kind: 'ospf-converged'; readonly withinSteps: number }
  | { readonly kind: 'rubric-passes'; readonly rubricId: string };

export interface AssertionResult {
  readonly pass: boolean;
  readonly description: string;
  readonly message?: string;
  readonly diagnostics?: Readonly<Record<string, unknown>>;
}

export interface AssertionContext {
  readonly scenario: Scenario;
  readonly session: EditSession;
  readonly topology: NetworkTopology;
  readonly engine: MainThreadEngine;
}
