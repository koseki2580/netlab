import type { GraphNodeTypes as NodeTypes } from './graph';
import type { InFlightPacket } from './packets';
import type { RouteEntry } from './routing';
import type { Neighbor } from './simulation';
import type { NetworkTopology } from './topology';

import type { MulticastTable } from '../layers/l2-datalink/MulticastTable';

export type LayerId = 'l1' | 'l2' | 'l3' | 'l4' | 'l7';

export interface ForwardContext {
  neighbors: Neighbor[];
  multicastTable?: MulticastTable;
  /**
   * What this switch has learned: the port each source MAC was last seen on,
   * keyed by `${vlanId}:${mac}`. It lives as long as the engine keeps what
   * devices learn (see the `arpCache` option), so a forwarder writes to it.
   */
  macTable?: Map<string, string>;
  /**
   * The link the frame came in by. A switch uses it to tell which port the
   * frame arrived on when that link names no port at the switch.
   */
  ingressEdgeId?: string;
}

/** One copy of a frame a forwarder sends out of a port. */
export interface FloodTarget {
  nextNodeId: string;
  edgeId: string;
  egressPort: string;
  /** The frame as it leaves that port (a trunk may tag it). */
  packet: InFlightPacket;
}

export type ForwardDecision =
  | {
      action: 'forward';
      nextNodeId: string;
      edgeId: string;
      egressPort: string;
      ingressInterfaceId?: string;
      egressInterfaceId?: string;
      /**
       * The address the frame goes to next: the route's next hop, or the
       * destination itself on a connected network. The rest of the hop (ARP,
       * the frame's MACs) uses this rather than looking the route up again.
       */
      nextHopIp?: string;
      packet: InFlightPacket;
      selectedRoute?: RouteEntry;
      ecmpTrace?: import('./simulation').EcmpTrace;
    }
  | {
      /**
       * The frame is copied out of several ports, as a switch does with a
       * broadcast or a MAC it has not learned. `forward` is the copy that goes
       * on toward the destination, when one port leads there; the trace
       * follows it and lists the others. Without it, the frame ends here.
       */
      action: 'flood';
      forward?: FloodTarget;
      copies: readonly FloodTarget[];
      packet: InFlightPacket;
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

export type ForwarderFactory = (nodeId: string, topology: NetworkTopology) => Forwarder;

export interface LayerPlugin {
  layerId: LayerId;
  nodeTypes: NodeTypes;
  deviceRoles?: string[];
  forwarder?: ForwarderFactory;
}
