import type { InFlightPacket, IpPacket } from '../types/packets';

export interface FlowKey {
  readonly srcIp: string;
  readonly dstIp: string;
  readonly protocol: number;
  readonly srcPort?: number;
  readonly dstPort?: number;
}

const PRIME32_1 = 0x9e3779b1;
const PRIME32_2 = 0x85ebca77;
const PRIME32_3 = 0xc2b2ae3d;
const PRIME32_4 = 0x27d4eb2f;
const PRIME32_5 = 0x165667b1;

function rotl32(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>>
    0
  );
}

function round(accumulator: number, input: number): number {
  let acc = (accumulator + Math.imul(input, PRIME32_2)) >>> 0;
  acc = rotl32(acc, 13);
  return Math.imul(acc, PRIME32_1) >>> 0;
}

function mergeRound(accumulator: number, value: number): number {
  let acc = (accumulator ^ round(0, value)) >>> 0;
  acc = (Math.imul(acc, PRIME32_1) + PRIME32_4) >>> 0;
  return acc;
}

function xxh32(bytes: Uint8Array, seed: number): number {
  let offset = 0;
  let hash: number;

  if (bytes.length >= 16) {
    let v1 = (seed + PRIME32_1 + PRIME32_2) >>> 0;
    let v2 = (seed + PRIME32_2) >>> 0;
    let v3 = seed >>> 0;
    let v4 = (seed - PRIME32_1) >>> 0;
    const limit = bytes.length - 16;

    while (offset <= limit) {
      v1 = round(v1, readU32LE(bytes, offset));
      offset += 4;
      v2 = round(v2, readU32LE(bytes, offset));
      offset += 4;
      v3 = round(v3, readU32LE(bytes, offset));
      offset += 4;
      v4 = round(v4, readU32LE(bytes, offset));
      offset += 4;
    }

    hash = (rotl32(v1, 1) + rotl32(v2, 7) + rotl32(v3, 12) + rotl32(v4, 18)) >>> 0;
    hash = mergeRound(hash, v1);
    hash = mergeRound(hash, v2);
    hash = mergeRound(hash, v3);
    hash = mergeRound(hash, v4);
  } else {
    hash = (seed + PRIME32_5) >>> 0;
  }

  hash = (hash + bytes.length) >>> 0;

  while (offset <= bytes.length - 4) {
    hash = (hash + Math.imul(readU32LE(bytes, offset), PRIME32_3)) >>> 0;
    hash = Math.imul(rotl32(hash, 17), PRIME32_4) >>> 0;
    offset += 4;
  }

  while (offset < bytes.length) {
    hash = (hash + Math.imul(bytes[offset] ?? 0, PRIME32_5)) >>> 0;
    hash = Math.imul(rotl32(hash, 11), PRIME32_1) >>> 0;
    offset += 1;
  }

  hash ^= hash >>> 15;
  hash = Math.imul(hash, PRIME32_2) >>> 0;
  hash ^= hash >>> 13;
  hash = Math.imul(hash, PRIME32_3) >>> 0;
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export function serializeFlowKey(flow: FlowKey): string {
  return [
    flow.srcIp,
    flow.dstIp,
    String(flow.protocol),
    flow.srcPort === undefined ? '-' : String(flow.srcPort),
    flow.dstPort === undefined ? '-' : String(flow.dstPort),
  ].join('|');
}

export function hashString32(value: string, seed = 0): number {
  return xxh32(new TextEncoder().encode(value), seed >>> 0);
}

export function hashFlow(flow: FlowKey, seed = 0): number {
  return hashString32(serializeFlowKey(flow), seed);
}

export function bucketFlow(flow: FlowKey, bucketCount: number, seed = 0): number {
  if (!Number.isInteger(bucketCount) || bucketCount <= 0) {
    throw new RangeError('bucketCount must be a positive integer');
  }
  return hashFlow(flow, seed) % bucketCount;
}

export function flowKeyFromIpPacket(packet: IpPacket): FlowKey {
  const transport = packet.payload;
  return {
    srcIp: packet.srcIp,
    dstIp: packet.dstIp,
    protocol: packet.protocol,
    ...('srcPort' in transport ? { srcPort: transport.srcPort } : {}),
    ...('dstPort' in transport ? { dstPort: transport.dstPort } : {}),
  };
}

export function flowKeyFromPacket(packet: InFlightPacket): FlowKey {
  return flowKeyFromIpPacket(packet.frame.payload);
}
