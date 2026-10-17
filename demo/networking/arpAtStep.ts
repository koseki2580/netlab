import type { PacketTrace } from '../../src/types/simulation';

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
 * Every device's ARP table as it stood at `step` (-1: before the first step).
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
    if (line.step <= step) table[line.ip] = line.mac;
  }
  return tables;
}
