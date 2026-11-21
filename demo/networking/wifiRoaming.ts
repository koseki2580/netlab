/**
 * The enterprise Wi-Fi roaming lesson (REQ-413): a user on a voice call walks
 * down a corridor past three access points run by one controller (WLC), and
 * the client roams from AP to AP. How long the roam takes decides whether the
 * call survives; where the controller sits decides where a packet travels.
 *
 * Simplified on purpose:
 * - Signal: a log-distance model, RSSI = −40 dBm at 1 m, path-loss exponent 3,
 *   horizontal distance only (ceiling height ignored), no walls or fading.
 * - The client checks once per metre and roams when its current AP is weaker
 *   than its threshold AND another AP is at least `marginDb` stronger. Real
 *   clients use vendor-specific rules; only the client decides to roam.
 * - Roam time: each over-the-air frame exchange is taken as 5 ms and each EAP
 *   round trip to the RADIUS server as 30 ms (both assumptions); scanning for
 *   the next AP is left out. Full 802.1X re-authentication is taken as 8 EAP
 *   round trips (method-dependent in reality). 802.11r fast transition (FT,
 *   over the air) needs two exchanges because the keys were derived ahead.
 * - The call hides a gap of up to 150 ms (an assumption for a jitter buffer
 *   plus concealment); one voice packet every 20 ms.
 * - CAPWAP (RFC 5415): APs tunnel to the controller. In central switching the
 *   clients' traffic goes through the tunnel to the controller; in local
 *   switching the AP puts it on the wired VLAN itself. The wired network is a
 *   tree: AP1 and AP2 on SW1, AP3 on SW2, both switches and the WLC on Core.
 */

export type ApId = 'AP1' | 'AP2' | 'AP3';

export interface AccessPoint {
  readonly id: ApId;
  /** Position along the corridor, m. */
  readonly x: number;
}

export const APS: readonly AccessPoint[] = [
  { id: 'AP1', x: 10 },
  { id: 'AP2', x: 45 },
  { id: 'AP3', x: 80 },
];

export const CORRIDOR_M = 90;
export const RSSI_AT_1M_DBM = -40;
export const PATH_LOSS_EXPONENT = 3;

/** Received signal from an AP at `apX` for a client at `x`, dBm. */
export function rssiDbm(apX: number, x: number): number {
  const distance = Math.max(1, Math.abs(x - apX));
  return RSSI_AT_1M_DBM - 10 * PATH_LOSS_EXPONENT * Math.log10(distance);
}

export interface RoamPolicy {
  /** Roam only when the current AP is weaker than this, dBm. */
  readonly thresholdDbm: number;
  /** …and another AP is at least this much stronger, dB. */
  readonly marginDb: number;
}

export const DEFAULT_POLICY: RoamPolicy = { thresholdDbm: -70, marginDb: 8 };

export interface Roam {
  readonly atM: number;
  readonly from: ApId;
  readonly to: ApId;
  /** Signal of the old AP when the client left it, dBm. */
  readonly fromDbm: number;
  /** Signal of the new AP when the client joined it, dBm. */
  readonly toDbm: number;
}

export interface Walk {
  readonly roams: readonly Roam[];
  /** The weakest signal the client was connected at during the walk, dBm. */
  readonly weakestDbm: number;
  /** The AP the client is connected to at each metre, 0..CORRIDOR_M. */
  readonly connected: readonly ApId[];
}

/** Walk the corridor from 0 m to the end, checking once per metre. */
export function walk(policy: RoamPolicy): Walk {
  const roams: Roam[] = [];
  const connected: ApId[] = [];
  const signals = (x: number) => APS.map((ap) => rssiDbm(ap.x, x));
  const strongest = (values: readonly number[]) =>
    values.reduce((best, value, index) => (value > values[best]! ? index : best), 0);
  let current = strongest(signals(0));
  let weakestDbm = Infinity;
  for (let x = 0; x <= CORRIDOR_M; x += 1) {
    const values = signals(x);
    const best = strongest(values);
    const here = values[current]!;
    if (best !== current && here < policy.thresholdDbm && values[best]! - here >= policy.marginDb) {
      roams.push({
        atM: x,
        from: APS[current]!.id,
        to: APS[best]!.id,
        fromDbm: here,
        toDbm: values[best]!,
      });
      current = best;
    }
    weakestDbm = Math.min(weakestDbm, values[current]!);
    connected.push(APS[current]!.id);
  }
  return { roams, weakestDbm, connected };
}

export type RoamMethod = 'full-8021x' | 'ft';
export const ROAM_METHODS: readonly RoamMethod[] = ['full-8021x', 'ft'];

export const AIR_EXCHANGE_MS = 5;
export const DEFAULT_RADIUS_RTT_MS = 30;
export const EAP_ROUND_TRIPS = 8;

export type RoamStepId = 'open-auth' | 'reassoc' | 'eap' | 'four-way' | 'ft-auth';

export interface RoamStep {
  readonly id: RoamStepId;
  readonly exchanges: number;
  readonly ms: number;
}

export interface RoamTime {
  readonly steps: readonly RoamStep[];
  readonly totalMs: number;
}

/** The frame exchanges a roam needs before voice flows again, and how long they take. */
export function roamTime(
  method: RoamMethod,
  radiusRttMs: number = DEFAULT_RADIUS_RTT_MS,
): RoamTime {
  const air = (id: RoamStepId, exchanges: number): RoamStep => ({
    id,
    exchanges,
    ms: exchanges * AIR_EXCHANGE_MS,
  });
  const steps: RoamStep[] =
    method === 'ft'
      ? [air('ft-auth', 1), air('reassoc', 1)]
      : [
          air('open-auth', 1),
          air('reassoc', 1),
          { id: 'eap', exchanges: EAP_ROUND_TRIPS, ms: EAP_ROUND_TRIPS * radiusRttMs },
          air('four-way', 2),
        ];
  return { steps, totalMs: steps.reduce((sum, step) => sum + step.ms, 0) };
}

export const CALL_GAP_BUDGET_MS = 150;
export const VOICE_PACKET_MS = 20;

export interface CallVerdict {
  readonly gapMs: number;
  readonly survives: boolean;
  /** Voice packets that fall into the gap (at most). */
  readonly packetsLost: number;
}

export function callVerdict(gapMs: number): CallVerdict {
  return {
    gapMs,
    survives: gapMs <= CALL_GAP_BUDGET_MS,
    packetsLost: Math.ceil(gapMs / VOICE_PACKET_MS),
  };
}

export type Switching = 'central' | 'local';
export type WiredNode = ApId | 'SW1' | 'SW2' | 'Core' | 'WLC';
export type PathNode = WiredNode | 'Phone A' | 'Phone B';

/** The wired tree: each node's uplink. */
const UPLINK: Readonly<Record<WiredNode, WiredNode | null>> = {
  AP1: 'SW1',
  AP2: 'SW1',
  AP3: 'SW2',
  SW1: 'Core',
  SW2: 'Core',
  WLC: 'Core',
  Core: null,
};

function toRoot(node: WiredNode): WiredNode[] {
  const chain: WiredNode[] = [node];
  for (let up = UPLINK[node]; up; up = UPLINK[up]) chain.push(up);
  return chain;
}

/** The wired path between two nodes of the tree, both ends included. */
export function wiredPath(from: WiredNode, to: WiredNode): WiredNode[] {
  const up = toRoot(from);
  const down = toRoot(to);
  const meet = up.find((node) => down.includes(node))!;
  return [...up.slice(0, up.indexOf(meet) + 1), ...down.slice(0, down.indexOf(meet)).reverse()];
}

export interface PacketPath {
  readonly hops: readonly PathNode[];
  readonly viaController: boolean;
  /** Cable links crossed (the two radio legs are not counted). */
  readonly wiredLinks: number;
}

/** Where a packet from Phone A on AP1 to Phone B on `dstAp` travels. */
export function packetPath(mode: Switching, dstAp: ApId, srcAp: ApId = 'AP1'): PacketPath {
  const wired =
    mode === 'central'
      ? [...wiredPath(srcAp, 'WLC'), ...wiredPath('WLC', dstAp).slice(1)]
      : wiredPath(srcAp, dstAp);
  return {
    hops: ['Phone A', ...wired, 'Phone B'],
    viaController: wired.includes('WLC'),
    wiredLinks: wired.length - 1,
  };
}
