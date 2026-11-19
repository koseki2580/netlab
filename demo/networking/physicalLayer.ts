/**
 * The physical-layer lesson (REQ-390): what a learner meets plugging in a cable.
 *
 * 1. Speed and duplex. Two 10/100 ports, each either autonegotiating or fixed.
 *    IEEE 802.3 Clause 28: an autonegotiating port facing one that sends no
 *    negotiation pulses finds the speed by parallel detection (10BASE-T link
 *    pulses or 100BASE-TX idle) but has no way to learn the duplex, so it
 *    must assume HALF duplex. Fixed ports of different speeds get no link.
 * 2. PoE budget. Ports are allocated by class (the class maximum at the
 *    PSE) unless the switch negotiates power over LLDP, in which case each
 *    device's requested power is allocated instead.
 * 3. LLDP. Each device advertises itself to its direct neighbours only
 *    (802.1AB, sent to 01-80-C2-00-00-0E, which bridges do not forward).
 */

// ---------------------------------------------------------------- duplex

export type Speed = 10 | 100;
export type Duplex = 'full' | 'half';
export type PortSetting =
  | { readonly mode: 'auto' }
  | { readonly mode: 'fixed'; readonly speed: Speed; readonly duplex: Duplex };

export interface SideResult {
  readonly speed: Speed;
  readonly duplex: Duplex;
}

export type LinkOutcome =
  | { readonly link: false }
  | {
      readonly link: true;
      readonly a: SideResult;
      readonly b: SideResult;
      readonly mismatch: boolean;
    };

/** What each side of a cable ends up with. Both ports are 10/100 capable. */
export function negotiate(a: PortSetting, b: PortSetting): LinkOutcome {
  if (a.mode === 'auto' && b.mode === 'auto') {
    const best = { speed: 100, duplex: 'full' } as const;
    return { link: true, a: best, b: best, mismatch: false };
  }
  if (a.mode === 'fixed' && b.mode === 'fixed') {
    if (a.speed !== b.speed) return { link: false };
    const sideA = { speed: a.speed, duplex: a.duplex };
    const sideB = { speed: b.speed, duplex: b.duplex };
    return { link: true, a: sideA, b: sideB, mismatch: a.duplex !== b.duplex };
  }
  // One fixed, one auto: parallel detection takes the speed; duplex falls back to half.
  const fixed = (a.mode === 'fixed' ? a : b) as Extract<PortSetting, { mode: 'fixed' }>;
  const fixedSide = { speed: fixed.speed, duplex: fixed.duplex };
  const autoSide = { speed: fixed.speed, duplex: 'half' } as const;
  return {
    link: true,
    a: a.mode === 'fixed' ? fixedSide : autoSide,
    b: a.mode === 'fixed' ? autoSide : fixedSide,
    mismatch: fixed.duplex !== 'half',
  };
}

export interface ErrorCounters {
  /** Collisions inside the first 64 bytes (half-duplex side). */
  readonly collisions: number;
  /** Collisions after the first 64 bytes (half-duplex side). */
  readonly lateCollisions: number;
  /** Frames shorter than 64 bytes received (full-duplex side). */
  readonly runts: number;
  /** Frames of legal length with a bad checksum (full-duplex side). */
  readonly fcsErrors: number;
}

const ZERO: ErrorCounters = { collisions: 0, lateCollisions: 0, runts: 0, fcsErrors: 0 };
/** Full-size frames: an overlap lands in the first 64 of 1518 bytes this often. */
const EARLY_SHARE = 64 / 1518;

/**
 * Error counters after one minute of traffic at `loadPct` in each direction.
 * The numbers are illustrative (overlaps grow with the square of the load);
 * which counter grows on which side is real. On a mismatch the half-duplex
 * side sees the full-duplex side transmit while it sends, takes it for a
 * collision and aborts its frame: early it counts a collision and the far
 * side receives a runt; late it counts a late collision and the far side
 * receives a frame with a bad FCS. A half/half link has ordinary collisions,
 * which is half duplex working, not an error.
 */
export function errorCounters(
  outcome: LinkOutcome,
  loadPct: number,
): { readonly a: ErrorCounters; readonly b: ErrorCounters } {
  if (!outcome.link || !outcome.mismatch) return { a: ZERO, b: ZERO };
  const overlaps = Math.round(60 * 1000 * (loadPct / 100) ** 2);
  const early = Math.round(overlaps * EARLY_SHARE);
  const late = overlaps - early;
  const half: ErrorCounters = { collisions: early, lateCollisions: late, runts: 0, fcsErrors: 0 };
  const full: ErrorCounters = { collisions: 0, lateCollisions: 0, runts: early, fcsErrors: late };
  return outcome.a.duplex === 'half' ? { a: half, b: full } : { a: full, b: half };
}

// ---------------------------------------------------------------- PoE

export type PoeClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Power the PSE reserves per class (W at the switch port) and the most the device may draw (W). */
export const POE_CLASSES: Readonly<
  Record<PoeClass, { readonly standard: string; readonly pseW: number; readonly pdW: number }>
> = {
  0: { standard: '802.3af', pseW: 15.4, pdW: 12.95 },
  1: { standard: '802.3af', pseW: 4.0, pdW: 3.84 },
  2: { standard: '802.3af', pseW: 7.0, pdW: 6.49 },
  3: { standard: '802.3af', pseW: 15.4, pdW: 12.95 },
  4: { standard: '802.3at', pseW: 30.0, pdW: 25.5 },
  5: { standard: '802.3bt', pseW: 45.0, pdW: 40.0 },
  6: { standard: '802.3bt', pseW: 60.0, pdW: 51.0 },
  7: { standard: '802.3bt', pseW: 75.0, pdW: 62.0 },
  8: { standard: '802.3bt', pseW: 90.0, pdW: 71.3 },
};

export interface PoweredDevice {
  readonly port: number;
  readonly kind: 'phone' | 'camera' | 'ap';
  readonly poeClass: PoeClass;
  /** Power the device asks for over LLDP, W at the PSE. */
  readonly requestW: number;
  /** What it actually draws while running, W (illustrative). */
  readonly drawW: number;
}

export type Allocation = 'class' | 'lldp';

export interface PortPower {
  readonly port: number;
  readonly powered: boolean;
  readonly allocatedW: number;
  readonly drawW: number;
}

export interface BudgetResult {
  readonly ports: readonly PortPower[];
  readonly allocatedW: number;
  readonly drawW: number;
  readonly denied: readonly number[];
}

const tenth = (value: number) => Math.round(value * 10) / 10;

/** Ports are powered in port order; one whose allocation would exceed the budget stays off. */
export function allocatePower(
  devices: readonly PoweredDevice[],
  budgetW: number,
  mode: Allocation,
): BudgetResult {
  let allocated = 0;
  let draw = 0;
  const ports: PortPower[] = [];
  for (const device of [...devices].sort((x, y) => x.port - y.port)) {
    const need = mode === 'class' ? POE_CLASSES[device.poeClass].pseW : device.requestW;
    const powered = tenth(allocated + need) <= budgetW;
    if (powered) {
      allocated = tenth(allocated + need);
      draw = tenth(draw + device.drawW);
    }
    ports.push({
      port: device.port,
      powered,
      allocatedW: powered ? need : 0,
      drawW: powered ? device.drawW : 0,
    });
  }
  return {
    ports,
    allocatedW: allocated,
    drawW: draw,
    denied: ports.filter((port) => !port.powered).map((port) => port.port),
  };
}

export const POE_BUDGET_W = 370;

/** A 24-port switch: 12 phones (class 2), 4 cameras (class 3), 8 access points (class 4). */
export const POE_DEVICES: readonly PoweredDevice[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    port: i + 1,
    kind: 'phone' as const,
    poeClass: 2 as const,
    requestW: 5,
    drawW: 4.5,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    port: i + 13,
    kind: 'camera' as const,
    poeClass: 3 as const,
    requestW: 10,
    drawW: 8.5,
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    port: i + 17,
    kind: 'ap' as const,
    poeClass: 4 as const,
    requestW: 22,
    drawW: 18,
  })),
];

// ---------------------------------------------------------------- LLDP

export interface LldpDevice {
  readonly name: string;
  /** Chassis ID, here the device's base MAC address. */
  readonly chassisId: string;
}

export interface Cable {
  readonly a: { readonly device: string; readonly port: string };
  readonly b: { readonly device: string; readonly port: string };
}

export interface LldpNeighbor {
  readonly localPort: string;
  readonly chassisId: string;
  readonly portId: string;
  readonly systemName: string;
  readonly ttl: number;
}

/** Default msgTxInterval (30 s) × msgTxHold (4): a neighbour is kept 120 s after its last frame. */
export const LLDP_TTL = 30 * 4;

/** The neighbour table `device` learns: one entry per cable plugged into it, nothing beyond. */
export function lldpTable(
  device: string,
  devices: readonly LldpDevice[],
  cables: readonly Cable[],
): readonly LldpNeighbor[] {
  const byName = new Map(devices.map((entry) => [entry.name, entry]));
  const table: LldpNeighbor[] = [];
  for (const cable of cables) {
    for (const [near, far] of [
      [cable.a, cable.b],
      [cable.b, cable.a],
    ] as const) {
      if (near.device !== device) continue;
      const peer = byName.get(far.device);
      if (!peer) continue;
      table.push({
        localPort: near.port,
        chassisId: peer.chassisId,
        portId: far.port,
        systemName: peer.name,
        ttl: LLDP_TTL,
      });
    }
  }
  return table;
}

export const LLDP_DEVICES: readonly LldpDevice[] = [
  { name: 'core-1', chassisId: '00:1b:54:0a:00:01' },
  { name: 'access-1', chassisId: '00:1b:54:0a:00:11' },
  { name: 'access-2', chassisId: '00:1b:54:0a:00:12' },
  { name: 'ap-3f', chassisId: '00:3a:9d:44:10:07' },
];

export const LLDP_CABLES: readonly Cable[] = [
  { a: { device: 'core-1', port: 'Gi1/0/1' }, b: { device: 'access-1', port: 'Gi1/0/48' } },
  { a: { device: 'core-1', port: 'Gi1/0/2' }, b: { device: 'access-2', port: 'Gi1/0/48' } },
  { a: { device: 'access-2', port: 'Gi1/0/17' }, b: { device: 'ap-3f', port: 'eth0' } },
];
