/**
 * The BFD lesson (REQ-387): how long a router keeps sending into a dead path
 * when its own interface stays up (the far end died behind a switch or an
 * optical system), with routing-protocol timers and with BFD (RFC 5880).
 *
 * A neighbour is declared down `dead` ms after the last packet heard from it.
 * A failure `phase` ms after the last hello is noticed `dead - phase` ms
 * later. After that, recomputing routes and updating the forwarding table is
 * taken as a fixed 200 ms (an assumption; real routers vary).
 */
export interface Detector {
  readonly id: 'ospf-default' | 'ospf-tuned' | 'bfd-300' | 'bfd-50' | 'bfd-custom';
  /** How often the neighbour sends, ms. */
  readonly intervalMs: number;
  /** Silence after which the neighbour is declared down, ms. */
  readonly deadMs: number;
}

export const DETECTORS: readonly Detector[] = [
  // OSPF's defaults on broadcast links: hello 10 s, dead 40 s.
  { id: 'ospf-default', intervalMs: 10_000, deadMs: 40_000 },
  { id: 'ospf-tuned', intervalMs: 1_000, deadMs: 4_000 },
  // BFD: interval × detect multiplier.
  { id: 'bfd-300', intervalMs: 300, deadMs: 900 },
  { id: 'bfd-50', intervalMs: 50, deadMs: 150 },
];

export const RECONVERGE_MS = 200;
export const PACKETS_PER_SECOND = 1000;

export function bfdDetector(intervalMs: number, multiplier: number): Detector {
  return { id: 'bfd-custom', intervalMs, deadMs: intervalMs * multiplier };
}

/** ms from the failure until the neighbour is declared down, for a failure `phaseMs` after the last hello. */
export function detectionMs(detector: Detector, phaseMs: number): number {
  const phase = ((phaseMs % detector.intervalMs) + detector.intervalMs) % detector.intervalMs;
  return detector.deadMs - phase;
}

/** The longest and shortest detection over every moment the failure could happen. */
export function detectionRange(detector: Detector): {
  readonly worst: number;
  readonly best: number;
} {
  return { worst: detector.deadMs, best: detector.deadMs - detector.intervalMs + 1 };
}

export interface Outage {
  readonly detectMs: number;
  readonly outageMs: number;
  readonly lostPackets: number;
}

/** Traffic is lost from the failure until routes are recomputed around it. */
export function outage(detector: Detector, phaseMs: number): Outage {
  const detectMs = detectionMs(detector, phaseMs);
  const outageMs = detectMs + RECONVERGE_MS;
  return { detectMs, outageMs, lostPackets: Math.round((outageMs * PACKETS_PER_SECOND) / 1000) };
}
