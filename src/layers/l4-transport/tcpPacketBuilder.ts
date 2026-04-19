import type { InFlightPacket, TcpFlags } from '../../types/packets';

export interface TcpPacketOptions {
  srcNodeId: string;
  dstNodeId: string;
  srcIp: string;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  seq: number;
  ack: number;
  ttl?: number;
  sessionId?: string;
}

function hashString(input: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function makePacketId(prefix: string, options: TcpPacketOptions): string {
  return `${prefix}-${hashString(
    [
      options.srcNodeId,
      options.dstNodeId,
      String(options.srcPort),
      String(options.dstPort),
      String(options.seq),
      String(options.ack),
      options.sessionId ?? '',
    ].join(':'),
  ).toString(16)}`;
}

function buildTcpPacket(
  prefix: string,
  options: TcpPacketOptions,
  flags: TcpFlags,
  ackOverride: number = options.ack,
): InFlightPacket {
  return {
    id: makePacketId(prefix, options),
    srcNodeId: options.srcNodeId,
    dstNodeId: options.dstNodeId,
    currentDeviceId: options.srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
    sessionId: options.sessionId,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:00',
      dstMac: '00:00:00:00:00:00',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: options.srcIp,
        dstIp: options.dstIp,
        ttl: options.ttl ?? 64,
        protocol: 6,
        flags: { df: true, mf: false },
        payload: {
          layer: 'L4',
          srcPort: options.srcPort,
          dstPort: options.dstPort,
          seq: options.seq,
          ack: ackOverride,
          flags,
          payload: {
            layer: 'raw',
            data: '',
          },
        },
      },
    },
  };
}

export function buildSynPacket(options: TcpPacketOptions): InFlightPacket {
  return buildTcpPacket(
    'tcp-syn',
    options,
    { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
    0,
  );
}

export function buildSynAckPacket(options: TcpPacketOptions): InFlightPacket {
  return buildTcpPacket('tcp-syn-ack', options, {
    syn: true,
    ack: true,
    fin: false,
    rst: false,
    psh: false,
    urg: false,
  });
}

export function buildAckPacket(options: TcpPacketOptions): InFlightPacket {
  return buildTcpPacket('tcp-ack', options, {
    syn: false,
    ack: true,
    fin: false,
    rst: false,
    psh: false,
    urg: false,
  });
}

export function buildFinPacket(options: TcpPacketOptions): InFlightPacket {
  return buildTcpPacket('tcp-fin', options, {
    syn: false,
    ack: true,
    fin: true,
    rst: false,
    psh: false,
    urg: false,
  });
}

export function buildRstPacket(options: TcpPacketOptions): InFlightPacket {
  return buildTcpPacket('tcp-rst', options, {
    syn: false,
    ack: false,
    fin: false,
    rst: true,
    psh: false,
    urg: false,
  });
}

export function generateISN(nodeId: string, port: number): number {
  return hashString(`${nodeId}:${port}`);
}
