/** Value rules shared by `defineProtocol` (examples) and the derivers (header values). */
import { isIpv6Address, parseIpv6 } from '../../utils/ipv6';
import type { FieldValue, HeaderValues, WireField } from './types';

const IMPLIED_BITS: Partial<Record<WireField['type'], number>> = {
  flag: 1,
  ipv4: 32,
  ipv6: 128,
  mac: 48,
};

/** Fixed width in bits, or `undefined` for a variable-length field. */
export function fieldBits(field: WireField): number | undefined {
  if (field.type === 'domain-name' || field.lengthFrom !== undefined) return undefined;
  return IMPLIED_BITS[field.type] ?? field.bits;
}

export function isNumeric(field: WireField): boolean {
  return (
    field.type === 'uint' ||
    field.type === 'enum' ||
    field.type === 'reserved' ||
    field.type === 'flag'
  );
}

/** Why a value does not fit: the error names the rule and the field (REQ-310). */
const BAD = 'out of range';

/** A value ready for the bit writer: a number of `bits` width, or whole bytes. */
export type Encoded =
  | { readonly number: number; readonly bits: number }
  | { readonly bytes: readonly number[] };

/** Encodes a value, or returns why it does not fit the field. */
export function encodeValue(field: WireField, value: FieldValue): Encoded | string {
  if (isNumeric(field)) {
    const bits = fieldBits(field) ?? 0;
    const n = typeof value === 'boolean' ? Number(value) : value;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n >= 2 ** bits) {
      return BAD;
    }
    return { number: n, bits };
  }
  switch (field.type) {
    case 'ipv4':
      return typeof value === 'string' && /^\d{1,3}(\.\d{1,3}){3}$/.test(value)
        ? checkBytes(value.split('.').map(Number), 4)
        : BAD;
    case 'mac':
      return typeof value === 'string' && /^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(value)
        ? { bytes: value.split(':').map((part) => Number.parseInt(part, 16)) }
        : BAD;
    case 'ipv6':
      return typeof value === 'string' && isIpv6Address(value)
        ? { bytes: parseIpv6(value).hextets.flatMap((h) => [h >> 8, h & 0xff]) }
        : BAD;
    case 'domain-name':
      return typeof value === 'string' ? encodeDomainName(value) : BAD;
    default: {
      const width = fieldBits(field);
      return Array.isArray(value)
        ? checkBytes(value as readonly number[], width === undefined ? undefined : width / 8)
        : BAD;
    }
  }
}

function checkBytes(bytes: readonly number[], length: number | undefined): Encoded | string {
  if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) return BAD;
  if (length !== undefined && bytes.length !== length) return BAD;
  return { bytes };
}

/** RFC 1035 §3.1: length-prefixed labels (≤ 63 octets), a zero byte, ≤ 255 octets in all. */
function encodeDomainName(name: string): Encoded | string {
  const trimmed = name.endsWith('.') ? name.slice(0, -1) : name;
  const bytes: number[] = [];
  if (trimmed !== '') {
    for (const label of trimmed.split('.')) {
      const octets = Array.from(new TextEncoder().encode(label));
      if (octets.length === 0 || octets.length > 63) {
        return BAD;
      }
      bytes.push(octets.length, ...octets);
    }
  }
  bytes.push(0);
  return bytes.length > 255 ? BAD : { bytes };
}

function hex(n: number, digits: number): string {
  return `0x${n.toString(16).toUpperCase().padStart(digits, '0')}`;
}

/** The field-view display value (REQ-102). */
export function displayValue(field: WireField, value: FieldValue, siblings: HeaderValues): string {
  if (field.format) return field.format(value, siblings);
  if (isNumeric(field)) {
    const n = Number(value);
    const shown = field.hex ? hex(n, Math.ceil((fieldBits(field) ?? 4) / 4)) : String(n);
    const named = field.values?.find((v) => v.value === n);
    return named ? `${shown} (${named.name})` : shown;
  }
  if (Array.isArray(value)) {
    return `0x${(value as readonly number[]).map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join('')}`;
  }
  return String(value);
}
