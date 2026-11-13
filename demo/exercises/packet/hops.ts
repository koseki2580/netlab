/**
 * The replay of a Check, hop by hop, in words: where the packet was, what
 * happened there, and the TTL it ARRIVED with (a hop's `ttl` is the TTL on
 * arrival; README "Corrections"). An error message a router sent back (time
 * exceeded, too big) is listed after the packet's own hops as such. No line
 * promises a reply: the simulator sends none to a delivered packet.
 */

import type { PacketTrace } from '../../../src/types/simulation';
import type { Localised, PacketExercise, PacketGrade } from '../../packet-lab/model';
import { isNeighborLookupHop } from '../../../src/types/simulation';

export interface HopLine {
  readonly step: number;
  readonly nodeId: string;
  /** Hops of a message a router sent back, not of the learner's packet. */
  readonly note: boolean;
  /** The hop where the packet (or the note) set off: its TTL is the one it left with. */
  readonly start: boolean;
  readonly ttl: number;
  readonly what: Localised;
}

function what(event: string, action: string | undefined, note: boolean): Localised {
  if (note && event === 'create') return { en: 'sends a note back', ja: '知らせを送り返す' };
  if (action === 'fragment')
    return { en: 'cuts it and sends a piece on', ja: '分割して、断片を送り出す' };
  if (action === 'reassembly-pending')
    return { en: 'receives a piece and waits for the rest', ja: '断片を受け取り、残りを待つ' };
  if (action === 'reassembly-complete')
    return { en: 'puts the pieces together', ja: '断片をまとめ直す' };
  switch (event) {
    case 'create':
      return { en: 'sends it', ja: '送り出す' };
    case 'forward':
      return { en: 'passes it on', ja: '次へ送る' };
    case 'deliver':
      return { en: 'receives it', ja: '受け取る' };
    case 'drop':
      return { en: 'throws it away', ja: '捨てる' };
    default:
      return { en: event, ja: event };
  }
}

/** The packet's own hops first, ARP left out; then the hops of any note sent back. */
export function hopLines(trace: PacketTrace, srcIp: string): HopLine[] {
  return trace.hops
    .filter((hop) => !isNeighborLookupHop(hop))
    .map((hop) => {
      const note = hop.srcIp !== srcIp;
      return {
        step: hop.step,
        nodeId: hop.nodeId,
        note,
        start: hop.event === 'create',
        ttl: hop.ttl,
        what: what(hop.event, hop.action, note),
      };
    });
}

export interface PacketPath {
  /** "Packet A", "Packet B" where there are several; none where there is one. */
  readonly name?: Localised;
  readonly lines: readonly HopLine[];
}

const LETTERS = 'ABCDEFGH';

/** The path of each packet that was sent, each under its own name. */
export function packetPaths(exercise: PacketExercise, grade: PacketGrade): PacketPath[] {
  if (exercise.kind === 'read-packet' && grade.traces && grade.traces.length > 1) {
    return grade.traces.map((trace, index) => {
      const letter = LETTERS[index] ?? String(index + 1);
      return {
        name: { en: `Packet ${letter}`, ja: `パケット ${letter}` },
        lines: hopLines(trace, exercise.packets[index]?.srcIp ?? ''),
      };
    });
  }
  if (!grade.trace) return [];
  const sent = exercise.kind === 'read-packet' ? exercise.packets[0] : exercise.packet;
  return [{ lines: hopLines(grade.trace, sent?.srcIp ?? '') }];
}
