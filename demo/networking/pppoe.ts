/**
 * The PPPoE lesson (REQ-410): how a home or office router reaches its
 * provider over PPPoE (RFC 2516), why the link carries only 1492-byte IP
 * packets, how that makes some sites hang when ICMP "fragmentation needed"
 * is filtered (a PMTUD black hole), how TCP MSS clamping fixes it, and how
 * IPoE differs.
 *
 * Simplified: the PPPoE header (6 bytes) and the PPP protocol field (2 bytes)
 * are the only overhead counted on the access link; IPv4 and TCP headers are
 * 20 bytes each (no options except the 4-byte MSS option on SYNs). The server
 * sends the whole response at once (the window is never the limit), a
 * retransmission timeout resends only the first missing segment, and the
 * black-hole case stops after `RETRIES` resends (real TCP keeps trying for
 * minutes). Discovery tags other than the session ID, and LCP options other
 * than the MRU, are left out.
 */

export const ETHERNET_MTU = 1500;
export const PPPOE_HEADER_BYTES = 6;
export const PPP_PROTOCOL_BYTES = 2;
export const IPV4_HEADER_BYTES = 20;
export const IPV6_HEADER_BYTES = 40;
export const TCP_HEADER_BYTES = 20;
const MSS_OPTION_BYTES = 4;
/** An ICMP "fragmentation needed": IP 20 + ICMP 8 + the dropped packet's IP header and 8 bytes. */
const ICMP_FRAG_NEEDED_BYTES = IPV4_HEADER_BYTES + 8 + IPV4_HEADER_BYTES + 8;
/** The browser's request (an HTTP GET), TCP payload bytes. */
export const REQUEST_BYTES = 400;
/** Resends of the first missing segment shown before the lesson stops the black-hole case. */
export const RETRIES = 3;

export const ETHERTYPE_DISCOVERY = 0x8863;
export const ETHERTYPE_SESSION = 0x8864;
export const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';

// ---------------------------------------------------------------- sizes

export type Access = 'pppoe' | 'ipoe' | 'ipv4-over-ipv6';
export const ACCESSES: readonly Access[] = ['pppoe', 'ipoe', 'ipv4-over-ipv6'];

/** Bytes each access method adds inside the 1500-byte Ethernet payload, before the IPv4 packet. */
export function accessOverhead(access: Access): number {
  if (access === 'pppoe') return PPPOE_HEADER_BYTES + PPP_PROTOCOL_BYTES;
  if (access === 'ipv4-over-ipv6') return IPV6_HEADER_BYTES;
  return 0;
}

/** The largest IPv4 packet the access link carries. */
export function linkMtu(access: Access): number {
  return ETHERNET_MTU - accessOverhead(access);
}

/** The TCP payload that fills one IPv4 packet of `mtu` bytes. */
export function mssFor(mtu: number): number {
  return mtu - IPV4_HEADER_BYTES - TCP_HEADER_BYTES;
}

export interface AccessSummary {
  readonly access: Access;
  readonly overhead: number;
  readonly mtu: number;
  readonly mss: number;
  /** Full packets needed to carry `bytes` of data. */
  readonly packets: number;
  /** TCP payload as a share of the 1500-byte Ethernet payload, percent to one decimal. */
  readonly efficiency: number;
}

export function accessSummary(access: Access, bytes: number): AccessSummary {
  const mtu = linkMtu(access);
  const mss = mssFor(mtu);
  return {
    access,
    overhead: accessOverhead(access),
    mtu,
    mss,
    packets: Math.ceil(bytes / mss),
    efficiency: Math.round((mss / ETHERNET_MTU) * 1000) / 10,
  };
}

// ---------------------------------------------------------------- discovery and session

export interface AccessConcentrator {
  readonly name: string;
  readonly mac: string;
}

/** MAC addresses from the documentation range 00:00:5e:00:53:00/24 (RFC 7042). */
export const HOST_MAC = '00:00:5e:00:53:aa';
export const CONCENTRATORS: readonly AccessConcentrator[] = [
  { name: 'BRAS-A', mac: '00:00:5e:00:53:01' },
  { name: 'BRAS-B', mac: '00:00:5e:00:53:02' },
];

export type DiscoveryCode = 'PADI' | 'PADO' | 'PADR' | 'PADS';
const DISCOVERY_CODE: Record<DiscoveryCode, number> = {
  PADI: 0x09,
  PADO: 0x07,
  PADR: 0x19,
  PADS: 0x65,
};

export interface DiscoveryPacket {
  readonly code: DiscoveryCode;
  readonly codeValue: number;
  readonly ethertype: number;
  readonly src: string;
  readonly dst: string;
  readonly broadcast: boolean;
  /** 0 until the access concentrator assigns one in the PADS. */
  readonly sessionId: number;
  /** The access concentrator that sends or receives this packet, if one. */
  readonly ac: string | null;
}

/**
 * The discovery exchange: the router broadcasts a PADI, every access
 * concentrator that will serve it answers with a unicast PADO, the router
 * sends a PADR to the one it picks, and that one confirms with a PADS that
 * carries the session ID.
 */
export function discovery(
  acs: readonly AccessConcentrator[],
  chosen: number,
  sessionId: number,
): DiscoveryPacket[] {
  const packet = (
    code: DiscoveryCode,
    src: string,
    dst: string,
    ac: string | null,
    id = 0,
  ): DiscoveryPacket => ({
    code,
    codeValue: DISCOVERY_CODE[code],
    ethertype: ETHERTYPE_DISCOVERY,
    src,
    dst,
    broadcast: dst === BROADCAST_MAC,
    sessionId: id,
    ac,
  });
  const pick = acs[chosen]!;
  return [
    packet('PADI', HOST_MAC, BROADCAST_MAC, null),
    ...acs.map((ac) => packet('PADO', ac.mac, HOST_MAC, ac.name)),
    packet('PADR', HOST_MAC, pick.mac, pick.name),
    packet('PADS', pick.mac, HOST_MAC, pick.name, sessionId),
  ];
}

export type PppProtocol = 'LCP' | 'CHAP' | 'IPCP';
const PPP_PROTOCOL: Record<PppProtocol, number> = { LCP: 0xc021, CHAP: 0xc223, IPCP: 0x8021 };

export type PppMessage =
  | 'configure-request'
  | 'configure-ack'
  | 'configure-nak'
  | 'challenge'
  | 'response'
  | 'success';

export interface PppPacket {
  readonly protocol: PppProtocol;
  readonly protocolValue: number;
  readonly ethertype: number;
  readonly sessionId: number;
  readonly from: 'router' | 'ac';
  readonly message: PppMessage;
  readonly mru?: number;
  readonly address?: string;
}

/**
 * The PPP session over the PPPoE session: LCP agrees the MRU, CHAP
 * authenticates the router, and IPCP gives it an address. The router asks
 * for 0.0.0.0; the access concentrator answers with a Configure-Nak naming
 * the address to use, and the router asks again with that address.
 */
export function pppSession(sessionId: number, assigned: string): PppPacket[] {
  const mru = linkMtu('pppoe');
  const p = (
    protocol: PppProtocol,
    from: PppPacket['from'],
    message: PppMessage,
    extra: Pick<PppPacket, 'mru' | 'address'> = {},
  ): PppPacket => ({
    protocol,
    protocolValue: PPP_PROTOCOL[protocol],
    ethertype: ETHERTYPE_SESSION,
    sessionId,
    from,
    message,
    ...extra,
  });
  return [
    p('LCP', 'router', 'configure-request', { mru }),
    p('LCP', 'ac', 'configure-request', { mru }),
    p('LCP', 'ac', 'configure-ack', { mru }),
    p('LCP', 'router', 'configure-ack', { mru }),
    p('CHAP', 'ac', 'challenge'),
    p('CHAP', 'router', 'response'),
    p('CHAP', 'ac', 'success'),
    p('IPCP', 'router', 'configure-request', { address: '0.0.0.0' }),
    p('IPCP', 'ac', 'configure-nak', { address: assigned }),
    p('IPCP', 'router', 'configure-request', { address: assigned }),
    p('IPCP', 'ac', 'configure-ack', { address: assigned }),
  ];
}

// ---------------------------------------------------------------- a page download

export interface TransferSetup {
  /** The home router rewrites the MSS option in SYNs down to fit the PPPoE link. */
  readonly clamp: boolean;
  /** Something on the way drops ICMP, including "fragmentation needed". */
  readonly icmpFiltered: boolean;
  /** The size of the server's response, TCP payload bytes. */
  readonly responseBytes: number;
}

export type PacketKind = 'syn' | 'syn-ack' | 'ack' | 'request' | 'data' | 'resend' | 'icmp';
export type Fate = 'delivered' | 'dropped' | 'filtered';

export interface WirePacket {
  readonly kind: PacketKind;
  readonly from: 'browser' | 'server' | 'router';
  /** The IPv4 packet's size. */
  readonly ipBytes: number;
  /** TCP payload bytes (0 for SYN, ACK and ICMP). */
  readonly payload: number;
  /** Does the packet fit the PPPoE link? (ICMP never crosses it in this lesson.) */
  readonly fits: boolean;
  readonly fate: Fate;
  /** The MSS option as the receiving end sees it, on SYN and SYN-ACK. */
  readonly mss?: number;
  /** For data: the byte offset in the response. */
  readonly offset?: number;
}

export interface Transfer {
  readonly packets: readonly WirePacket[];
  /** The MSS the browser announces, and the one the server sees. */
  readonly announcedMss: number;
  readonly serverSeesMss: number;
  /** The segment size the server first sends. */
  readonly firstSegment: number;
  readonly completed: boolean;
  /** Response bytes the browser can use: received with nothing missing before them. */
  readonly inOrderBytes: number;
  /** Response bytes that arrived at all, in order or not. */
  readonly receivedBytes: number;
  readonly dropped: number;
  /** Extra round trips spent finding the smaller size. */
  readonly extraRoundTrips: number;
}

function segments(offset: number, length: number, size: number): { offset: number; len: number }[] {
  const out: { offset: number; len: number }[] = [];
  for (let at = offset; at < offset + length; at += size) {
    out.push({ offset: at, len: Math.min(size, offset + length - at) });
  }
  return out;
}

/**
 * A browser behind the home router downloads one response from a server on
 * an ordinary 1500-byte network. Every server packet has DF set, so a packet
 * too big for the PPPoE link is dropped by the provider's end of it, which
 * sends ICMP "fragmentation needed" back to the server — unless something
 * filters it.
 */
export function transfer(setup: TransferSetup): Transfer {
  const mtu = linkMtu('pppoe');
  const lanMss = mssFor(ETHERNET_MTU);
  const announcedMss = lanMss;
  const serverSeesMss = setup.clamp ? Math.min(announcedMss, mssFor(mtu)) : announcedMss;
  const browserSeesMss = setup.clamp ? Math.min(lanMss, mssFor(mtu)) : lanMss;
  const packets: WirePacket[] = [];
  const send = (packet: Omit<WirePacket, 'fits' | 'fate'>): boolean => {
    const fits = packet.ipBytes <= mtu;
    packets.push({ ...packet, fits, fate: fits ? 'delivered' : 'dropped' });
    if (!fits) {
      packets.push({
        kind: 'icmp',
        from: 'router',
        ipBytes: ICMP_FRAG_NEEDED_BYTES,
        payload: 0,
        fits: true,
        fate: setup.icmpFiltered ? 'filtered' : 'delivered',
      });
    }
    return fits;
  };
  const synBytes = IPV4_HEADER_BYTES + TCP_HEADER_BYTES + MSS_OPTION_BYTES;
  const bare = IPV4_HEADER_BYTES + TCP_HEADER_BYTES;
  send({ kind: 'syn', from: 'browser', ipBytes: synBytes, payload: 0, mss: serverSeesMss });
  send({ kind: 'syn-ack', from: 'server', ipBytes: synBytes, payload: 0, mss: browserSeesMss });
  send({ kind: 'ack', from: 'browser', ipBytes: bare, payload: 0 });
  send({ kind: 'request', from: 'browser', ipBytes: bare + REQUEST_BYTES, payload: REQUEST_BYTES });

  // The server's own link is 1500 bytes and its path MTU starts there.
  const firstSegment = Math.min(serverSeesMss, lanMss);
  const receivedLens = new Map<number, number>();
  const lost: { offset: number; len: number }[] = [];
  for (const seg of segments(0, setup.responseBytes, firstSegment)) {
    const ok = send({
      kind: 'data',
      from: 'server',
      ipBytes: bare + seg.len,
      payload: seg.len,
      offset: seg.offset,
    });
    if (ok) receivedLens.set(seg.offset, seg.len);
    else lost.push(seg);
  }

  let extraRoundTrips = 0;
  if (lost.length > 0 && !setup.icmpFiltered) {
    // The ICMP tells the server the link's MTU; it resends what was lost in smaller pieces.
    extraRoundTrips = 1;
    for (const gap of lost) {
      for (const seg of segments(gap.offset, gap.len, mssFor(mtu))) {
        if (
          send({
            kind: 'resend',
            from: 'server',
            ipBytes: bare + seg.len,
            payload: seg.len,
            offset: seg.offset,
          })
        ) {
          receivedLens.set(seg.offset, seg.len);
        }
      }
    }
  } else if (lost.length > 0) {
    // No ICMP arrives: the server times out and resends the first missing segment, the same size.
    const first = lost[0]!;
    for (let i = 0; i < RETRIES; i += 1) {
      send({
        kind: 'resend',
        from: 'server',
        ipBytes: bare + first.len,
        payload: first.len,
        offset: first.offset,
      });
    }
  }

  let inOrderBytes = 0;
  while (receivedLens.has(inOrderBytes)) inOrderBytes += receivedLens.get(inOrderBytes)!;
  const receivedBytes = [...receivedLens.values()].reduce((sum, len) => sum + len, 0);
  return {
    packets,
    announcedMss,
    serverSeesMss,
    firstSegment,
    completed: inOrderBytes >= setup.responseBytes,
    inOrderBytes,
    receivedBytes,
    dropped: packets.filter((packet) => packet.fate === 'dropped').length,
    extraRoundTrips,
  };
}
