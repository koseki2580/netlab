// Packet encapsulation chain: HTTP (L7) inside TCP (L4) inside IP (L3) inside Ethernet (L2)

export const DSCP_CODE_POINTS = {
  CS0: 0,
  CS1: 8,
  AF11: 10,
  AF12: 12,
  AF13: 14,
  CS2: 16,
  AF21: 18,
  AF22: 20,
  AF23: 22,
  CS3: 24,
  AF31: 26,
  AF32: 28,
  AF33: 30,
  CS4: 32,
  AF41: 34,
  AF42: 36,
  AF43: 38,
  CS5: 40,
  EF: 46,
  CS6: 48,
  CS7: 56,
} as const;

export type DscpCodePointName = keyof typeof DSCP_CODE_POINTS;

export function assertDscp(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 63) {
    throw new RangeError(`DSCP must be an integer in [0, 63], got ${value}`);
  }
}

export function tosFromDscp(dscp: number): number {
  assertDscp(dscp);
  return (dscp & 0x3f) << 2;
}

export function dscpFromTos(tos: number): number {
  if (!Number.isInteger(tos) || tos < 0 || tos > 255) {
    throw new RangeError(`ToS must be an integer in [0, 255], got ${tos}`);
  }
  return (tos >> 2) & 0x3f;
}

export interface TcpFlags {
  syn: boolean;
  ack: boolean;
  fin: boolean;
  rst: boolean;
  psh: boolean;
  urg: boolean;
}

export interface RawPayload {
  layer: 'raw';
  data: string;
}

export interface HttpMessage {
  layer: 'L7';
  httpVersion: 'HTTP/1.1';
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  url?: string;
  statusCode?: number;
  reasonPhrase?: string;
  headers: Record<string, string>;
  body?: string;
  requestId?: string;
}

export interface DhcpOptions {
  subnetMask?: string;
  router?: string;
  dnsServer?: string;
  leaseTime?: number;
}

export interface DhcpMessage {
  layer: 'L7';
  messageType: 'DISCOVER' | 'OFFER' | 'REQUEST' | 'ACK' | 'NAK';
  transactionId: number;
  clientMac: string;
  offeredIp?: string;
  serverIp?: string;
  options: DhcpOptions;
}

export interface DnsQuestion {
  name: string;
  type: 'A';
}

export interface DnsRecord {
  name: string;
  type: 'A';
  ttl: number;
  address: string;
}

export interface DnsMessage {
  layer: 'L7';
  transactionId: number;
  isResponse: boolean;
  questions: DnsQuestion[];
  answers: DnsRecord[];
}

export interface TcpSegment {
  layer: 'L4';
  srcPort: number;
  dstPort: number;
  seq: number;
  ack: number;
  flags: TcpFlags;
  windowSize?: number;
  checksum?: number;
  urgentPointer?: number;
  payload: HttpMessage | RawPayload;
}

export interface UdpDatagram {
  layer: 'L4';
  srcPort: number;
  dstPort: number;
  length?: number;
  checksum?: number;
  payload: RawPayload | DhcpMessage | DnsMessage;
}

export interface IcmpMessage {
  layer: 'L4';
  type: number;
  code: number;
  checksum: number;
  identifier?: number;
  sequenceNumber?: number;
  data?: string;
}

export interface Icmpv6Message extends IcmpMessage {
  targetAddress?: string;
  sourceMac?: string;
  targetMac?: string;
  prefix?: string;
  managed?: boolean;
  otherConfig?: boolean;
}

export interface IgmpMessage {
  layer: 'L4';
  igmpType: 'v2-membership-query' | 'v2-membership-report' | 'v2-leave-group';
  groupAddress: string;
  maxResponseTime?: number;
  checksum?: number;
}

export interface IpPacket {
  layer: 'L3';
  version?: 4 | 6;
  ihl?: number;
  dscp?: number;
  ecn?: number;
  totalLength?: number;
  identification?: number;
  flags?: {
    df: boolean;
    mf: boolean;
  };
  fragmentOffset?: number;
  srcIp: string;
  dstIp: string;
  ttl: number;
  protocol: number; // 1 = ICMP, 6 = TCP, 17 = UDP
  headerChecksum?: number;
  payload: IcmpMessage | TcpSegment | UdpDatagram | IgmpMessage | RawPayload;
  // Internal template retained on fragments so destination reassembly can restore
  // the original structured transport payload before L4 delivery.
  reassemblyPayload?: IcmpMessage | TcpSegment | UdpDatagram | IgmpMessage;
}

export interface Ipv6Packet extends Omit<IpPacket, 'version' | 'payload' | 'reassemblyPayload'> {
  version: 6;
  trafficClass?: number;
  flowLabel?: number;
  payloadLength?: number;
  nextHeader: number;
  hopLimit: number;
  protocol: number;
  payload: Icmpv6Message | TcpSegment | UdpDatagram | RawPayload;
}

/**
 * 802.1Q VLAN tag carried between the source MAC and EtherType fields of an
 * Ethernet frame. Untagged frames omit this object.
 */
export interface VlanTag {
  tpid: 0x8100;
  pcp: number;
  dei: 0 | 1;
  vid: number;
}

export interface EthernetFrame {
  layer: 'L2';
  preamble?: number[];
  srcMac: string;
  dstMac: string;
  etherType: number; // 0x0800 = IPv4, 0x86DD = IPv6
  vlanTag?: VlanTag;
  payload: IpPacket | Ipv6Packet;
  fcs?: number;
}

export interface ArpPacket {
  layer: 'ARP';
  hardwareType: 1;
  protocolType: 0x0800;
  operation: 'request' | 'reply';
  senderMac: string;
  senderIp: string;
  targetMac: string;
  targetIp: string;
}

export interface ArpEthernetFrame {
  layer: 'L2';
  srcMac: string;
  dstMac: string;
  etherType: 0x0806;
  vlanTag?: VlanTag;
  payload: ArpPacket;
  fcs?: number;
}

export type Packet = EthernetFrame;

export interface InFlightPacket {
  id: string;
  srcNodeId: string; // origin node ID
  dstNodeId: string; // destination node ID
  frame: EthernetFrame;
  currentDeviceId: string;
  ingressPortId: string;
  egressPortId?: string;
  vlanId?: number;
  path: string[]; // ordered list of device IDs already visited
  timestamp: number;
  sessionId?: string;
}

// ── Runtime predicates (type guards) ────────────────────────────

/** Narrows an L3 payload to IcmpMessage. */
export function isIcmpMessage(payload: IpPacket['payload']): payload is IcmpMessage {
  return 'type' in payload && 'code' in payload;
}

export function isIpv6Packet(packet: IpPacket | Ipv6Packet): packet is Ipv6Packet {
  return packet.version === 6;
}

/** Narrows an L3 payload to IgmpMessage. */
export function isIgmpMessage(payload: IpPacket['payload']): payload is IgmpMessage {
  return 'igmpType' in payload && 'groupAddress' in payload;
}

/** Narrows an L3 payload to UdpDatagram. */
export function isUdpDatagram(payload: IpPacket['payload']): payload is UdpDatagram {
  return (
    payload.layer === 'L4' &&
    'srcPort' in payload &&
    'dstPort' in payload &&
    !('flags' in payload) &&
    !('type' in payload)
  );
}

/** Narrows an L3 payload to TcpSegment. */
export function isTcpSegment(payload: IpPacket['payload']): payload is TcpSegment {
  return 'seq' in payload;
}

/** Narrows a UDP payload to DhcpMessage. */
export function isDhcpMessage(payload: UdpDatagram['payload']): payload is DhcpMessage {
  return payload.layer === 'L7' && 'messageType' in payload;
}

/** Narrows a UDP payload to DnsMessage. */
export function isDnsMessage(payload: UdpDatagram['payload']): payload is DnsMessage {
  return payload.layer === 'L7' && 'isResponse' in payload;
}

/** Narrows a TCP payload to HttpMessage. */
export function isHttpMessage(payload: TcpSegment['payload']): payload is HttpMessage {
  return payload.layer === 'L7';
}

/** Narrows an L2 frame to ArpEthernetFrame. */
export function isArpFrame(frame: EthernetFrame | ArpEthernetFrame): frame is ArpEthernetFrame {
  return frame.etherType === 0x0806;
}

/** Narrows an L3 payload to a port-bearing segment (TCP or UDP). */
export function isPortBearingPayload(
  payload: IpPacket['payload'],
): payload is TcpSegment | UdpDatagram {
  return 'srcPort' in payload && 'dstPort' in payload;
}
