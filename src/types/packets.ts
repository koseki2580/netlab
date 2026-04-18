// Packet encapsulation chain: HTTP (L7) inside TCP (L4) inside IP (L3) inside Ethernet (L2)

export interface TcpFlags {
  syn: boolean;
  ack: boolean;
  fin: boolean;
  rst: boolean;
  psh: boolean;
  urg: boolean;
}

export interface RawPayload {
  layer: "raw";
  data: string;
}

export interface HttpMessage {
  layer: "L7";
  httpVersion: "HTTP/1.1";
  method?: "GET" | "POST" | "PUT" | "DELETE" | "HEAD";
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
  layer: "L7";
  messageType: "DISCOVER" | "OFFER" | "REQUEST" | "ACK" | "NAK";
  transactionId: number;
  clientMac: string;
  offeredIp?: string;
  serverIp?: string;
  options: DhcpOptions;
}

export interface DnsQuestion {
  name: string;
  type: "A";
}

export interface DnsRecord {
  name: string;
  type: "A";
  ttl: number;
  address: string;
}

export interface DnsMessage {
  layer: "L7";
  transactionId: number;
  isResponse: boolean;
  questions: DnsQuestion[];
  answers: DnsRecord[];
}

export interface TcpSegment {
  layer: "L4";
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
  layer: "L4";
  srcPort: number;
  dstPort: number;
  length?: number;
  checksum?: number;
  payload: RawPayload | DhcpMessage | DnsMessage;
}

export interface IcmpMessage {
  layer: "L4";
  type: number;
  code: number;
  checksum: number;
  identifier?: number;
  sequenceNumber?: number;
  data?: string;
}

export interface IgmpMessage {
  layer: "L4";
  igmpType: "v2-membership-query" | "v2-membership-report" | "v2-leave-group";
  groupAddress: string;
  maxResponseTime?: number;
  checksum?: number;
}

export interface IgmpMessage {
  layer: "L4";
  igmpType: "v2-membership-query" | "v2-membership-report" | "v2-leave-group";
  groupAddress: string;
  maxResponseTime?: number;
  checksum?: number;
}

export interface IpPacket {
  layer: "L3";
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
  layer: "L2";
  preamble?: number[];
  srcMac: string;
  dstMac: string;
  etherType: number; // 0x0800 = IPv4
  vlanTag?: VlanTag;
  payload: IpPacket;
  fcs?: number;
}

export interface ArpPacket {
  layer: "ARP";
  hardwareType: 1;
  protocolType: 0x0800;
  operation: "request" | "reply";
  senderMac: string;
  senderIp: string;
  targetMac: string;
  targetIp: string;
}

export interface ArpEthernetFrame {
  layer: "L2";
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
