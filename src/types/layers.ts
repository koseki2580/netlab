import type { NodeTypes } from '@xyflow/react';
import type { InFlightPacket } from './packets';
import type { RouteEntry } from './routing';
import type { NetworkTopology } from './topology';

export type LayerId = 'l1' | 'l2' | 'l3' | 'l4' | 'l7';

export type ForwardDecision =
  | { action: 'forward'; egressPort: string; packet: InFlightPacket; selectedRoute?: RouteEntry }
  | { action: 'deliver'; packet: InFlightPacket }
  | { action: 'drop'; reason: string };

export interface Forwarder {
  receive(packet: InFlightPacket, ingressPort: string): Promise<ForwardDecision>;
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
