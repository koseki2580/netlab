import type { NodeTypes } from '@xyflow/react';
import type { InFlightPacket } from './packets';
import type { RouteEntry } from './routing';
import type { Neighbor } from './simulation';
import type { NetworkTopology } from './topology';

export type LayerId = 'l1' | 'l2' | 'l3' | 'l4' | 'l7';

export interface ForwardContext {
  neighbors: Neighbor[];
}

export type ForwardDecision =
  | {
      action: 'forward';
      nextNodeId: string;
      edgeId: string;
      egressPort: string;
      ingressInterfaceId?: string;
      egressInterfaceId?: string;
      packet: InFlightPacket;
      selectedRoute?: RouteEntry;
    }
  | { action: 'deliver'; packet: InFlightPacket }
  | { action: 'drop'; reason: string };

export interface Forwarder {
  receive(
    packet: InFlightPacket,
    ingressPort: string,
    ctx: ForwardContext,
  ): Promise<ForwardDecision>;
}

export type ForwarderFactory = (
  nodeId: string,
  topology: NetworkTopology,
) => Forwarder;

export interface LayerPlugin {
  layerId: LayerId;
  nodeTypes: NodeTypes;
  deviceRoles?: string[];
  forwarder?: ForwarderFactory;
}
