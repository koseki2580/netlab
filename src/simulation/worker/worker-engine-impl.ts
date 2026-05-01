import { HookEngine } from '../../hooks/HookEngine';
import type { HookMap, HookPoint } from '../../types/hooks';
import type { NetworkTopology } from '../../types/topology';
import { LocalSimulationEngine } from '../LocalSimulationEngine';
import {
  isSimulationWorkerCommand,
  type SimulationRuntimeSnapshot,
  type SimulationWorkerCommand,
  type SimulationWorkerEvent,
  type SimulationWorkerResult,
} from './protocol';

type PostEvent = (event: SimulationWorkerEvent) => void;
type HookContextOf<K extends HookPoint> = Parameters<HookMap[K]>[0];

class WorkerHookEngine extends HookEngine {
  constructor(private readonly post: PostEvent) {
    super();
  }

  override async emit<K extends HookPoint>(point: K, ctx: HookContextOf<K>): Promise<void> {
    this.post({
      type: 'hook',
      id: 'hook',
      point,
      context: structuredClone(ctx),
    });
    await super.emit(point, ctx);
  }
}

function getCommandId(value: unknown): string {
  if (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string'
  ) {
    return value.id;
  }

  return 'unknown';
}

function serializeRuntime(
  engine: LocalSimulationEngine,
  topology: NetworkTopology,
): SimulationRuntimeSnapshot {
  const runtimeNodeIps: Record<string, string | null> = {};
  const dhcpLeaseStates: Record<string, SimulationRuntimeSnapshot['dhcpLeaseStates'][string]> = {};
  const dnsCaches: Record<string, SimulationRuntimeSnapshot['dnsCaches'][string]> = {};
  const udpBindings: Record<string, SimulationRuntimeSnapshot['udpBindings'][string]> = {};
  const joinedGroups: Record<string, string[]> = {};
  const multicastTables: Record<string, SimulationRuntimeSnapshot['multicastTables'][string]> = {};
  const igmpMemberships: Record<string, SimulationRuntimeSnapshot['igmpMemberships'][string]> = {};

  topology.nodes.forEach((node) => {
    runtimeNodeIps[node.id] = engine.getRuntimeNodeIp(node.id);
    dhcpLeaseStates[node.id] = engine.getDhcpLeaseState(node.id);
    dnsCaches[node.id] = engine.getDnsCache(node.id);
    udpBindings[node.id] = engine.getUdpBindings(node.id);
    joinedGroups[node.id] = engine.getJoinedGroups(node.id);
    multicastTables[node.id] = engine.getMulticastTableSnapshot(node.id);
    igmpMemberships[node.id] = engine.getIgmpMembershipSnapshot(node.id);
  });

  return {
    runtimeNodeIps,
    dhcpLeaseStates,
    dnsCaches,
    udpBindings,
    tcpConnections: engine.getTcpConnections(),
    joinedGroups,
    multicastTables,
    igmpMemberships,
  };
}

export class SimulationWorkerRuntime {
  private engine: LocalSimulationEngine | null = null;
  private topology: NetworkTopology | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly post: PostEvent) {}

  async handle(rawCommand: unknown): Promise<void> {
    if (!isSimulationWorkerCommand(rawCommand)) {
      this.post({
        type: 'error',
        id: getCommandId(rawCommand),
        code: 'worker/invalid-command',
        detail: rawCommand,
      });
      return;
    }

    try {
      await this.dispatch(rawCommand);
    } catch (error) {
      this.post({
        type: 'error',
        id: rawCommand.id,
        code: 'worker/command-failed',
        detail: error instanceof Error ? { name: error.name, message: error.message } : error,
      });
    }
  }

  private async dispatch(command: SimulationWorkerCommand): Promise<void> {
    if (command.type === 'seed') {
      this.seed(command);
      return;
    }

    const engine = this.engine;
    if (!engine) {
      this.post({
        type: 'error',
        id: command.id,
        code: 'worker/not-seeded',
        detail: command.type,
      });
      return;
    }

    const result = await this.runCommand(engine, command);
    if (command.type !== 'dispose') {
      this.postState(command.id);
      this.post({ type: 'result', id: command.id, result });
    }
  }

  private seed(command: Extract<SimulationWorkerCommand, { type: 'seed' }>): void {
    this.unsubscribe?.();
    this.topology = structuredClone(command.topology);
    this.engine = new LocalSimulationEngine(
      structuredClone(command.topology),
      new WorkerHookEngine(this.post),
    );
    this.engine.setState(structuredClone(command.state));
    this.engine.setPlayInterval(command.playIntervalMs);
    this.unsubscribe = this.engine.subscribe(() => this.postState(command.id));
    this.post({ type: 'ready', id: command.id });
    this.postState(command.id);
  }

  private async runCommand(
    engine: LocalSimulationEngine,
    command: Exclude<SimulationWorkerCommand, { type: 'seed' }>,
  ): Promise<SimulationWorkerResult> {
    switch (command.type) {
      case 'getState':
        return null;
      case 'setState':
        engine.setState(structuredClone(command.state));
        return null;
      case 'step':
        engine.step();
        return null;
      case 'precompute':
        return engine.precompute(command.packet, command.failureState);
      case 'send':
        await engine.send(command.packet, command.failureState);
        return null;
      case 'ping':
        return engine.ping(command.srcNodeId, command.dstIp, command.options);
      case 'traceroute':
        return engine.traceroute(command.srcNodeId, command.dstIp, command.maxHops);
      case 'simulateDhcp':
        return engine.simulateDhcp(command.clientNodeId, command.failureState, command.sessionId);
      case 'simulateDns':
        return engine.simulateDns(
          command.clientNodeId,
          command.hostname,
          command.failureState,
          command.sessionId,
        );
      case 'tcpConnect':
        return engine.tcpConnect(
          command.clientNodeId,
          command.serverNodeId,
          command.srcPort,
          command.dstPort,
          command.failureState,
          command.sessionId,
        );
      case 'tcpDisconnect':
        return engine.tcpDisconnect(command.connectionId, command.failureState);
      case 'sendTransfer':
        return engine.sendTransfer(
          command.srcNodeId,
          command.dstNodeId,
          command.payload,
          command.options,
        );
      case 'reset':
        engine.reset();
        return null;
      case 'clear':
        engine.clear();
        return null;
      case 'clearPathMtuCaches':
        engine.clearPathMtuCaches();
        return null;
      case 'clearTraces':
        engine.clearTraces();
        return null;
      case 'selectTrace':
        engine.selectTrace(command.packetId);
        return null;
      case 'selectHop':
        engine.selectHop(command.step);
        return null;
      case 'setPlayInterval':
        engine.setPlayInterval(command.ms);
        return null;
      case 'setHighlightMode':
        engine.setHighlightMode(command.mode);
        return null;
      case 'exportPcapRecords':
        return engine.exportPcapRecords(command.traceId);
      case 'dispose':
        this.dispose(command.id);
        return null;
    }
  }

  private postState(id: string): void {
    if (!this.engine || !this.topology) {
      return;
    }

    this.post({
      type: 'state',
      id,
      state: this.engine.getState(),
      runtime: serializeRuntime(this.engine, this.topology),
    });
  }

  private dispose(id: string): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.engine?.clear();
    this.engine = null;
    this.topology = null;
    this.post({ type: 'disposed', id });
  }
}
