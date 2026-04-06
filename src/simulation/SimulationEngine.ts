import { layerRegistry } from '../registry/LayerRegistry';
import { isInSubnet, prefixLength } from '../utils/cidr';
import type { HookEngine } from '../hooks/HookEngine';
import type { NetworkTopology } from '../types/topology';
import type { InFlightPacket } from '../types/packets';
import type { RouteEntry } from '../types/routing';
import type { PacketHop, PacketTrace, SimulationState, RoutingDecision, RoutingCandidate } from '../types/simulation';
import { type FailureState, EMPTY_FAILURE_STATE } from '../types/failure';

const MAX_HOPS = 64;
const DEFAULT_PLAY_INTERVAL_MS = 500;

function protocolName(num: number): string {
  if (num === 1) return 'ICMP';
  if (num === 6) return 'TCP';
  if (num === 17) return 'UDP';
  return String(num);
}

function buildRoutingDecision(dstIp: string, routes: RouteEntry[]): RoutingDecision {
  const sorted = [...routes].sort(
    (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
  );
  let winnerRoute: RouteEntry | null = null;
  const candidates: RoutingCandidate[] = sorted.map((r) => {
    const matched = isInSubnet(dstIp, r.destination);
    if (matched && winnerRoute === null) winnerRoute = r;
    return {
      destination: r.destination,
      nextHop: r.nextHop,
      metric: r.metric,
      protocol: r.protocol,
      adminDistance: r.adminDistance,
      matched,
      selectedByLpm: false,
    };
  });
  if (winnerRoute !== null) {
    const idx = candidates.findIndex(
      (c) =>
        c.destination === (winnerRoute as RouteEntry).destination &&
        c.nextHop === (winnerRoute as RouteEntry).nextHop,
    );
    if (idx >= 0) candidates[idx].selectedByLpm = true;
  }
  const winner = candidates.find((c) => c.selectedByLpm) ?? null;
  const explanation = winner
    ? `Matched ${winner.destination} via ${winner.nextHop} (${winner.protocol}, AD=${winner.adminDistance})`
    : `No matching route for ${dstIp} — packet will be dropped`;
  return { dstIp, candidates, winner, explanation };
}

function bestRoute(dstIp: string, routes: RouteEntry[]): RouteEntry | null {
  const sorted = [...routes].sort(
    (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
  );
  return sorted.find((r) => isInSubnet(dstIp, r.destination)) ?? null;
}

interface Neighbor {
  nodeId: string;
  edgeId: string;
}

const INITIAL_STATE: SimulationState = {
  status: 'idle',
  traces: [],
  currentTraceId: null,
  currentStep: -1,
  activeEdgeIds: [],
  selectedHop: null,
};

export class SimulationEngine {
  private state: SimulationState = { ...INITIAL_STATE };
  private listeners = new Set<(state: SimulationState) => void>();
  private playTimer: ReturnType<typeof setInterval> | null = null;
  // packetSnapshots[traceId][step] = InFlightPacket snapshot at that hop
  private packetSnapshots = new Map<string, InFlightPacket[]>();

  constructor(
    private readonly topology: NetworkTopology,
    private readonly hookEngine: HookEngine,
  ) {}

  getState(): SimulationState {
    return { ...this.state };
  }

  subscribe(listener: (state: SimulationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = { ...this.state };
    this.listeners.forEach((fn) => fn(snapshot));
  }

  // ── Topology helpers ───────────────────────────────────────────────────────

  private getNeighbors(
    nodeId: string,
    excludeNodeId: string | null = null,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Neighbor[] {
    const result: Neighbor[] = [];
    for (const edge of this.topology.edges) {
      if (failureState.downEdgeIds.has(edge.id)) continue;
      if (edge.source === nodeId && edge.target !== excludeNodeId) {
        result.push({ nodeId: edge.target, edgeId: edge.id });
      } else if (edge.target === nodeId && edge.source !== excludeNodeId) {
        result.push({ nodeId: edge.source, edgeId: edge.id });
      }
    }
    return result;
  }

  private resolveNextNode(
    currentNodeId: string,
    dstIp: string,
    ingressNodeId: string | null,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Neighbor | null {
    const neighbors = this.getNeighbors(currentNodeId, ingressNodeId, failureState);
    const node = this.topology.nodes.find((n) => n.id === currentNodeId);
    if (!node) return null;

    if (node.data.role === 'router') {
      const routes = this.topology.routeTables.get(currentNodeId) ?? [];
      const route = bestRoute(dstIp, routes);
      if (!route) return null;

      if (route.nextHop === 'direct') {
        // Find neighbor that is the exact destination, or a switch (transparent pass-through)
        for (const neighbor of neighbors) {
          const neighborNode = this.topology.nodes.find((n) => n.id === neighbor.nodeId);
          if (!neighborNode) continue;
          if (neighborNode.data.ip === dstIp) return neighbor;
          if (neighborNode.data.role === 'switch') return neighbor;
        }
        return null;
      }

      // nextHop is an IP: find neighbor router whose interface has that IP, or a switch
      for (const neighbor of neighbors) {
        const neighborNode = this.topology.nodes.find((n) => n.id === neighbor.nodeId);
        if (!neighborNode) continue;
        const ifaces = (neighborNode.data.interfaces ?? []) as Array<{ ipAddress: string }>;
        if (ifaces.some((i) => i.ipAddress === route.nextHop)) return neighbor;
        if (neighborNode.data.role === 'switch') return neighbor;
      }
      return null;
    }

    if (node.data.role === 'switch') {
      // Flood: pick first non-ingress neighbor
      return neighbors[0] ?? null;
    }

    // Source endpoints forward to their first connected neighbor
    // (non-source endpoints never forward — packet should have been delivered)
    if (ingressNodeId === null) {
      return neighbors[0] ?? null;
    }

    return null;
  }

  // ── Core precomputation ────────────────────────────────────────────────────

  async precompute(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<PacketTrace> {
    const hops: PacketHop[] = [];
    const snapshots: InFlightPacket[] = [];
    const visitedNodes = new Set<string>();
    let current = packet.srcNodeId;
    let ingressFrom: string | null = null;
    let workingPacket: InFlightPacket = { ...packet, currentDeviceId: current };
    const baseTs = Date.now();

    for (let step = 0; step < MAX_HOPS; step++) {
      // Loop guard
      if (visitedNodes.has(current)) {
        snapshots.push({ ...workingPacket });
        hops.push({
          step,
          nodeId: current,
          nodeLabel: current,
          srcIp: workingPacket.frame.payload.srcIp,
          dstIp: workingPacket.frame.payload.dstIp,
          ttl: workingPacket.frame.payload.ttl,
          protocol: protocolName(workingPacket.frame.payload.protocol),
          event: 'drop',
          fromNodeId: ingressFrom ?? undefined,
          reason: 'routing-loop',
          timestamp: baseTs,
        });
        break;
      }
      visitedNodes.add(current);

      const node = this.topology.nodes.find((n) => n.id === current);
      if (!node) {
        snapshots.push({ ...workingPacket });
        hops.push({
          step,
          nodeId: current,
          nodeLabel: current,
          srcIp: workingPacket.frame.payload.srcIp,
          dstIp: workingPacket.frame.payload.dstIp,
          ttl: workingPacket.frame.payload.ttl,
          protocol: protocolName(workingPacket.frame.payload.protocol),
          event: 'drop',
          fromNodeId: ingressFrom ?? undefined,
          reason: 'node-not-found',
          timestamp: baseTs,
        });
        break;
      }

      if (failureState.downNodeIds.has(current)) {
        snapshots.push({ ...workingPacket });
        hops.push({
          step,
          nodeId: current,
          nodeLabel: node.data.label,
          srcIp: workingPacket.frame.payload.srcIp,
          dstIp: workingPacket.frame.payload.dstIp,
          ttl: workingPacket.frame.payload.ttl,
          protocol: protocolName(workingPacket.frame.payload.protocol),
          event: 'drop',
          fromNodeId: ingressFrom ?? undefined,
          reason: 'node-down',
          timestamp: baseTs,
        });
        break;
      }

      const ipPacket = workingPacket.frame.payload;
      const hop: PacketHop = {
        step,
        nodeId: current,
        nodeLabel: node.data.label,
        srcIp: ipPacket.srcIp,
        dstIp: ipPacket.dstIp,
        ttl: ipPacket.ttl,
        protocol: protocolName(ipPacket.protocol),
        event: 'forward', // overwritten below
        fromNodeId: ingressFrom ?? undefined,
        timestamp: baseTs,
      };
      snapshots.push({ ...workingPacket });

      // Destination check: endpoint with matching IP
      if (
        (node.data.role === 'client' || node.data.role === 'server') &&
        node.data.ip === ipPacket.dstIp
      ) {
        hop.event = 'deliver';
        hops.push(hop);
        break;
      }

      // Call router forwarder for TTL decrement and drop detection
      if (node.data.role === 'router') {
        const forwarderFactory = layerRegistry.getForwarder(node.data.layerId);
        if (forwarderFactory) {
          const forwarder = forwarderFactory(current, this.topology);
          const decision = await forwarder.receive(workingPacket, workingPacket.ingressPortId ?? '');
          if (decision.action === 'drop') {
            hop.event = 'drop';
            hop.reason = decision.reason;
            // Capture routing decision for no-route drops (but not TTL drops).
            // TTL is checked first in the forwarder, so ttl-exceeded reason means
            // we broke before any routing lookup — intentionally absent on TTL drops.
            if (decision.reason !== 'ttl-exceeded') {
              const routes = this.topology.routeTables.get(current) ?? [];
              hop.routingDecision = buildRoutingDecision(ipPacket.dstIp, routes);
            }
            hops.push(hop);
            break;
          }
          workingPacket = decision.packet;
        }
      }

      // Capture routing decision for educational display (router hops only).
      // TTL-exceeded drops break before reaching this point, so routingDecision
      // is intentionally absent on TTL drops.
      if (node.data.role === 'router') {
        const routes = this.topology.routeTables.get(current) ?? [];
        hop.routingDecision = buildRoutingDecision(ipPacket.dstIp, routes);
      }

      // Resolve next node via topology graph (independent of egressPort)
      const next = this.resolveNextNode(current, ipPacket.dstIp, ingressFrom, failureState);
      if (!next) {
        hop.event = 'drop';
        hop.reason = 'no-route';
        hops.push(hop);
        break;
      }

      hop.event = step === 0 ? 'create' : 'forward';
      hop.toNodeId = next.nodeId;
      hop.activeEdgeId = next.edgeId;
      hops.push(hop);

      ingressFrom = current;
      workingPacket = { ...workingPacket, currentDeviceId: next.nodeId };
      current = next.nodeId;
    }

    const lastHop = hops[hops.length - 1];
    const status = lastHop?.event === 'deliver' ? 'delivered' : 'dropped';

    const trace: PacketTrace = {
      packetId: packet.id,
      srcNodeId: packet.srcNodeId,
      dstNodeId: packet.dstNodeId,
      hops,
      status,
    };

    this.packetSnapshots.set(packet.id, snapshots);
    return trace;
  }

  // ── Playback API ───────────────────────────────────────────────────────────

  async send(packet: InFlightPacket, failureState: FailureState = EMPTY_FAILURE_STATE): Promise<void> {
    this.clearPlay();
    const trace = await this.precompute(packet, failureState);
    this.state = {
      ...this.state,
      status: 'paused',
      traces: [...this.state.traces, trace],
      currentTraceId: trace.packetId,
      currentStep: -1,
      activeEdgeIds: [],
      selectedHop: null,
    };
    this.notify();
  }

  private currentTrace(): PacketTrace | null {
    if (!this.state.currentTraceId) return null;
    return this.state.traces.find((t) => t.packetId === this.state.currentTraceId) ?? null;
  }

  step(): void {
    const trace = this.currentTrace();
    if (!trace) return;
    if (this.state.status === 'done') return;

    const nextStep = this.state.currentStep + 1;
    if (nextStep >= trace.hops.length) return;

    const hop = trace.hops[nextStep];
    const snapshots = this.packetSnapshots.get(trace.packetId) ?? [];
    const packetAtStep = snapshots[nextStep];
    const isDone = nextStep === trace.hops.length - 1;

    this.state = {
      ...this.state,
      currentStep: nextStep,
      activeEdgeIds: hop.activeEdgeId ? [hop.activeEdgeId] : [],
      selectedHop: hop,
      status: isDone ? 'done' : this.state.status,
    };
    this.notify();

    if (packetAtStep) {
      this.emitHookForHop(hop, packetAtStep);
    }

    if (isDone) {
      this.clearPlay();
    }
  }

  private emitHookForHop(hop: PacketHop, packet: InFlightPacket): void {
    switch (hop.event) {
      case 'create':
        void this.hookEngine.emit('packet:create', { packet, sourceNodeId: hop.nodeId });
        break;
      case 'forward':
        void this.hookEngine.emit('packet:forward', {
          packet,
          fromNodeId: hop.fromNodeId ?? hop.nodeId,
          toNodeId: hop.toNodeId ?? '',
          decision: { action: 'forward', egressPort: hop.activeEdgeId ?? '', packet },
        });
        break;
      case 'deliver':
        void this.hookEngine.emit('packet:deliver', { packet, destinationNodeId: hop.nodeId });
        break;
      case 'drop':
        void this.hookEngine.emit('packet:drop', {
          packet,
          nodeId: hop.nodeId,
          reason: hop.reason ?? 'unknown',
        });
        break;
    }
  }

  play(ms = DEFAULT_PLAY_INTERVAL_MS): void {
    if (this.state.status === 'done' || this.state.status === 'running') return;
    this.state = { ...this.state, status: 'running' };
    this.notify();
    this.playTimer = setInterval(() => {
      this.step();
    }, ms);
  }

  pause(): void {
    const wasRunning = this.state.status === 'running';
    this.clearPlay();
    if (wasRunning) {
      this.state = { ...this.state, status: 'paused' };
      this.notify();
    }
  }

  reset(): void {
    this.clearPlay();
    this.state = {
      ...this.state,
      status: this.state.currentTraceId ? 'paused' : 'idle',
      currentStep: -1,
      activeEdgeIds: [],
      selectedHop: null,
    };
    this.notify();
  }

  selectHop(step: number): void {
    const trace = this.currentTrace();
    if (!trace) return;
    const hop = trace.hops[step];
    if (!hop) return;
    this.state = {
      ...this.state,
      selectedHop: hop,
      activeEdgeIds: hop.activeEdgeId ? [hop.activeEdgeId] : [],
    };
    this.notify();
  }

  private clearPlay(): void {
    if (this.playTimer !== null) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }
}
