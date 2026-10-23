import type { PacketTrace, SimulationState } from '../../src/types/simulation';

/**
 * What a device knew at the step on screen.
 *
 * The engine runs a whole exchange the moment a lesson's button is pressed,
 * so everything it reports afterwards — ARP tables, a DHCP lease, a TCP
 * connection — is the end of the exchange. A lesson that shows state beside
 * the step works it back from the trace instead. This module holds the one
 * rule they share, and one adapter per kind of state.
 */

/** The trace on screen and how far into it the learner has stepped. */
export interface ShownStep {
  readonly trace: PacketTrace | null;
  /** The hop on screen; `BEFORE_FIRST_STEP` before the first step and after Reset. */
  readonly step: number;
}

/** No hop shown yet: before the first step, and after Reset. */
export const BEFORE_FIRST_STEP = -1;

/**
 * The rule every adapter follows: what a hop changed is on screen once the
 * learner has stepped to that hop. Before the first step, and after Reset,
 * no hop has been reached, so only what was there at start-up shows.
 */
export function reached(hopIndex: number, step: number): boolean {
  return hopIndex <= step;
}

/** Whether the learner has stepped to the trace's last hop. */
export function atLastHop(at: ShownStep): boolean {
  return at.trace !== null && reached(at.trace.hops.length - 1, at.step);
}

/**
 * The trace and step on screen. `fallBackToLast` reads the most recent trace
 * when none is selected, as a lesson that shows one exchange at a time does.
 */
export function shownStep(
  state: Pick<SimulationState, 'traces' | 'currentTraceId' | 'currentStep'>,
  { fallBackToLast = false }: { fallBackToLast?: boolean } = {},
): ShownStep {
  const selected = state.traces.find((trace) => trace.packetId === state.currentTraceId);
  const trace = selected ?? (fallBackToLast ? state.traces[state.traces.length - 1] : undefined);
  return { trace: trace ?? null, step: state.currentStep };
}

// ── ARP: each device's table ────────────────────────────────────────────────

/** Each device's ARP table: IP address → MAC address. */
export type ArpTables = Record<string, Record<string, string>>;

/** One line a device wrote into its ARP table. */
export interface ArpLearned {
  readonly nodeId: string;
  readonly ip: string;
  readonly mac: string;
}

/**
 * The lines the trace's ARP answers taught, each with the step it arrived at.
 *
 * The device that learns is the one that asked: an answer carries the
 * answerer's address and MAC back to the asker. The engine's own per-step
 * snapshot files a frame's sender under the device the hop is recorded at, so
 * at the question the Router "learned" its own address and at the answer
 * nothing; this reads the exchange the way the lesson explains it.
 */
function learnedLines(trace: PacketTrace): (ArpLearned & { readonly step: number })[] {
  const lines: (ArpLearned & { readonly step: number })[] = [];
  let asker: string | null = null;
  trace.hops.forEach((hop, step) => {
    if (hop.event === 'arp-request') asker = hop.nodeId;
    if (hop.event !== 'arp-reply' || asker === null) return;
    const answer = hop.arpFrame?.payload;
    if (!answer?.senderIp || !answer.senderMac) return;
    lines.push({ nodeId: asker, ip: answer.senderIp, mac: answer.senderMac, step });
  });
  return lines;
}

/** What the trace's ARP answers taught at exactly this step. */
export function arpLearnedAt(trace: PacketTrace, step: number): ArpLearned[] {
  return learnedLines(trace)
    .filter((line) => line.step === step)
    .map(({ nodeId, ip, mac }) => ({ nodeId, ip, mac }));
}

/**
 * Every device's ARP table as it stood at `step`.
 *
 * `finalTables` is what the engine holds once the whole exchange has run. A
 * line in it that no answer in the trace taught was there from the start; a
 * line an answer taught appears from that answer's step on.
 */
export function arpTablesAtStep(
  trace: PacketTrace,
  finalTables: ArpTables,
  step: number,
): ArpTables {
  const lines = learnedLines(trace);
  const taught = new Set(lines.map((line) => `${line.nodeId} ${line.ip}`));
  const tables: ArpTables = {};
  for (const [nodeId, table] of Object.entries(finalTables)) {
    tables[nodeId] = Object.fromEntries(
      Object.entries(table).filter(([ip]) => !taught.has(`${nodeId} ${ip}`)),
    );
  }
  for (const line of lines) {
    const table = (tables[line.nodeId] ??= {});
    if (reached(line.step, step)) table[line.ip] = line.mac;
  }
  return tables;
}

// ── DHCP: the client's state ────────────────────────────────────────────────

/** The DHCP client as it stands at one message of the exchange (RFC 2131 states). */
export interface DhcpClientNow {
  readonly state: 'INIT' | 'SELECTING' | 'REQUESTING' | 'BOUND';
  /** The address it may use: only once the ACK has arrived. */
  readonly address: string | null;
}

/**
 * The client at the message on screen. The engine runs all four messages when
 * ① is pressed, so the device's own details already read BOUND while the step
 * is at DISCOVER; this is the state the step itself has reached.
 *
 * Keyed by the trace's label: the message type is otherwise carried only by
 * the packet of the hop on screen, and before the first step there is none.
 */
export function dhcpClientNow(
  label: string | undefined,
  arrived: boolean,
  lease: string | null,
): DhcpClientNow {
  if (label === 'DHCP DISCOVER' || label === 'DHCP OFFER') {
    return { state: 'SELECTING', address: null };
  }
  if (label === 'DHCP REQUEST') return { state: 'REQUESTING', address: null };
  if (label === 'DHCP ACK') {
    return arrived && lease
      ? { state: 'BOUND', address: lease }
      : { state: 'REQUESTING', address: null };
  }
  return { state: 'INIT', address: null };
}

// ── TCP: the numbers the handshake agreed on ────────────────────────────────

/**
 * The numbers the three messages agreed on, as the lesson explains them. A SYN
 * uses up one sequence number, so the next number each side sends is its
 * SYN's (or SYN-ACK's) SEQ plus 1 — which is what the connection keeps as
 * localSeq and remoteSeq. Shown side by side unexplained, the SYN's SEQ and
 * localSeq looked off by one.
 */
export function handshakeNumbers(connection: { localSeq: number; remoteSeq: number }) {
  return {
    synSeq: connection.localSeq - 1,
    localSeq: connection.localSeq,
    synAckSeq: connection.remoteSeq - 1,
    remoteSeq: connection.remoteSeq,
  };
}

// ── OSPF: which probe route is the current one ──────────────────────────────

/**
 * The probe route to call current, and the one before it. A probe sent while
 * the link was in another state is no longer the route: after "Fail link" the
 * up-link run sat under "this route" until a new probe was sent.
 */
export function routeComparison<Run extends { readonly linkDown: boolean }>(
  runs: readonly Run[],
  linkDown: boolean,
): { current: Run | null; previous: Run | null } {
  const last = runs[runs.length - 1] ?? null;
  if (last && last.linkDown !== linkDown) return { current: null, previous: last };
  return { current: last, previous: runs[runs.length - 2] ?? null };
}
