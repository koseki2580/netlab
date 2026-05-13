import { canonicalizeIpv6, parseIpv6 } from '../../utils/ipv6';
import { getRequired } from '../../utils/typedAccess';

export interface MpReachNlri {
  readonly afi: 2;
  readonly safi: 1;
  readonly nextHop: string;
  readonly linkLocalNextHop?: string;
  readonly nlri: readonly { length: number; prefix: string }[];
}

function ipv6ToBytes(address: string): number[] {
  return parseIpv6(address).hextets.flatMap((hextet) => [(hextet >> 8) & 0xff, hextet & 0xff]);
}

function bytesToIpv6(bytes: readonly number[]): string {
  const padded = [...bytes, ...Array.from({ length: Math.max(0, 16 - bytes.length) }, () => 0)];
  const hextets: number[] = [];
  for (let index = 0; index < 16; index += 2) {
    hextets.push(((padded[index] ?? 0) << 8) | (padded[index + 1] ?? 0));
  }
  return canonicalizeIpv6(hextets.map((part) => part.toString(16)).join(':'));
}

export function encodeMpReachNlri(value: MpReachNlri): Uint8Array {
  const nextHopBytes = ipv6ToBytes(value.nextHop);
  const nlriBytes = value.nlri.flatMap((prefix) => {
    const byteLength = Math.ceil(prefix.length / 8);
    return [prefix.length, ...ipv6ToBytes(prefix.prefix).slice(0, byteLength)];
  });
  return Uint8Array.from([
    0,
    value.afi,
    value.safi,
    nextHopBytes.length,
    ...nextHopBytes,
    0,
    ...nlriBytes,
  ]);
}

export function decodeMpReachNlri(bytes: Uint8Array): MpReachNlri {
  const afi = ((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0);
  const safi = bytes[2] ?? 0;
  const nextHopLength = bytes[3] ?? 0;
  if (afi !== 2 || safi !== 1 || nextHopLength !== 16) {
    throw new RangeError(
      `Unsupported MP_REACH_NLRI AFI/SAFI/next-hop length: ${afi}/${safi}/${nextHopLength}`,
    );
  }

  const nextHop = bytesToIpv6(Array.from(bytes.slice(4, 20)));
  const nlri: { length: number; prefix: string }[] = [];
  let offset = 21;
  while (offset < bytes.length) {
    const length = getRequired(bytes, offset, { field: 'nlri.length' });
    offset += 1;
    const byteLength = Math.ceil(length / 8);
    const prefixBytes = Array.from(bytes.slice(offset, offset + byteLength));
    offset += byteLength;
    nlri.push({ length, prefix: bytesToIpv6(prefixBytes) });
  }

  return { afi: 2, safi: 1, nextHop, nlri };
}
