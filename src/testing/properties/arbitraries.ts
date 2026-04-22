import fc from 'fast-check';
import type { HookEventLogEntry, PredicateInput } from '../../tutorials';
import type { PacketHop, PacketTrace, SimulationState } from '../../types/simulation';

const hopEventArb = fc.constantFrom<PacketHop['event']>(
  'create',
  'forward',
  'deliver',
  'drop',
  'arp-request',
  'arp-reply',
);

export const packetHopArb: fc.Arbitrary<PacketHop> = fc.record({
  step: fc.nat(),
  nodeId: fc.string({ minLength: 1, maxLength: 16 }),
  nodeLabel: fc.string({ minLength: 1, maxLength: 24 }),
  srcIp: fc.ipV4(),
  dstIp: fc.ipV4(),
  ttl: fc.integer({ min: 0, max: 255 }),
  protocol: fc.string({ minLength: 1, maxLength: 8 }),
  event: hopEventArb,
  timestamp: fc.nat(),
});

export const packetTraceArb: fc.Arbitrary<PacketTrace> = fc.record({
  packetId: fc.string({ minLength: 1, maxLength: 24 }),
  srcNodeId: fc.string({ minLength: 1, maxLength: 16 }),
  dstNodeId: fc.string({ minLength: 1, maxLength: 16 }),
  hops: fc.array(packetHopArb, { maxLength: 8 }),
  status: fc.constantFrom<PacketTrace['status']>('in-flight', 'delivered', 'dropped'),
});

export const simulationStateArb: fc.Arbitrary<SimulationState> = fc.record({
  status: fc.constantFrom<SimulationState['status']>('idle', 'running', 'paused', 'done'),
  traces: fc.array(packetTraceArb, { maxLength: 6 }),
  currentTraceId: fc.option(fc.string({ minLength: 1, maxLength: 24 }), { nil: null }),
  currentStep: fc.integer({ min: -1, max: 32 }),
  activeEdgeIds: fc.array(fc.string({ minLength: 1, maxLength: 16 }), { maxLength: 6 }),
  activePathEdgeIds: fc.array(fc.string({ minLength: 1, maxLength: 16 }), { maxLength: 6 }),
  highlightMode: fc.constantFrom('hop', 'path'),
  traceColors: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 24 }),
    fc.string({ minLength: 1, maxLength: 32 }),
  ),
  selectedHop: fc.option(packetHopArb, { nil: null }),
  selectedPacket: fc.constant(null),
  nodeArpTables: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 16 }),
    fc.dictionary(fc.ipV4(), fc.hexaString({ minLength: 2, maxLength: 12 })),
  ),
  natTables: fc.constant([]),
  connTrackTables: fc.constant([]),
});

export const hookEventLogEntryArb: fc.Arbitrary<HookEventLogEntry> = fc.record({
  name: fc.constantFrom(
    'packet:create',
    'packet:forward',
    'packet:deliver',
    'packet:drop',
    'switch:learn',
    'router:lookup',
    'fetch:intercept',
    'fetch:respond',
  ),
  payload: fc.anything(),
  stepIndex: fc.integer({ min: -1, max: 32 }),
});

export const predicateInputArb: fc.Arbitrary<PredicateInput> = fc.record({
  state: simulationStateArb,
  events: fc.array(hookEventLogEntryArb, { maxLength: 32 }),
});
