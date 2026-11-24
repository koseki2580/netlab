/**
 * The PLPMTUD lesson (REQ-440): finding how big a packet the path carries
 * when a firewall drops the ICMP "Packet Too Big" messages that classic PMTUD
 * (RFC 1191, RFC 8201) depends on, by probing instead (DPLPMTUD, RFC 8899) as
 * QUIC does (RFC 9000 §14).
 *
 * Sizes are QUIC datagram sizes: the UDP payload, without the 40-byte IPv6
 * and 8-byte UDP headers (RFC 9000 §14). BASE_PLPMTU is 1200 (RFC 9000
 * §14.3) and the local link is 1500-byte Ethernet.
 *
 * Simplified: the path MTU never changes during the search, probes are lost
 * only for being too big (never for congestion), and the search strategy is
 * this lesson's own: RFC 8899 leaves the choice of probe sizes open. It is
 * defined in `search` below.
 */

/** IPv6 header (40) + UDP header (8). */
export const HEADER_BYTES = 48;
/** RFC 9000 §14.3: BASE_PLPMTU consistent with QUIC's 1200-byte minimum. */
export const BASE_PLPMTU = 1200;
/** The local link: 1500-byte Ethernet. */
export const LINK_MTU = 1500;
/** The largest datagram the local link can send. */
export const MAX_PLPMTU = LINK_MTU - HEADER_BYTES;
/** RFC 8899 §5.1.2: a size is given up after this many lost probes. */
export const MAX_PROBES = 3;
/** The lesson's search stops when the gap between known-good and known-bad is this small. */
export const SEARCH_STEP = 8;

/** Whether a datagram of `size` bytes fits a path whose MTU is `pathMtu`. */
export function fits(size: number, pathMtu: number): boolean {
  return size + HEADER_BYTES <= pathMtu;
}

export interface Probe {
  readonly size: number;
  readonly acked: boolean;
  /** Datagrams sent at this size: 1 when acknowledged, MAX_PROBES when lost. */
  readonly sent: number;
}

export interface Search {
  readonly probes: readonly Probe[];
  /** The largest size confirmed. */
  readonly plpmtu: number;
  /** The largest size that would really fit. */
  readonly largestFitting: number;
  /** Every probe datagram sent, retries included. */
  readonly datagrams: number;
}

/**
 * The lesson's search. Probe MAX_PLPMTU first; if it is lost, binary-search
 * between `lo` (largest size known to work, starting at BASE_PLPMTU) and `hi`
 * (smallest size known to fail): probe lo + ⌊(hi − lo) / 2⌋, raise lo on an
 * acknowledgement, lower hi on a loss, and stop once hi − lo ≤ SEARCH_STEP.
 */
export function search(pathMtu: number): Search {
  const probes: Probe[] = [];
  const probe = (size: number) => {
    const acked = fits(size, pathMtu);
    probes.push({ size, acked, sent: acked ? 1 : MAX_PROBES });
    return acked;
  };
  let lo = BASE_PLPMTU;
  if (probe(MAX_PLPMTU)) {
    lo = MAX_PLPMTU;
  } else {
    let hi = MAX_PLPMTU;
    while (hi - lo > SEARCH_STEP) {
      const size = lo + Math.floor((hi - lo) / 2);
      if (probe(size)) lo = size;
      else hi = size;
    }
  }
  return {
    probes,
    plpmtu: lo,
    largestFitting: Math.min(pathMtu - HEADER_BYTES, MAX_PLPMTU),
    datagrams: probes.reduce((sum, entry) => sum + entry.sent, 0),
  };
}

/**
 * A slower strategy for comparison: from BASE_PLPMTU, try one byte more each
 * time until a size is lost.
 */
export function searchByteByByte(pathMtu: number): Search {
  const probes: Probe[] = [];
  let lo = BASE_PLPMTU;
  while (lo < MAX_PLPMTU) {
    const acked = fits(lo + 1, pathMtu);
    probes.push({ size: lo + 1, acked, sent: acked ? 1 : MAX_PROBES });
    if (!acked) break;
    lo += 1;
  }
  return {
    probes,
    plpmtu: lo,
    largestFitting: Math.min(pathMtu - HEADER_BYTES, MAX_PLPMTU),
    datagrams: probes.reduce((sum, entry) => sum + entry.sent, 0),
  };
}

export interface ClassicOutcome {
  /** Whether full-size packets ever get through. */
  readonly delivers: boolean;
  /** The path MTU the sender learns, or null when it learns nothing. */
  readonly learnedMtu: number | null;
  /** The datagram sizes the sender tries, in order (a lost one is retried at the same size). */
  readonly sizes: readonly number[];
}

/**
 * Classic PMTUD: the sender sends full-size packets with DF set; a router
 * whose next link is smaller drops them and answers with Packet Too Big
 * carrying its MTU. If that message is filtered, the sender learns nothing
 * and resends the same packet, which is dropped again: a black hole.
 */
export function classic(pathMtu: number, icmpDelivered: boolean): ClassicOutcome {
  if (pathMtu >= LINK_MTU) return { delivers: true, learnedMtu: LINK_MTU, sizes: [MAX_PLPMTU] };
  return icmpDelivered
    ? { delivers: true, learnedMtu: pathMtu, sizes: [MAX_PLPMTU, pathMtu - HEADER_BYTES] }
    : { delivers: false, learnedMtu: null, sizes: [MAX_PLPMTU] };
}

/** The path MTU the lesson asks about: a tunnel's. */
export const ASKED_PATH_MTU = 1400;
