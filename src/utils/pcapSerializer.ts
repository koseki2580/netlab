import type { ArpEthernetFrame, EthernetFrame } from '../types/packets';
import type { PacketHop } from '../types/simulation';
import { DEFAULT_ETHERNET_PREAMBLE } from './packetLayout';
import { serializeArpFrame, serializePacket } from './packetSerializer';

export interface PcapRecord {
  hop: PacketHop;
  frame: EthernetFrame | ArpEthernetFrame;
}

function uint16LE(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32LE(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined;
}

function buildPcapGlobalHeader(): Uint8Array {
  return concatUint8Arrays([
    uint32LE(0xa1b2c3d4),
    uint16LE(2),
    uint16LE(4),
    uint32LE(0),
    uint32LE(0),
    uint32LE(65535),
    uint32LE(1),
  ]);
}

function buildPcapRecordHeader(timestampMs: number, step: number, byteLength: number): Uint8Array {
  const baseSeconds = Math.floor(timestampMs / 1000);
  const totalMicros = (timestampMs % 1000) * 1000 + step * 1000;
  const tsSec = baseSeconds + Math.floor(totalMicros / 1_000_000);
  const tsUsec = totalMicros % 1_000_000;

  return concatUint8Arrays([
    uint32LE(tsSec),
    uint32LE(tsUsec),
    uint32LE(byteLength),
    uint32LE(byteLength),
  ]);
}

function isArpFrame(frame: EthernetFrame | ArpEthernetFrame): frame is ArpEthernetFrame {
  return frame.etherType === 0x0806;
}

export function serializePcapFrame(frame: EthernetFrame | ArpEthernetFrame): Uint8Array {
  if (isArpFrame(frame)) {
    const { bytes } = serializeArpFrame(frame);
    return bytes.slice(0, bytes.length - 4);
  }

  const { bytes } = serializePacket(frame);
  const preambleLength = frame.preamble?.length ?? DEFAULT_ETHERNET_PREAMBLE.length;
  return bytes.slice(preambleLength, bytes.length - 4);
}

export function buildPcap(records: PcapRecord[]): Uint8Array {
  const chunks: Uint8Array[] = [buildPcapGlobalHeader()];

  for (const { hop, frame } of records) {
    const packetBytes = serializePcapFrame(frame);
    chunks.push(buildPcapRecordHeader(hop.timestamp, hop.step, packetBytes.length), packetBytes);
  }

  return concatUint8Arrays(chunks);
}
