import { AssessmentRunner } from '../../assessments/AssessmentRunner';
import { HookEngine } from '../../hooks/HookEngine';
import { EditSession } from '../../sandbox/EditSession';
import { fromEngine } from '../../sandbox/SimulationSnapshot';
import { DEFAULT_PARAMETERS } from '../../sandbox/types';
import type { Scenario } from '../../scenarios/types';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { MainThreadEngine } from '../../simulation/worker/MainThreadEngine';
import type { InFlightPacket } from '../../types/packets';
import type { NetlabNode, NetworkTopology } from '../../types/topology';
import { enrichTopology } from '../runtime';
import type { Assertion, AssertionContext, AssertionResult } from './types';

interface CreateAssertionContextOptions {
  readonly scenario: Scenario;
  readonly session: EditSession;
}

type PacketFailureReason = Extract<Assertion, { readonly kind: 'packet-fails' }>['reason'];

function nodeIp(topology: NetworkTopology, nodeId: string): string | null {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  if (typeof node.data.ip === 'string') return node.data.ip;
  return node.data.interfaces?.[0]?.ipAddress ?? null;
}

function endpointNode(topology: NetworkTopology, nodeId: string): NetlabNode | null {
  return topology.nodes.find((candidate) => candidate.id === nodeId) ?? null;
}

function buildEngine(
  topology: NetworkTopology,
  state = new MainThreadEngine(topology, new HookEngine()).getState(),
) {
  const engine = new MainThreadEngine(topology, new HookEngine(), { traceDetailLevel: 'full' });
  engine.setState(state);
  return engine;
}

export function createAssertionContext({
  scenario,
  session,
}: CreateAssertionContextOptions): AssertionContext {
  const baseTopology = enrichTopology(scenario.topology);
  const baseEngine = new SimulationEngine(baseTopology, new HookEngine(), { useMainThread: true });
  const root = fromEngine(
    baseEngine,
    scenario.parameters ?? DEFAULT_PARAMETERS,
    scenario.preseedAnnotations === undefined
      ? {}
      : { preseedAnnotations: scenario.preseedAnnotations },
  );
  const preseeded = scenario.preseedEdits?.length
    ? new EditSession(scenario.preseedEdits).apply(root)
    : root;
  const edited = session.apply(preseeded);
  const topology = enrichTopology(edited.topology);
  const engine = buildEngine(topology, structuredClone(edited.state));
  engine.setPlayInterval(edited.parameters.engine.tickMs);

  return {
    scenario,
    session,
    topology,
    engine,
  };
}

function result(
  pass: boolean,
  description: string,
  message?: string,
  diagnostics?: Readonly<Record<string, unknown>>,
): AssertionResult {
  return {
    pass,
    description,
    ...(message !== undefined ? { message } : {}),
    ...(diagnostics !== undefined ? { diagnostics } : {}),
  };
}

async function packetReaches(
  assertion: Extract<Assertion, { readonly kind: 'packet-reaches' }>,
  context: AssertionContext,
): Promise<AssertionResult> {
  const trace = await context.engine.ping(assertion.source, assertion.destination);
  const pass = trace.status === 'delivered' && trace.hops.length <= assertion.within;

  return result(
    pass,
    `packet ${assertion.source} reached ${assertion.destination} within ${assertion.within} hops`,
    pass ? undefined : `status=${trace.status}, hops=${trace.hops.length}`,
  );
}

function reasonMatches(actual: string | undefined, expected: PacketFailureReason): boolean {
  const reason = actual ?? '';
  switch (expected) {
    case 'ttl':
      return reason.includes('ttl');
    case 'no-route':
      return reason.includes('no-route');
    case 'mtu':
      return reason.includes('mtu') || reason.includes('fragment');
    case 'filtered':
      return reason.includes('filter') || reason.includes('acl') || reason.includes('deny');
  }
}

async function packetFails(
  assertion: Extract<Assertion, { readonly kind: 'packet-fails' }>,
  context: AssertionContext,
): Promise<AssertionResult> {
  const ttl = assertion.reason === 'ttl' ? 0 : undefined;
  const trace = await context.engine.ping(
    assertion.source,
    assertion.destination,
    ttl === undefined ? undefined : { ttl },
  );
  const dropHop = trace.hops.find((hop) => hop.event === 'drop' && hop.reason !== undefined);
  const pass = trace.status === 'dropped' && reasonMatches(dropHop?.reason, assertion.reason);

  return result(
    pass,
    `packet ${assertion.source} failed to reach ${assertion.destination} by ${assertion.reason}`,
    pass ? undefined : `status=${trace.status}, reason=${dropHop?.reason ?? 'none'}`,
  );
}

function arpCacheContains(
  assertion: Extract<Assertion, { readonly kind: 'arp-cache-contains' }>,
  context: AssertionContext,
): AssertionResult {
  const table = context.engine.getState().nodeArpTables[assertion.nodeId] ?? {};
  const pass = Object.prototype.hasOwnProperty.call(table, assertion.ip);
  return result(
    pass,
    `ARP cache for ${assertion.nodeId} contains ${assertion.ip}`,
    pass ? undefined : 'missing ARP entry',
  );
}

function routeTableContains(
  assertion: Extract<Assertion, { readonly kind: 'route-table-contains' }>,
  context: AssertionContext,
): AssertionResult {
  const routes = context.topology.routeTables.get(assertion.nodeId) ?? [];
  const pass = routes.some(
    (route) => route.destination === assertion.destination && route.nextHop === assertion.nextHop,
  );
  return result(
    pass,
    `route table for ${assertion.nodeId} contains ${assertion.destination} via ${assertion.nextHop}`,
    pass ? undefined : 'missing route',
  );
}

function sampleFlow(context: AssertionContext) {
  const flow = context.scenario.sampleFlows?.[0];
  if (!flow) return null;
  const destination = nodeIp(context.topology, flow.to);
  return destination ? { source: flow.from, destination, target: flow.to } : null;
}

function buildLargePacket(
  context: AssertionContext,
  source: string,
  target: string,
): InFlightPacket {
  const srcIp = nodeIp(context.topology, source);
  const dstIp = nodeIp(context.topology, target);
  if (srcIp === null) {
    throw new Error(`expected source IP for ${source}`);
  }
  if (dstIp === null) {
    throw new Error(`expected destination IP for ${target}`);
  }
  return {
    id: `cli-large-${source}-${target}`,
    srcNodeId: source,
    dstNodeId: target,
    currentDeviceId: source,
    ingressPortId: '',
    path: [],
    timestamp: 0,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp,
        ttl: 64,
        protocol: 6,
        flags: { df: false, mf: false },
        payload: {
          layer: 'L4',
          srcPort: 12345,
          dstPort: 80,
          seq: 1,
          ack: 0,
          flags: { syn: false, ack: true, fin: false, rst: false, psh: true, urg: false },
          payload: { layer: 'raw', data: 'x'.repeat(1460) },
        },
      },
    },
  };
}

async function fragmentationOccurs(
  assertion: Extract<Assertion, { readonly kind: 'fragmentation-occurs' }>,
  context: AssertionContext,
): Promise<AssertionResult> {
  const flow = sampleFlow(context);
  if (flow) {
    await context.engine.send(buildLargePacket(context, flow.source, flow.target));
  }
  const pass = context.engine
    .getState()
    .traces.some((trace) =>
      trace.hops.some((hop) => hop.nodeId === assertion.atNodeId && hop.action === 'fragment'),
    );
  return result(
    pass,
    `fragmentation occurs at ${assertion.atNodeId}`,
    pass ? undefined : 'no fragmentation hop found',
  );
}

async function tcpEstablished(
  assertion: Extract<Assertion, { readonly kind: 'tcp-established' }>,
  context: AssertionContext,
): Promise<AssertionResult> {
  if (
    !endpointNode(context.topology, assertion.client) ||
    !endpointNode(context.topology, assertion.server)
  ) {
    return result(
      false,
      `TCP connection ${assertion.client} -> ${assertion.server} is established`,
      'endpoint missing',
    );
  }
  const handshake = await context.engine.tcpConnect(assertion.client, assertion.server, 12345, 80);
  return result(
    handshake.success && handshake.connection?.state === 'ESTABLISHED',
    `TCP connection ${assertion.client} -> ${assertion.server} is established`,
    handshake.success ? undefined : handshake.failureReason,
  );
}

async function ospfConverged(
  assertion: Extract<Assertion, { readonly kind: 'ospf-converged' }>,
  context: AssertionContext,
): Promise<AssertionResult> {
  const flow = sampleFlow(context);
  if (!flow) {
    return result(
      false,
      `OSPF converged within ${assertion.withinSteps} steps`,
      'missing sample flow',
    );
  }
  const trace = await context.engine.ping(flow.source, flow.destination);
  const hasOspfRoute = trace.hops.some((hop) =>
    hop.routingDecision?.candidates.some((candidate) => candidate.protocol === 'ospf'),
  );
  const pass =
    trace.status === 'delivered' && trace.hops.length <= assertion.withinSteps && hasOspfRoute;
  return result(
    pass,
    `OSPF converged within ${assertion.withinSteps} steps`,
    pass ? undefined : `status=${trace.status}, hops=${trace.hops.length}`,
  );
}

async function rubricPasses(
  assertion: Extract<Assertion, { readonly kind: 'rubric-passes' }>,
  context: AssertionContext,
): Promise<AssertionResult> {
  const rubric = context.scenario.assessmentRubric;
  if (!rubric || rubric.id !== assertion.rubricId) {
    return result(false, `rubric ${assertion.rubricId} passes`, 'rubric missing');
  }
  const flow = sampleFlow(context);
  if (flow) {
    await context.engine.ping(flow.source, flow.destination);
  }
  const runner = new AssessmentRunner(rubric, { now: () => 0 });
  const events = context.session.edits.some(
    (edit) => edit.kind === 'link.state' && edit.after === 'down',
  )
    ? [{ name: 'ospf:reconverged', payload: null, stepIndex: 0 }]
    : [];
  runner.onSimulationState(context.engine.getState(), events, context.session);
  return result(
    runner.status.status === 'passed',
    `rubric ${assertion.rubricId} passes`,
    runner.status.status === 'passed' ? undefined : `status=${runner.status.status}`,
    { subgoals: runner.status.subgoalResults },
  );
}

export async function evaluateAssertion(
  assertion: Assertion,
  context: AssertionContext,
): Promise<AssertionResult> {
  switch (assertion.kind) {
    case 'packet-reaches':
      return packetReaches(assertion, context);
    case 'packet-fails':
      return packetFails(assertion, context);
    case 'arp-cache-contains':
      return arpCacheContains(assertion, context);
    case 'route-table-contains':
      return routeTableContains(assertion, context);
    case 'fragmentation-occurs':
      return fragmentationOccurs(assertion, context);
    case 'tcp-established':
      return tcpEstablished(assertion, context);
    case 'ospf-converged':
      return ospfConverged(assertion, context);
    case 'rubric-passes':
      return rubricPasses(assertion, context);
  }
}
