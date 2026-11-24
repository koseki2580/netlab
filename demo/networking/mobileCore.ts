/**
 * The 5G mobile-core lesson (REQ-438): a phone's (UE's) packets ride from the
 * gNB to the UPF inside a GTP-U tunnel on N3 (3GPP TS 23.501, TS 29.281), so
 * the tunnel's headers come out of the transport MTU; and when the UE moves to
 * another gNB, the UPF that anchors its PDU session and its IP address stay,
 * while the N3 tunnel's gNB end moves.
 *
 * What is counted on N3: outer IPv4 (20 bytes, no options) or IPv6 (40), UDP
 * (8), the GTP-U mandatory header (8), and, when a PDU Session Container is
 * carried, the 4-byte optional field (sequence number, N-PDU number, next
 * extension header type) plus the container itself at its smallest, 4 bytes
 * (length, the 2-byte PDU type and QFI, next extension header type; TS 38.415).
 * In 5G N3 the container is carried, because it holds the QoS flow ID.
 *
 * Simplified: one UPF that is both the N3 end and the PDU session anchor; an
 * Xn handover with the session in SSC mode 1; no inner IPv6, no VLAN or IPsec
 * on the transport; addresses and TEIDs are made up for the lesson.
 */

export type OuterFamily = 'ipv4' | 'ipv6';

export interface Overhead {
  readonly outerIp: number;
  readonly udp: number;
  readonly gtpMandatory: number;
  /** Sequence number, N-PDU number and next extension type: present whenever an extension header is. */
  readonly gtpOptional: number;
  readonly pduSessionContainer: number;
  readonly total: number;
}

export function n3Overhead(outer: OuterFamily, withContainer: boolean): Overhead {
  const outerIp = outer === 'ipv4' ? 20 : 40;
  const udp = 8;
  const gtpMandatory = 8;
  const gtpOptional = withContainer ? 4 : 0;
  const pduSessionContainer = withContainer ? 4 : 0;
  return {
    outerIp,
    udp,
    gtpMandatory,
    gtpOptional,
    pduSessionContainer,
    total: outerIp + udp + gtpMandatory + gtpOptional + pduSessionContainer,
  };
}

export interface InnerSizes {
  readonly overhead: Overhead;
  /** The largest IP packet the UE can send without the N3 packet being fragmented. */
  readonly innerMtu: number;
  /** TCP MSS for an inner IPv4 packet: 20-byte IPv4 header and 20-byte TCP header, no options. */
  readonly tcpMss: number;
}

export function innerSizes(
  transportMtu: number,
  outer: OuterFamily,
  withContainer: boolean,
): InnerSizes {
  const overhead = n3Overhead(outer, withContainer);
  const innerMtu = transportMtu - overhead.total;
  return { overhead, innerMtu, tcpMss: innerMtu - 40 };
}

export interface TunnelEnd {
  readonly node: string;
  readonly address: string;
  readonly teid: string;
}

export interface Session {
  readonly ueIp: string;
  /** The UPF acting as PDU session anchor (PSA): the UE's IP is reached through it. */
  readonly anchor: string;
  /** Where the UPF sends downlink packets: the serving gNB's end, with the TEID that gNB chose. */
  readonly downlink: TunnelEnd;
  /** Where the gNB sends uplink packets: the UPF's end, with the TEID the UPF chose. */
  readonly uplink: TunnelEnd;
}

export const GNBS = {
  gnb1: { node: 'gNB1', address: '192.0.2.11' },
  gnb2: { node: 'gNB2', address: '192.0.2.12' },
} as const;
export type GnbId = keyof typeof GNBS;

export const SESSION: Session = {
  ueIp: '10.45.0.7',
  anchor: 'UPF1',
  downlink: { ...GNBS.gnb1, teid: '0x00000a01' },
  uplink: { node: 'UPF1', address: '192.0.2.1', teid: '0x00001f40' },
};

/** The TEID a gNB hands out for the session's downlink (made up for the lesson). */
function teidFrom(gnb: GnbId): string {
  return gnb === 'gnb1' ? '0x00000a01' : '0x00000b07';
}

/**
 * An Xn handover to `target`: the target gNB gives the SMF its own downlink
 * tunnel end, the SMF tells the UPF to send there. The anchor and the UE's IP
 * do not change; nor, here, does the UPF's uplink end.
 */
export function handover(session: Session, target: GnbId): Session {
  return {
    ...session,
    downlink: { ...GNBS[target], teid: teidFrom(target) },
  };
}

export type Field = 'ueIp' | 'anchor' | 'downlink' | 'uplink';

/** Which parts of the session a handover changed. */
export function changed(before: Session, after: Session): readonly Field[] {
  const same = (a: TunnelEnd, b: TunnelEnd) =>
    a.node === b.node && a.address === b.address && a.teid === b.teid;
  const fields: Field[] = [];
  if (before.ueIp !== after.ueIp) fields.push('ueIp');
  if (before.anchor !== after.anchor) fields.push('anchor');
  if (!same(before.downlink, after.downlink)) fields.push('downlink');
  if (!same(before.uplink, after.uplink)) fields.push('uplink');
  return fields;
}
