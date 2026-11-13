/**
 * What the flow-control lesson runs: a handshake and a transfer on the
 * simulator, through the same `TcpOrchestrator` the engine uses, and the rows
 * it shows. Every number in a row is the simulator's.
 */
import { TcpOrchestrator, type TcpEventSink } from '../../src/layers/l4-transport/TcpOrchestrator';
import type { TcpEndpoints, TcpTransferStep } from '../../src/layers/l4-transport/TcpFlowControl';
import type { SimulationEngine } from '../../src/simulation/SimulationEngine';
import type { InFlightPacket, TcpHeaderOptions } from '../../src/types/packets';
import type { PacketTrace } from '../../src/types/simulation';
import type { TcpNegotiatedOptions } from '../../src/types/tcp';
import type { NetworkTopology } from '../../src/types/topology';

export const TRANSFER_BYTES = 8000;
export const SERVER_BUFFER = 4000;
/** The application reads again from this round in the "stops" setting. */
export const RESUME_ROUND = 8;
/** The first cwnd in segments: the same as the congestion lesson's, within RFC 5681 §3.1. */
export const FLOW_IW_SEGMENTS = 2;

export type ReaderSpeed = 'fast' | 'slow' | 'stops';

export function readerBytes(speed: ReaderSpeed): (round: number) => number {
  switch (speed) {
    case 'fast':
      return () => Number.POSITIVE_INFINITY;
    case 'slow':
      return () => 500;
    case 'stops':
      return (round) => (round < RESUME_ROUND ? 0 : Number.POSITIVE_INFINITY);
  }
}

export type RowKind = 'syn' | 'syn-ack' | 'ack-3' | TcpTransferStep['kind'];

export interface FlowRow {
  readonly packetId: string;
  readonly kind: RowKind;
  readonly round: number | null;
  readonly length: number;
  readonly windowField: number | null;
  readonly window: number | null;
  readonly cwnd: number | null;
  readonly rwnd: number | null;
  readonly inFlight: number | null;
}

export interface FlowRun {
  readonly synOptions: TcpHeaderOptions;
  readonly synAckOptions: TcpHeaderOptions;
  readonly negotiated: TcpNegotiatedOptions;
  readonly rows: readonly FlowRow[];
  readonly completed: boolean;
  readonly delivered: number;
  readonly largestSegment: number;
  readonly probes: number;
  readonly updates: number;
  readonly sawZeroWindow: boolean;
}

const QUIET_SINK: TcpEventSink = { appendTrace: () => undefined, notify: () => undefined };

/** Clears the engine, then shakes hands and transfers, committing every segment as a trace. */
export async function runFlow(
  engine: SimulationEngine,
  topology: NetworkTopology,
  serverMss: number,
  speed: ReaderSpeed,
): Promise<FlowRun | null> {
  engine.clear();
  const sent: InFlightPacket[] = [];
  const orchestrator = new TcpOrchestrator(topology, {
    precompute: async (packet, failureState) => {
      sent.push(packet);
      await engine.send(packet, failureState);
      const traces: PacketTrace[] = engine.getState().traces;
      return { trace: traces[traces.length - 1]!, nodeArpTables: {} };
    },
    findNode: (id) => topology.nodes.find((node) => node.id === id),
  });
  const endpoints: TcpEndpoints = { server: { mss: serverMss, receiveBuffer: SERVER_BUFFER } };
  const opened = await orchestrator.handshake(
    'client-1',
    'server-1',
    12345,
    80,
    QUIET_SINK,
    undefined,
    'tcp-flow-lesson',
    endpoints,
  );
  const connection = opened.connection;
  if (!connection?.negotiated) return null;
  const moved = await orchestrator.transfer(
    connection,
    {
      bytes: TRANSFER_BYTES,
      readBytes: readerBytes(speed),
      maxRounds: 200,
      initialCwndSegments: FLOW_IW_SEGMENTS,
    },
    QUIET_SINK,
  );

  const handshake: FlowRow[] = (['syn', 'syn-ack', 'ack-3'] as const).map((kind, index) => ({
    packetId: opened.traces[index]?.packetId ?? '',
    kind,
    round: null,
    length: 0,
    windowField: null,
    window: null,
    cwnd: null,
    rwnd: null,
    inFlight: null,
  }));
  const steps = moved.plan.steps;
  const rows = steps.map(
    (step, index): FlowRow => ({
      packetId: moved.traces[index]?.packetId ?? '',
      kind: step.kind,
      round: step.round,
      length: step.length,
      windowField: step.windowField,
      window: step.window,
      cwnd: step.cwnd,
      rwnd: step.rwnd,
      inFlight: step.inFlight,
    }),
  );
  const count = (kind: TcpTransferStep['kind']) => steps.filter((s) => s.kind === kind).length;
  const fromServer = steps.filter((s) => s.kind !== 'data' && s.kind !== 'probe');
  return {
    synOptions: optionsOf(sent[0]),
    synAckOptions: optionsOf(sent[1]),
    negotiated: connection.negotiated,
    rows: [...handshake, ...rows],
    completed: moved.success,
    delivered: moved.plan.delivered,
    largestSegment: Math.max(0, ...steps.filter((s) => s.kind === 'data').map((s) => s.length)),
    probes: count('probe'),
    updates: count('window-update'),
    sawZeroWindow: fromServer.some((step) => step.window === 0),
  };
}

/** The options the segment carries. */
function optionsOf(packet: InFlightPacket | undefined): TcpHeaderOptions {
  const transport = packet?.frame.payload.payload;
  return transport && 'options' in transport ? (transport.options ?? {}) : {};
}
