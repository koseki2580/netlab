/**
 * The rows a traceroute prints, read from the simulator's probe traces: for
 * each probe (TTL 1, 2, …) the device whose answer came back, the address it
 * answered from, and whether it said "time exceeded" or was the destination.
 */
import type { PacketTrace } from '../../src/types/simulation';

export interface TracerouteRow {
  readonly ttl: number;
  /** The answering device's name, or null when no answer reached the sender. */
  readonly device: string | null;
  /** The address the answer came from, as a real traceroute prints it. */
  readonly address: string | null;
  readonly answer: 'time-exceeded' | 'echo-reply' | 'none';
}

export function tracerouteRows(traces: readonly PacketTrace[], srcNodeId: string): TracerouteRow[] {
  return traces.map((trace, index) => {
    const ttl = index + 1;
    // The probe's own hops come first; the answer starts at the second `create`.
    const replyStart = trace.hops.findIndex((hop, i) => i > 0 && hop.event === 'create');
    const reply = replyStart === -1 ? null : trace.hops[replyStart];
    const arrived = trace.hops.some(
      (hop, i) => i > replyStart && hop.nodeId === srcNodeId && hop.event === 'deliver',
    );
    if (!reply || !arrived) return { ttl, device: null, address: null, answer: 'none' };
    const expired = trace.hops
      .slice(0, replyStart)
      .some((hop) => hop.event === 'drop' && hop.reason === 'ttl-exceeded');
    return {
      ttl,
      device: reply.nodeLabel,
      address: reply.srcIp,
      answer: expired ? 'time-exceeded' : 'echo-reply',
    };
  });
}
