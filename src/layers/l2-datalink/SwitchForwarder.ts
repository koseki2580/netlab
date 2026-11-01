import type { FloodTarget, ForwardContext, ForwardDecision, Forwarder } from '../../types/layers';
import { IGMP_PROTOCOL, isLinkLocalMulticast } from '../../types/multicast';
import type { IgmpMessage, InFlightPacket } from '../../types/packets';
import type { NetlabEdge, NetworkTopology, SwitchPort } from '../../types/topology';
import { getRequired } from '../../utils';
import { addressViewOf } from '../../simulation/addressView';
import { reachesFrom } from '../reachability';
import { ipToMulticastMac, isMulticastMac } from '../../utils/multicastMac';
import { MulticastTable } from './MulticastTable';
import { isVlanAllowedOnPort, prepareEgressFrame, resolveIngressVlan } from './vlan';

const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';
const BROADCAST_IP = '255.255.255.255';

export class SwitchForwarder implements Forwarder {
  private macTable = new Map<string, string>(); // MAC → portId
  private readonly multicastTable = new MulticastTable();
  private readonly nodeId: string;
  private readonly topology: NetworkTopology;

  constructor(nodeId: string, topology: NetworkTopology) {
    this.nodeId = nodeId;
    this.topology = topology;
  }

  getMacTable(): ReadonlyMap<string, string> {
    return this.macTable;
  }

  getMulticastTable(): MulticastTable {
    return this.multicastTable;
  }

  private macKey(vlanId: number, mac: string): string {
    return `${vlanId}:${mac}`;
  }

  private resolvePortConfig(ports: SwitchPort[], portId: string): SwitchPort {
    return (
      ports.find((port) => port.id === portId) ?? {
        id: portId,
        name: portId,
        macAddress: '',
      }
    );
  }

  learn(srcMac: string, ingressPortId: string, vlanId: number): void {
    this.macTable.set(this.macKey(vlanId, srcMac), ingressPortId);
  }

  /** The port a link names at this switch, if it names one. */
  private handleAt(edge: NetlabEdge): string | undefined {
    if (edge.source === this.nodeId) return edge.sourceHandle || undefined;
    if (edge.target === this.nodeId) return edge.targetHandle || undefined;
    return undefined;
  }

  private touches(edge: NetlabEdge): boolean {
    return edge.source === this.nodeId || edge.target === this.nodeId;
  }

  /** A link that names no port here is a port of its own, by the link's id. */
  private portOfEdge(edge: NetlabEdge): string {
    return this.handleAt(edge) ?? edge.id;
  }

  /** The configured ports, then one untagged VLAN 1 port per link that names none. */
  private allPorts(ports: SwitchPort[]): SwitchPort[] {
    return [
      ...ports,
      ...this.topology.edges
        .filter((edge) => this.touches(edge) && !this.handleAt(edge))
        .map((edge): SwitchPort => ({ id: edge.id, name: edge.id, macAddress: '' })),
    ];
  }

  private resolveConnectedEdgeForPort(portId: string) {
    return (
      this.topology.edges.find(
        (edge) =>
          this.touches(edge) &&
          (this.handleAt(edge) === portId ||
            (edge.id === portId && this.handleAt(edge) === undefined)),
      ) ?? null
    );
  }

  private resolvePortForEdge(edgeId: string): string | undefined {
    const edge = this.topology.edges.find((candidate) => candidate.id === edgeId);
    return edge ? this.handleAt(edge) : undefined;
  }

  private isPortForwarding(portId: string): boolean {
    const state = this.topology.stpStates?.get(`${this.nodeId}:${portId}`)?.state;
    return state === undefined || state === 'FORWARDING';
  }

  /**
   * Whether the link to a neighbour may carry this frame. Spanning tree blocks
   * a segment by putting one of its two ports out of forwarding, and either
   * end is enough: checking only this switch's end sent frames across a link
   * whose far end was the blocked one, where they were dropped on arrival.
   */
  private isLinkUsable(edgeId: string): boolean {
    const edge = this.topology.edges.find((candidate) => candidate.id === edgeId);
    if (!edge) return true;
    return !this.isEdgeBlocked(edge);
  }

  private selectNeighbor(
    packet: InFlightPacket,
    neighbors: ForwardContext['neighbors'],
    anyway: boolean,
  ) {
    const dstMac = packet.frame.dstMac.toLowerCase();
    const dstIp = packet.frame.payload.dstIp === BROADCAST_IP ? null : packet.frame.payload.dstIp;

    for (const neighbor of neighbors) {
      if (!this.isLinkUsable(neighbor.edgeId)) continue;
      const node = this.topology.nodes.find((candidate) => candidate.id === neighbor.nodeId);
      if (!node) continue;
      const neighborMacs = [
        typeof node.data.mac === 'string' ? node.data.mac : null,
        ...(node.data.interfaces ?? []).map((iface) => iface.macAddress),
      ]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.toLowerCase());
      if (neighborMacs.includes(dstMac)) {
        return neighbor;
      }
    }

    const addresses = addressViewOf(this.topology);
    for (const neighbor of neighbors) {
      if (!this.isLinkUsable(neighbor.edgeId)) continue;
      const node = this.topology.nodes.find((candidate) => candidate.id === neighbor.nodeId);
      if (!node) continue;
      if (packet.dstNodeId && node.id === packet.dstNodeId) return neighbor;
      if (dstIp && addresses.ownsIp(node, dstIp)) return neighbor;
    }

    // Nothing here is the destination, so the frame has to be sent on. A real
    // switch floods and every branch is walked; a trace follows one, and which
    // one decides whether the lesson shows an arrival or a dead end. Prefer a
    // neighbour the destination is actually behind: without this, the frame
    // went to whichever neighbour was listed first, which in a triangle of
    // switches is a leaf host that discards it — the spanning-tree lesson's
    // detour stopped one hop short of the host it was addressed to.
    const destinationId = packet.dstNodeId;
    if (destinationId) {
      for (const neighbor of neighbors) {
        if (!this.isLinkUsable(neighbor.edgeId)) continue;
        if (this.leadsTo(neighbor.nodeId, destinationId)) return neighbor;
      }
    }

    // Only multicast still goes on to any neighbour when none is the way; a
    // broadcast or an unlearned MAC is copied out of every port instead.
    if (anyway) {
      for (const neighbor of neighbors) {
        if (this.isLinkUsable(neighbor.edgeId)) return neighbor;
      }
    }

    return null;
  }

  /**
   * Whether `destinationId` can be reached from `startId` without coming back
   * through this switch, following only links the spanning tree left
   * forwarding. Ignoring the tree is not good enough: in a triangle every leg
   * "reaches" every host if you are willing to cross a blocked one, so the
   * A → C ping went the long way round and died on the blocked segment.
   */
  private leadsTo(startId: string, destinationId: string): boolean {
    return reachesFrom(
      this.topology,
      this.nodeId,
      startId,
      (nodeId) => nodeId === destinationId,
      (edge) => !this.isEdgeBlocked(edge),
    );
  }

  /** Whether either end of `edge` has been put out of forwarding by STP. */
  private isEdgeBlocked(edge: NetlabEdge): boolean {
    const states = this.topology.stpStates;
    if (!states) return false;
    const ends: [string, string | undefined][] = [
      [edge.source, edge.sourceHandle ?? undefined],
      [edge.target, edge.targetHandle ?? undefined],
    ];
    return ends.some(([nodeId, portId]) => {
      if (portId === undefined) return false;
      const state = states.get(`${nodeId}:${portId}`)?.state;
      return state !== undefined && state !== 'FORWARDING';
    });
  }

  forward(
    dstMac: string,
    ingressPortId: string,
    ports: SwitchPort[],
    vlanId: number,
    dstIp?: string,
    externalMulticastTable?: MulticastTable,
  ): string[] {
    const eligiblePortIds = ports
      .filter((port) => port.id !== ingressPortId)
      .filter((port) => this.isPortForwarding(port.id))
      .filter((port) => isVlanAllowedOnPort(port, vlanId))
      .map((port) => port.id);

    if (dstMac === BROADCAST_MAC) {
      return eligiblePortIds;
    }

    // Multicast branch: consult MulticastTable (persistent table takes priority)
    if (isMulticastMac(dstMac)) {
      const table = externalMulticastTable ?? this.multicastTable;
      // Link-local (224.0.0.0/24) is always flooded
      if (dstIp && isLinkLocalMulticast(dstIp)) {
        return eligiblePortIds;
      }
      if (table.hasLearnedGroup(vlanId, dstMac)) {
        const joinedPorts = table.getJoinedPorts(vlanId, dstMac);
        return eligiblePortIds.filter((portId) => joinedPorts.has(portId));
      }
      // Unlearned group → flood within VLAN
      return eligiblePortIds;
    }

    const known = this.macTable.get(this.macKey(vlanId, dstMac));
    if (known) {
      return eligiblePortIds.includes(known) ? [known] : eligiblePortIds;
    }
    // Unknown unicast: flood
    return eligiblePortIds;
  }

  async receive(
    packet: InFlightPacket,
    givenIngressPortId: string,
    ctx: ForwardContext,
  ): Promise<ForwardDecision> {
    const node = this.topology.nodes.find((n) => n.id === this.nodeId);
    if (!node) {
      return { action: 'drop', reason: `switch node ${this.nodeId} not found` };
    }
    // The link the frame came in by says which port that was, named or not.
    const arrivedBy = ctx.ingressEdgeId
      ? this.topology.edges.find((edge) => edge.id === ctx.ingressEdgeId && this.touches(edge))
      : undefined;
    const ingressPortId = arrivedBy ? this.portOfEdge(arrivedBy) : givenIngressPortId;

    if (!this.isPortForwarding(ingressPortId)) {
      return { action: 'drop', reason: 'stp-port-blocked' };
    }

    const frame = packet.frame;
    const ports = this.allPorts((node.data.ports ?? []) as SwitchPort[]);
    const ingressPort = this.resolvePortConfig(ports, ingressPortId);
    const vlanId = resolveIngressVlan(ingressPort, frame);

    if (vlanId === null) {
      return { action: 'drop', reason: 'vlan-ingress-violation' };
    }

    // The engine's table, so what is learned outlives this hop.
    if (ctx.macTable) this.macTable = ctx.macTable;
    // A link the frame may leave by: up (the neighbours the engine gives leave
    // out failed links; none given means every link) and not blocked.
    // The link the frame came in on is up too, though not among the neighbours.
    const ingressEdge = arrivedBy?.id ?? this.resolveConnectedEdgeForPort(ingressPortId)?.id;
    const open = (edgeId: string) =>
      (ctx.neighbors.length === 0 ||
        edgeId === ingressEdge ||
        ctx.neighbors.some((n) => n.edgeId === edgeId)) &&
      this.isLinkUsable(edgeId);
    this.learn(frame.srcMac, ingressPortId, vlanId);
    const far = (edge: NetlabEdge) => (edge.source === this.nodeId ? edge.target : edge.source);
    // The frame as it leaves by `portId` (a trunk may tag it).
    const out = (portId: string, edgeId: string, nextNodeId: string): FloodTarget => ({
      nextNodeId,
      edgeId,
      egressPort: portId,
      packet: {
        ...packet,
        egressPortId: portId,
        vlanId,
        frame: prepareEgressFrame(frame, this.resolvePortConfig(ports, portId), vlanId),
      },
    });

    // IGMP snooping: learn from transit IGMP Reports and Leaves
    const isIgmpControl = this.snoopIgmp(frame, ingressPortId, vlanId);

    // IGMP control messages are always flooded (snooping is transparent)
    const effectiveDstMac = isIgmpControl ? BROADCAST_MAC : frame.dstMac;
    const egressPorts = this.forward(
      effectiveDstMac,
      ingressPortId,
      ports,
      vlanId,
      frame.payload.dstIp,
      ctx.multicastTable,
    );

    if (egressPorts.length === 0) {
      return { action: 'drop', reason: 'no-egress-in-vlan' };
    }

    const learnedPort = this.macTable.get(this.macKey(vlanId, frame.dstMac));
    if (learnedPort && this.isPortForwarding(learnedPort)) {
      const learnedEdge = this.resolveConnectedEdgeForPort(learnedPort);
      // Not over a link that has since gone down or been blocked.
      if (learnedEdge && open(learnedEdge.id)) {
        return { action: 'forward', ...out(learnedPort, learnedEdge.id, far(learnedEdge)) };
      }
    }

    // Multicast, IGMP snooping included, keeps its own rules.
    const multicast =
      isIgmpControl || (frame.dstMac !== BROADCAST_MAC && isMulticastMac(frame.dstMac));
    // With no neighbours given, every link but the one the frame came in on.
    const neighbors =
      ctx.neighbors.length > 0
        ? ctx.neighbors
        : this.topology.edges.flatMap((edge) =>
            edge.id === ingressEdge || !this.touches(edge)
              ? []
              : [{ nodeId: far(edge), edgeId: edge.id }],
          );
    const selectedNeighbor = this.selectNeighbor(packet, neighbors, multicast);
    // A broadcast, or a MAC this switch has not learned: a copy goes out of
    // every port that may carry it. The one toward the destination goes on.
    // With no port to copy out of, nothing is copied and it goes as it always has.
    const targets = multicast
      ? []
      : egressPorts.flatMap((portId): FloodTarget[] => {
          const edge = this.resolveConnectedEdgeForPort(portId);
          return edge && open(edge.id) ? [out(portId, edge.id, far(edge))] : [];
        });
    if (targets.length > 0) {
      const forward = targets.find((target) => target.edgeId === selectedNeighbor?.edgeId);
      if (selectedNeighbor && !forward) {
        return { action: 'drop', reason: 'no-egress-in-vlan' };
      }
      const copies = targets.filter((target) => target !== forward);
      if (forward && copies.length === 0) {
        return { action: 'forward', ...forward };
      }
      return {
        action: 'flood',
        ...(forward ? { forward } : {}),
        copies,
        packet: forward?.packet ?? packet,
      };
    }
    if (selectedNeighbor) {
      const resolvedEgressPortId = this.resolvePortForEdge(selectedNeighbor.edgeId);
      const egressPortId = resolvedEgressPortId ?? egressPorts[0];
      if (!egressPortId || !egressPorts.includes(egressPortId)) {
        return { action: 'drop', reason: 'no-egress-in-vlan' };
      }
      return {
        action: 'forward',
        ...out(egressPortId, selectedNeighbor.edgeId, selectedNeighbor.nodeId),
      };
    }

    const fallbackEgressPortId = getRequired(egressPorts, 0, {
      nodeId: this.nodeId,
      reason: 'switch fallback egress port missing',
    });
    const connectedEdge = this.resolveConnectedEdgeForPort(fallbackEgressPortId);

    if (connectedEdge) {
      return {
        action: 'forward',
        ...out(fallbackEgressPortId, connectedEdge.id, far(connectedEdge)),
      };
    }

    return {
      action: 'drop',
      reason: `no edge connected to port ${fallbackEgressPortId}`,
    };
  }

  /** Snoop on IGMP Reports and Leaves. Returns true if the frame is an IGMP control message. */
  private snoopIgmp(
    frame: InFlightPacket['frame'],
    ingressPortId: string,
    vlanId: number,
  ): boolean {
    const ip = frame.payload;
    if (ip.protocol !== IGMP_PROTOCOL) return false;
    const payload = ip.payload;
    if (!('igmpType' in payload)) return false;
    const igmp = payload as IgmpMessage;
    const groupMac = ipToMulticastMac(
      igmp.groupAddress === '0.0.0.0' ? '224.0.0.1' : igmp.groupAddress,
    );

    if (igmp.igmpType === 'v2-membership-report') {
      this.multicastTable.addMembership(vlanId, groupMac, ingressPortId);
    } else if (igmp.igmpType === 'v2-leave-group') {
      this.multicastTable.removeMembership(vlanId, groupMac, ingressPortId);
    }
    return true;
  }
}
