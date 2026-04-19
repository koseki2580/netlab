import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../SimulationEngine';
import type { EthernetFrame, InFlightPacket } from '../../types/packets';
import type { RouteEntry } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';

export const CLIENT_MAC = '02:00:00:00:00:10';
export const SERVER_MAC = '02:00:00:00:00:20';
export const SERVER_TWO_MAC = '02:00:00:00:00:21';

export function makeIpFrame(
  srcIp: string,
  dstIp: string,
  ttl = 64,
  srcPort = 12345,
  dstPort = 80,
): EthernetFrame {
  return {
    layer: 'L2',
    srcMac: '00:00:00:00:00:01',
    dstMac: '00:00:00:00:00:02',
    etherType: 0x0800,
    payload: {
      layer: 'L3',
      srcIp,
      dstIp,
      ttl,
      protocol: 6,
      payload: {
        layer: 'L4',
        srcPort,
        dstPort,
        seq: 0,
        ack: 0,
        flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
        payload: { layer: 'raw', data: '' },
      },
    },
  };
}

export function makePacket(
  id: string,
  srcNodeId: string,
  dstNodeId: string,
  srcIp: string,
  dstIp: string,
  ttl = 64,
  srcPort = 12345,
  dstPort = 80,
): InFlightPacket {
  return {
    id,
    srcNodeId,
    dstNodeId,
    frame: makeIpFrame(srcIp, dstIp, ttl, srcPort, dstPort),
    currentDeviceId: srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

export function makeRouteEntry(nodeId: string, destination: string, nextHop: string): RouteEntry {
  return {
    destination,
    nextHop,
    metric: 0,
    protocol: 'static',
    adminDistance: 1,
    nodeId,
  };
}

export function deriveDeterministicMac(nodeId: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < nodeId.length; i++) {
    hash ^= nodeId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash >>>= 0;

  return [
    0x02,
    (hash >>> 24) & 0xff,
    (hash >>> 16) & 0xff,
    (hash >>> 8) & 0xff,
    hash & 0xff,
    nodeId.length & 0xff,
  ]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(':');
}

export function readUint32LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

export function countPcapRecords(bytes: Uint8Array): number {
  let count = 0;
  let offset = 24;

  while (offset < bytes.length) {
    const recordLength = readUint32LE(bytes, offset + 8);
    offset += 16 + recordLength;
    count++;
  }

  return count;
}

export function pcapRecordBytes(bytes: Uint8Array, index: number): Uint8Array {
  let offset = 24;

  for (let recordIndex = 0; recordIndex < index; recordIndex++) {
    offset += 16 + readUint32LE(bytes, offset + 8);
  }

  const recordLength = readUint32LE(bytes, offset + 8);
  return bytes.slice(offset + 16, offset + 16 + recordLength);
}

export function makeEngine(topology: NetworkTopology): SimulationEngine {
  return new SimulationEngine(topology, new HookEngine());
}

export async function packetAtStep(
  engine: SimulationEngine,
  packet: InFlightPacket,
  step: number,
): Promise<InFlightPacket> {
  await engine.send(packet);
  engine.selectHop(step);
  const selectedPacket = engine.getState().selectedPacket;

  if (!selectedPacket) {
    throw new Error(`No packet snapshot available for step ${step}`);
  }

  return selectedPacket;
}
