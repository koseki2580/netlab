import type { GreHeader } from '../../../types/tunneling';

export function serializeGreHeader(
  input: Pick<GreHeader, 'protocolType'> & Partial<GreHeader>,
): Uint8Array {
  const hasKey = input.key !== undefined || input.hasKey === true;
  const hasSequence = input.sequence !== undefined || input.hasSequence === true;
  const hasChecksum = input.checksum !== undefined || input.hasChecksum === true;
  const bytes = new Uint8Array(
    4 + (hasChecksum ? 4 : 0) + (hasKey ? 4 : 0) + (hasSequence ? 4 : 0),
  );
  bytes[0] = (hasChecksum ? 0x80 : 0) | (hasKey ? 0x20 : 0) | (hasSequence ? 0x10 : 0);
  bytes[1] = 0;
  bytes[2] = (input.protocolType >> 8) & 0xff;
  bytes[3] = input.protocolType & 0xff;
  let offset = 4;
  if (hasChecksum) {
    const checksum = input.checksum ?? 0;
    bytes[offset] = (checksum >> 8) & 0xff;
    bytes[offset + 1] = checksum & 0xff;
    offset += 4;
  }
  if (hasKey) {
    writeU32(bytes, offset, input.key ?? 0);
    offset += 4;
  }
  if (hasSequence) {
    writeU32(bytes, offset, input.sequence ?? 0);
  }
  return bytes;
}

export function parseGreHeader(bytes: Uint8Array): { header: GreHeader; consumed: number } {
  if (bytes.length < 4) throw new RangeError('GRE header requires at least 4 bytes');
  const flags = bytes[0]!;
  const hasChecksum = (flags & 0x80) !== 0;
  const hasKey = (flags & 0x20) !== 0;
  const hasSequence = (flags & 0x10) !== 0;
  const version = bytes[1]! & 0x07;
  if (version !== 0) throw new RangeError(`unsupported GRE version ${version}`);
  const protocolType = ((bytes[2]! << 8) | bytes[3]!) as 0x0800 | 0x86dd;
  let offset = 4;
  const optional: { checksum?: number; key?: number; sequence?: number } = {};
  if (hasChecksum) {
    optional.checksum = (bytes[offset]! << 8) | bytes[offset + 1]!;
    offset += 4;
  }
  if (hasKey) {
    optional.key = readU32(bytes, offset);
    offset += 4;
  }
  if (hasSequence) {
    optional.sequence = readU32(bytes, offset);
    offset += 4;
  }
  return {
    header: {
      hasChecksum,
      hasKey,
      hasSequence,
      version: 0,
      protocolType,
      ...optional,
    },
    consumed: offset,
  };
}

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>>
    0
  );
}
