/**
 * The site-to-site VPN lesson (REQ-391): two offices joined over the internet,
 * a packet from 10.1.0.10 to 10.2.0.20, and what an observer on the internet
 * sees of it with no tunnel, GRE (RFC 2784), IPsec ESP in tunnel mode
 * (RFC 4303, keys from IKEv2, RFC 7296) and WireGuard.
 *
 * Simplified:
 * - The outer header is IPv4 (20 bytes, no options); the inner packet is IPv4
 *   + TCP (20 + 20 bytes, no options) carrying plain HTTP.
 * - GRE has no key, checksum or sequence number (4 bytes).
 * - ESP uses AES-GCM (RFC 4106): 8-byte IV, 16-byte ICV; the payload plus the
 *   2-byte trailer is padded to a multiple of 4. No NAT traversal (which
 *   would add an 8-byte UDP header).
 * - WireGuard: UDP 8 + its 16-byte data header + 16-byte Poly1305 tag; the
 *   inner packet is padded with zeros to a multiple of 16, but never past the
 *   tunnel's MTU (as the Linux implementation does).
 * - Which traffic enters the tunnel: one policy table per gateway, outbound only.
 */

export type Method = 'none' | 'gre' | 'ipsec' | 'wireguard';
export const METHODS: readonly Method[] = ['none', 'gre', 'ipsec', 'wireguard'];

export const SITE_A_PUBLIC = '203.0.113.1';
export const SITE_B_PUBLIC = '198.51.100.2';
export const INNER_SRC = '10.1.0.10';
export const INNER_DST = '10.2.0.20';
export const INNER_SPORT = 50123;
export const INNER_DPORT = 80;
export const WIREGUARD_PORT = 51820;

export const IPV4_HEADER = 20;
export const TCP_HEADER = 20;
export const GRE_HEADER = 4;
export const ESP_HEADER = 8;
export const ESP_IV = 8;
export const ESP_TRAILER = 2;
export const ESP_ICV = 16;
export const UDP_HEADER = 8;
export const WG_HEADER = 16;
export const WG_TAG = 16;

/** The smallest inner packet: an IPv4 and a TCP header with no data. */
export const MIN_INNER = IPV4_HEADER + TCP_HEADER;

export type SegmentId =
  | 'outer-ip'
  | 'gre'
  | 'esp'
  | 'iv'
  | 'udp'
  | 'wg'
  | 'inner-ip'
  | 'tcp'
  | 'data'
  | 'esp-trailer'
  | 'wg-pad'
  | 'icv'
  | 'tag';

/** One piece of the packet on the wire, in order. */
export interface Segment {
  readonly id: SegmentId;
  readonly bytes: number;
  /** Whether an observer on the path can read it (false: encrypted). */
  readonly readable: boolean;
  /** What the observer reads there, when readable. */
  readonly shows: string;
}

const roundUp = (value: number, multiple: number) => Math.ceil(value / multiple) * multiple;

/** Fixed bytes each method adds, not counting padding. */
function fixedOverhead(method: Method): number {
  switch (method) {
    case 'none':
      return 0;
    case 'gre':
      return IPV4_HEADER + GRE_HEADER;
    case 'ipsec':
      return IPV4_HEADER + ESP_HEADER + ESP_IV + ESP_TRAILER + ESP_ICV;
    case 'wireguard':
      return IPV4_HEADER + UDP_HEADER + WG_HEADER + WG_TAG;
  }
}

/** The largest inner packet that fits a path MTU once wrapped. */
export function maxInner(method: Method, pathMtu: number): number {
  if (method === 'ipsec') {
    // inner + pad + trailer must be a multiple of 4 and fit what is left.
    const room = pathMtu - IPV4_HEADER - ESP_HEADER - ESP_IV - ESP_ICV;
    return Math.floor(room / 4) * 4 - ESP_TRAILER;
  }
  return pathMtu - fixedOverhead(method);
}

/** Padding bytes added to an inner packet of `inner` bytes. */
export function paddingBytes(method: Method, inner: number, pathMtu: number): number {
  if (method === 'ipsec') return roundUp(inner + ESP_TRAILER, 4) - inner - ESP_TRAILER;
  if (method === 'wireguard') {
    const tunnelMtu = maxInner('wireguard', pathMtu);
    if (inner >= tunnelMtu) return 0;
    return Math.min(roundUp(inner, 16), tunnelMtu) - inner;
  }
  return 0;
}

export interface Wrapped {
  readonly method: Method;
  readonly inner: number;
  readonly padding: number;
  /** Everything added to the inner packet, padding included. */
  readonly overhead: number;
  readonly outer: number;
  readonly maxInner: number;
  /** Whether the wrapped packet fits the path MTU without fragmenting. */
  readonly fits: boolean;
  /** Whether the internet delivers it at all (private destinations are not routed). */
  readonly routable: boolean;
  readonly segments: readonly Segment[];
}

/** Wrap an inner packet of `inner` bytes with a method, for a path MTU. */
export function wrap(method: Method, inner: number, pathMtu: number): Wrapped {
  const padding = paddingBytes(method, inner, pathMtu);
  const overhead = fixedOverhead(method) + padding;
  const outer = inner + overhead;
  const sealed = method === 'ipsec' || method === 'wireguard';
  const innerSegments: Segment[] = [
    {
      id: 'inner-ip',
      bytes: IPV4_HEADER,
      readable: !sealed,
      shows: `${INNER_SRC} → ${INNER_DST}`,
    },
    { id: 'tcp', bytes: TCP_HEADER, readable: !sealed, shows: `${INNER_SPORT} → ${INNER_DPORT}` },
    { id: 'data', bytes: inner - MIN_INNER, readable: !sealed, shows: 'GET /payroll.csv' },
  ];
  const outerIp: Segment = {
    id: 'outer-ip',
    bytes: IPV4_HEADER,
    readable: true,
    shows: `${SITE_A_PUBLIC} → ${SITE_B_PUBLIC}`,
  };
  let segments: Segment[];
  switch (method) {
    case 'none':
      segments = innerSegments;
      break;
    case 'gre':
      segments = [
        outerIp,
        { id: 'gre', bytes: GRE_HEADER, readable: true, shows: 'protocol 0x0800' },
        ...innerSegments,
      ];
      break;
    case 'ipsec':
      segments = [
        outerIp,
        { id: 'esp', bytes: ESP_HEADER, readable: true, shows: 'SPI 0x8f3a21c4, seq 42' },
        { id: 'iv', bytes: ESP_IV, readable: true, shows: 'IV' },
        ...innerSegments,
        { id: 'esp-trailer', bytes: padding + ESP_TRAILER, readable: false, shows: '' },
        { id: 'icv', bytes: ESP_ICV, readable: true, shows: 'ICV' },
      ];
      break;
    case 'wireguard':
      segments = [
        outerIp,
        {
          id: 'udp',
          bytes: UDP_HEADER,
          readable: true,
          shows: `${WIREGUARD_PORT} → ${WIREGUARD_PORT}`,
        },
        {
          id: 'wg',
          bytes: WG_HEADER,
          readable: true,
          shows: 'receiver 0x1b2c3d4e, counter 42',
        },
        ...innerSegments,
        ...(padding > 0
          ? [{ id: 'wg-pad' as const, bytes: padding, readable: false, shows: '' }]
          : []),
        { id: 'tag', bytes: WG_TAG, readable: true, shows: 'Poly1305' },
      ];
      break;
  }
  const max = maxInner(method, pathMtu);
  return {
    method,
    inner,
    padding,
    overhead,
    outer,
    maxInner: max,
    fits: inner <= max,
    routable: method !== 'none',
    segments,
  };
}

export interface ObserverView {
  readonly publicAddresses: boolean;
  readonly innerAddresses: boolean;
  readonly innerPorts: boolean;
  readonly data: boolean;
  /** Whether the tunnel's own header (SPI and sequence, or receiver and counter) is readable. */
  readonly tunnelId: boolean;
  /** Whether a change made on the path is caught by the receiver. */
  readonly tamperDetected: boolean;
}

const readable = (wrapped: Wrapped, id: SegmentId) =>
  wrapped.segments.some((segment) => segment.id === id && segment.readable);

/** What an observer on the internet can read of the packet. */
export function observerView(method: Method): ObserverView {
  const wrapped = wrap(method, 100, 1500);
  return {
    publicAddresses: readable(wrapped, 'outer-ip'),
    innerAddresses: readable(wrapped, 'inner-ip'),
    innerPorts: readable(wrapped, 'tcp'),
    data: readable(wrapped, 'data'),
    tunnelId: readable(wrapped, 'esp') || readable(wrapped, 'wg'),
    // Only the AEAD methods carry an integrity tag (ICV or Poly1305 tag).
    tamperDetected: wrapped.segments.some(
      (segment) => segment.id === 'icv' || segment.id === 'tag',
    ),
  };
}

// --- Which traffic goes into the tunnel -------------------------------------

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

function inPrefix(ip: string, prefix: string): boolean {
  const [network, lengthText] = prefix.split('/');
  const length = Number(lengthText);
  const size = 2 ** (32 - length);
  return Math.floor(ipToInt(ip) / size) === Math.floor(ipToInt(network!) / size);
}

const prefixLength = (prefix: string) => Number(prefix.split('/')[1]);

export type Peer = 'B' | 'C';

/** Site A's IPsec policy: protect traffic between these selectors with that peer's SA. */
export const IPSEC_POLICIES: readonly {
  readonly local: string;
  readonly remote: string;
  readonly peer: Peer;
}[] = [
  { local: '10.1.0.0/16', remote: '10.2.0.0/16', peer: 'B' },
  { local: '10.1.0.0/16', remote: '10.3.0.0/16', peer: 'C' },
];

/** Site A's WireGuard: routes for 10.0.0.0/8 point into wg0; each peer's AllowedIPs. */
export const WG_ROUTE = '10.0.0.0/8';
export const WG_PEERS: readonly { readonly peer: Peer; readonly allowedIps: string }[] = [
  { peer: 'B', allowedIps: '10.2.0.0/16' },
  { peer: 'C', allowedIps: '10.3.0.0/16' },
];

export const DESTINATIONS = ['10.2.0.20', '10.3.1.7', '10.4.0.9', '192.0.2.80'] as const;

export type IpsecAction =
  | { readonly action: 'protect'; readonly peer: Peer }
  | { readonly action: 'bypass' };

/** IPsec: the first policy whose selectors match is used; no match sends the packet unprotected. */
export function ipsecDecision(src: string, dst: string): IpsecAction {
  const policy = IPSEC_POLICIES.find(
    (entry) => inPrefix(src, entry.local) && inPrefix(dst, entry.remote),
  );
  return policy ? { action: 'protect', peer: policy.peer } : { action: 'bypass' };
}

export type WireguardAction =
  | { readonly action: 'peer'; readonly peer: Peer }
  | { readonly action: 'no-peer' }
  | { readonly action: 'not-tunnelled' };

/** WireGuard: the route decides whether wg0 is used; then the longest matching AllowedIPs picks the peer. */
export function wireguardDecision(dst: string): WireguardAction {
  if (!inPrefix(dst, WG_ROUTE)) return { action: 'not-tunnelled' };
  const match = WG_PEERS.filter((entry) => inPrefix(dst, entry.allowedIps)).sort(
    (a, b) => prefixLength(b.allowedIps) - prefixLength(a.allowedIps),
  )[0];
  return match ? { action: 'peer', peer: match.peer } : { action: 'no-peer' };
}
