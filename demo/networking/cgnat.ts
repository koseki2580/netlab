/**
 * The carrier-grade NAT lesson (REQ-433): how many subscribers can share one
 * public IPv4 address, and when one subscriber runs out of ports.
 *
 * - Subscribers' WAN addresses come from the shared address space
 *   100.64.0.0/10 (RFC 6598).
 * - The CGN hands each subscriber ports of the public address in blocks
 *   (port-block allocation), so it logs one record per block rather than one
 *   per flow — the logging cost RFC 7422 sets out to reduce. RFC 6888 requires
 *   that a CGN can limit the ports each subscriber uses.
 * - Ports 0–1023 are not handed out, leaving 1024–65535: 64,512 ports.
 * - Every flow needs its own external port: with endpoint-independent mapping
 *   (RFC 4787, required by RFC 6888) a port is not reused for a second
 *   internal endpoint even towards another destination.
 * - MAP-E / MAP-T (RFC 7597, A+P): each subscriber is given a fixed port set
 *   derived from its PSID, by RFC 7597's algorithm with offset bits a.
 *
 * Simplified: one protocol (TCP and UDP really have separate port spaces);
 * one public address; blocks are handed out first come, first served; block
 * size and blocks per subscriber are operator settings, not standard values.
 */

export const FIRST_PORT = 1024;
export const LAST_PORT = 65535;
export const USABLE_PORTS = LAST_PORT - FIRST_PORT + 1;

/** 100.64.0.0/10, the shared address space. */
export const SHARED_SPACE = { base: '100.64.0.0', prefix: 10 } as const;

export function sharedSpaceSize(): number {
  return 2 ** (32 - SHARED_SPACE.prefix);
}

function toInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

/** Whether `ip` is in 100.64.0.0/10. */
export function inSharedSpace(ip: string): boolean {
  const size = sharedSpaceSize();
  const base = toInt(SHARED_SPACE.base);
  const value = toInt(ip);
  return value >= base && value < base + size;
}

/** How many blocks of `blockSize` ports one public address holds, and the ports left over. */
export function blocksPerAddress(blockSize: number): { blocks: number; unused: number } {
  return {
    blocks: Math.floor(USABLE_PORTS / blockSize),
    unused: USABLE_PORTS % blockSize,
  };
}

/** The port range of block number `index` (0-based). */
export function blockRange(blockSize: number, index: number): { first: number; last: number } {
  const first = FIRST_PORT + index * blockSize;
  return { first, last: first + blockSize - 1 };
}

export interface HeavyOutcome {
  /** Blocks the heavy subscriber was given. */
  readonly blocks: number;
  /** Ports those blocks hold. */
  readonly ports: number;
  /** The number of the first flow refused (1-based), or null when every flow got a port. */
  readonly firstRefusedFlow: number | null;
  readonly refusedFlows: number;
  /** How many subscribers the address serves once the heavy one has its blocks. */
  readonly subscribersServed: number;
  /** Log records for the heavy subscriber's ports: one per block, against one per flow. */
  readonly blockLogRecords: number;
  readonly flowLogRecords: number;
}

/**
 * One subscriber opens `flows` concurrent flows on an address whose other
 * subscribers each hold one block; it may be given up to `maxBlocks` blocks.
 */
export function heavySubscriber(blockSize: number, maxBlocks: number, flows: number): HeavyOutcome {
  const { blocks: total } = blocksPerAddress(blockSize);
  const wanted = Math.ceil(flows / blockSize);
  const blocks = Math.max(1, Math.min(wanted, maxBlocks, total));
  const ports = blocks * blockSize;
  const refusedFlows = Math.max(0, flows - ports);
  return {
    blocks,
    ports,
    firstRefusedFlow: refusedFlows > 0 ? ports + 1 : null,
    refusedFlows,
    subscribersServed: 1 + (total - blocks),
    blockLogRecords: blocks,
    flowLogRecords: flows,
  };
}

/** RFC 7597's default number of offset bits, which keeps ports 0–1023 out of every set. */
export const MAP_OFFSET_BITS = 6;

export interface MapPortSet {
  /** Subscribers sharing the address: 2^k. */
  readonly sharing: number;
  /** Ports each subscriber gets. */
  readonly portsPerSubscriber: number;
  /** The contiguous runs of the PSID's port set, in order. */
  readonly ranges: readonly { first: number; last: number }[];
}

/**
 * The port set of PSID `psid` with a PSID of `psidBits` (k) bits and `a`
 * offset bits (RFC 7597 §5.1): port = A·2^(16−a) + PSID·2^m + j, for
 * A = 1 … 2^a − 1 and j = 0 … 2^m − 1, where m = 16 − a − k.
 */
export function mapPortSet(psidBits: number, psid: number, a = MAP_OFFSET_BITS): MapPortSet {
  const m = 16 - a - psidBits;
  const run = 2 ** m;
  const ranges: { first: number; last: number }[] = [];
  for (let high = a > 0 ? 1 : 0; high < 2 ** a; high += 1) {
    const first = high * 2 ** (16 - a) + psid * run;
    ranges.push({ first, last: first + run - 1 });
  }
  return { sharing: 2 ** psidBits, portsPerSubscriber: ranges.length * run, ranges };
}
