/**
 * The MAC learning lesson (REQ-429): how an Ethernet switch learns which port
 * each MAC address is on, floods what it does not know, forwards what it does,
 * ages entries out, and is fooled when a host moves without saying anything.
 *
 * The learning process and filtering database follow IEEE 802.1Q-2022 §8.7
 * and §8.8: the source address of every frame is learned against the port it
 * arrived on; a frame to a known address leaves by that port only (or is
 * filtered if that is the port it came in on); a broadcast or a frame to an
 * unknown address is flooded out of every other port. A dynamic entry not
 * refreshed for the ageing time (recommended default 300 s) is removed.
 *
 * Simplified: one VLAN, four ports, no spanning tree, an unlimited table, and
 * ageing checked exactly at each frame's arrival (a real switch scans its
 * table periodically, so an entry may linger a little past the ageing time).
 */

export const AGEING_TIME_S = 300;
export const PORTS: readonly number[] = [1, 2, 3, 4];
export const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';

export type HostId = 'A' | 'B' | 'C' | 'D';
export const HOST_IDS: readonly HostId[] = ['A', 'B', 'C', 'D'];

/** Addresses from the documentation range 00-00-5E-00-53-00/24 (RFC 7042). */
export const HOSTS: Readonly<Record<HostId, { readonly mac: string; readonly port: number }>> = {
  A: { mac: '00:00:5e:00:53:0a', port: 1 },
  B: { mac: '00:00:5e:00:53:0b', port: 2 },
  C: { mac: '00:00:5e:00:53:0c', port: 3 },
  D: { mac: '00:00:5e:00:53:0d', port: 4 },
};

/** A frame sent by a host, or a host moving to another port without sending. */
export type LanEvent =
  | {
      readonly kind: 'frame';
      readonly atS: number;
      readonly src: HostId;
      readonly dst: HostId | 'broadcast';
    }
  | { readonly kind: 'move'; readonly atS: number; readonly host: HostId; readonly port: number };

export interface Entry {
  readonly mac: string;
  readonly port: number;
  readonly lastSeenS: number;
}

export type Reason = 'broadcast' | 'unknown' | 'aged' | 'known' | 'same-port';

export interface Step {
  readonly atS: number;
  readonly src: HostId;
  readonly dst: HostId | 'broadcast';
  readonly ingress: number;
  readonly egress: readonly number[];
  readonly kind: 'flood' | 'forward' | 'filter';
  readonly reason: Reason;
  /** For a unicast frame: whether it left by the port its destination is really on. */
  readonly delivered: boolean | null;
  /** The table before this frame (after ageing), and after learning from it. */
  readonly tableBefore: readonly Entry[];
  readonly tableAfter: readonly Entry[];
}

const byPort = (a: Entry, b: Entry) => a.port - b.port || a.mac.localeCompare(b.mac);

/** Replays events into the switch's table and returns one step per frame. */
export function replay(events: readonly LanEvent[], ageingS = AGEING_TIME_S): Step[] {
  const where = new Map<HostId, number>(HOST_IDS.map((id) => [id, HOSTS[id].port]));
  const table = new Map<string, Entry>();
  const steps: Step[] = [];
  for (const event of events) {
    if (event.kind === 'move') {
      where.set(event.host, event.port);
      continue;
    }
    const aged = new Set<string>();
    for (const [mac, entry] of table) {
      if (event.atS - entry.lastSeenS >= ageingS) {
        table.delete(mac);
        aged.add(mac);
      }
    }
    const tableBefore = [...table.values()].sort(byPort);
    const ingress = where.get(event.src)!;
    const srcMac = HOSTS[event.src].mac;
    table.set(srcMac, { mac: srcMac, port: ingress, lastSeenS: event.atS });
    const others = PORTS.filter((port) => port !== ingress);
    let egress: readonly number[];
    let kind: Step['kind'];
    let reason: Reason;
    if (event.dst === 'broadcast') {
      [egress, kind, reason] = [others, 'flood', 'broadcast'];
    } else {
      const dstMac = HOSTS[event.dst].mac;
      const known = table.get(dstMac);
      if (!known) {
        [egress, kind, reason] = [others, 'flood', aged.has(dstMac) ? 'aged' : 'unknown'];
      } else if (known.port === ingress) {
        [egress, kind, reason] = [[], 'filter', 'same-port'];
      } else {
        [egress, kind, reason] = [[known.port], 'forward', 'known'];
      }
    }
    steps.push({
      atS: event.atS,
      src: event.src,
      dst: event.dst,
      ingress,
      egress,
      kind,
      reason,
      delivered: event.dst === 'broadcast' ? null : egress.includes(where.get(event.dst)!),
      tableBefore,
      tableAfter: [...table.values()].sort(byPort),
    });
  }
  return steps;
}

/** Scene 1: a switch just powered on, five frames. */
export const SCENE_ONE: readonly LanEvent[] = [
  { kind: 'frame', atS: 0, src: 'A', dst: 'B' },
  { kind: 'frame', atS: 1, src: 'B', dst: 'A' },
  { kind: 'frame', atS: 2, src: 'C', dst: 'broadcast' },
  { kind: 'frame', atS: 3, src: 'A', dst: 'B' },
  { kind: 'frame', atS: 4, src: 'D', dst: 'C' },
];

/** When A last sent in scene 1. */
export const A_LAST_SENT_S = 3;

/**
 * Scene 2a: A moves to port 3 at 5 s and stays silent; B sends to A at 10 s.
 * Then A sends once from its new port, and B sends to A again.
 */
export function movedScene(): Step[] {
  return replay([
    ...SCENE_ONE,
    { kind: 'move', atS: 5, host: 'A', port: 3 },
    { kind: 'frame', atS: 10, src: 'B', dst: 'A' },
    { kind: 'frame', atS: 11, src: 'A', dst: 'B' },
    { kind: 'frame', atS: 12, src: 'B', dst: 'A' },
  ]).slice(SCENE_ONE.length);
}

/** Scene 2b: nobody else speaks; B sends to A `idleS` seconds after A last sent. */
export function agedScene(idleS: number, ageingS = AGEING_TIME_S): Step {
  const steps = replay(
    [...SCENE_ONE, { kind: 'frame', atS: A_LAST_SENT_S + idleS, src: 'B', dst: 'A' }],
    ageingS,
  );
  return steps[steps.length - 1]!;
}
