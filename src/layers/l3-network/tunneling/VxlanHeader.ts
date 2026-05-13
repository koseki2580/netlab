import type { VxlanHeader } from '../../../types/tunneling';

export function serializeVxlanHeader(header: VxlanHeader): Uint8Array {
  if (!Number.isInteger(header.vni) || header.vni < 0 || header.vni > 0xffffff) {
    throw new RangeError(`VNI must be a 24-bit integer, got ${header.vni}`);
  }
  return new Uint8Array([
    0x08,
    0,
    0,
    0,
    (header.vni >>> 16) & 0xff,
    (header.vni >>> 8) & 0xff,
    header.vni & 0xff,
    0,
  ]);
}

export function parseVxlanHeader(bytes: Uint8Array): VxlanHeader {
  if (bytes.length < 8) throw new RangeError('VXLAN header requires 8 bytes');
  if ((bytes[0]! & 0x08) === 0) throw new RangeError('VXLAN I flag must be set');
  return { vni: (bytes[4]! << 16) | (bytes[5]! << 8) | bytes[6]! };
}
