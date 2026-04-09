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
  layer: 'raw';
  data: string;
}

export interface HttpMessage {
  layer: 'L7';
  method?: string;
  url?: string;
  statusCode?: number;
  headers: Record<string, string>;
  body?: string;
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
  payload: RawPayload;
}

export interface IpPacket {
  layer: 'L3';
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
  protocol: number;  // 6 = TCP, 17 = UDP
  headerChecksum?: number;
  payload: TcpSegment | UdpDatagram;
}

export interface EthernetFrame {
  layer: 'L2';
  preamble?: number[];
  srcMac: string;
  dstMac: string;
  etherType: number;  // 0x0800 = IPv4
  payload: IpPacket;
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
  payload: ArpPacket;
  fcs?: number;
}

export type Packet = EthernetFrame;

export interface InFlightPacket {
  id: string;
  srcNodeId: string;    // origin node ID
  dstNodeId: string;    // destination node ID
  frame: EthernetFrame;
  currentDeviceId: string;
  ingressPortId: string;
  egressPortId?: string;
  path: string[];       // ordered list of device IDs already visited
  timestamp: number;
  sessionId?: string;
}
