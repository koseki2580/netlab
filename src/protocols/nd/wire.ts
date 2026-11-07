/**
 * Neighbour Discovery, the wire tier. RFC 4861 §4.1–4.4 (RS, RA, NS, NA) and §4.6
 * options, whose Length counts 8-octet units including the type and length bytes.
 * The pack claims ICMPv6 types 133–136; ICMPv6 itself stays the ICMPv6 pack's.
 */
import type { EnumValue, FieldValue, HeaderValues, ProtocolWire, WireField } from '../pack/types';
import { parseIpv6, canonicalizeIpv6 } from '../../utils/ipv6';
import { ndIdentity } from './identity';

const RS = [133];
const RA = [134];
const NS = [135];
const NA = [136];
const when = (values: number[]) => ({ field: 'type', values });
const flag = (key: string, name: string, values: number[]): WireField => ({
  key,
  name,
  type: 'flag',
  when: when(values),
});

const ND_TYPES: readonly EnumValue[] = [
  { value: 133, name: 'Router Solicitation' },
  { value: 134, name: 'Router Advertisement' },
  { value: 135, name: 'Neighbor Solicitation' },
  { value: 136, name: 'Neighbor Advertisement' },
];

const hex = (bytes: readonly number[]) =>
  bytes.map((b) => b.toString(16).padStart(2, '0')).join(':');

/** Option data, shown by option type (RFC 4861 §4.6). */
function formatOption(value: FieldValue, siblings: HeaderValues): string {
  const bytes = value as readonly number[];
  if (siblings['type'] === 1 || siblings['type'] === 2) return hex(bytes);
  if (siblings['type'] === 3 && bytes.length === 30) {
    const prefix = canonicalizeIpv6(
      Array.from({ length: 8 }, (_, i) =>
        ((bytes[14 + 2 * i]! << 8) | bytes[15 + 2 * i]!).toString(16),
      ).join(':'),
    );
    const flags = [bytes[1]! & 0x80 ? 'L' : '', bytes[1]! & 0x40 ? 'A' : ''].filter(Boolean);
    const valid = ((bytes[2]! << 24) | (bytes[3]! << 16) | (bytes[4]! << 8) | bytes[5]!) >>> 0;
    return `${prefix}/${bytes[0]} (${flags.join(', ') || '-'}), valid ${valid} s`;
  }
  if (siblings['type'] === 5 && bytes.length === 6) {
    return `MTU ${((bytes[2]! << 24) | (bytes[3]! << 16) | (bytes[4]! << 8) | bytes[5]!) >>> 0}`;
  }
  return `0x${bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

export const ndWire: ProtocolWire = {
  ...ndIdentity,
  defaultVersion: 'rfc4861',
  versions: [{ id: 'rfc4861' }],
  label: { field: 'type' },
  header: [
    { key: 'type', name: 'Type', type: 'enum', bits: 8, values: ND_TYPES },
    { key: 'code', name: 'Code', type: 'uint', bits: 8 },
    { key: 'checksum', name: 'Checksum', type: 'uint', bits: 16, hex: true },
    { key: 'rsReserved', name: 'Reserved', type: 'reserved', bits: 32, when: when(RS) },
    { key: 'curHopLimit', name: 'Cur Hop Limit', type: 'uint', bits: 8, when: when(RA) },
    flag('managed', 'Managed (M)', RA),
    flag('other', 'Other Configuration (O)', RA),
    { key: 'raReserved', name: 'Reserved', type: 'reserved', bits: 6, when: when(RA) },
    { key: 'routerLifetime', name: 'Router Lifetime', type: 'uint', bits: 16, when: when(RA) },
    { key: 'reachableTime', name: 'Reachable Time', type: 'uint', bits: 32, when: when(RA) },
    { key: 'retransTimer', name: 'Retrans Timer', type: 'uint', bits: 32, when: when(RA) },
    { key: 'nsReserved', name: 'Reserved', type: 'reserved', bits: 32, when: when(NS) },
    flag('router', 'Router (R)', NA),
    flag('solicited', 'Solicited (S)', NA),
    flag('override', 'Override (O)', NA),
    { key: 'naReserved', name: 'Reserved', type: 'reserved', bits: 29, when: when(NA) },
    { key: 'target', name: 'Target Address', type: 'ipv6', when: when([135, 136]) },
  ],
  sections: [
    {
      key: 'options',
      name: 'Options',
      fields: [
        {
          key: 'optionType',
          name: 'Option Type',
          type: 'enum',
          bits: 8,
          values: [
            { value: 1, name: 'Source Link-Layer Address' },
            { value: 2, name: 'Target Link-Layer Address' },
            { value: 3, name: 'Prefix Information' },
            { value: 4, name: 'Redirected Header' },
            { value: 5, name: 'MTU' },
          ],
        },
        { key: 'optionLength', name: 'Option Length', type: 'uint', bits: 8 },
        {
          key: 'optionData',
          name: 'Option Data',
          type: 'bytes',
          lengthFrom: 'optionLength',
          lengthScale: 8,
          lengthOffset: -2,
          format: (value, siblings) => formatOption(value, { type: siblings['optionType'] }),
        },
      ],
    },
  ],
};

const mac = (address: string) => address.split(':').map((part) => Number.parseInt(part, 16));
const linkLayer = (optionType: number, address: string) => ({
  optionType,
  optionLength: 1,
  optionData: mac(address),
});

/** A prefix-information option: /64, on-link and autonomous, RFC 4861 default lifetimes. */
function prefixOption(prefix: string) {
  const [address = '::', length = '64'] = prefix.split('/');
  const words = parseIpv6(address).hextets.flatMap((h) => [h >> 8, h & 0xff]);
  const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
  return {
    optionType: 3,
    optionLength: 4,
    optionData: [Number(length), 0xc0, ...u32(2_592_000), ...u32(604_800), 0, 0, 0, 0, ...words],
  };
}

/** What an ND message the engine builds carries (REQ-324), as a header object. */
export interface NdMessage {
  readonly type: number;
  readonly code: number;
  readonly targetAddress?: string;
  readonly sourceMac?: string;
  readonly targetMac?: string;
  readonly prefix?: string;
  readonly managed?: boolean;
  readonly otherConfig?: boolean;
  readonly router?: boolean;
  readonly solicited?: boolean;
  readonly override?: boolean;
  /** The engine's `NdpMessage` (src/simulation/icmpv6.ts): NA flags and link-layer options. */
  readonly flags?: {
    readonly router: boolean;
    readonly solicited: boolean;
    readonly override: boolean;
  };
  readonly options?: readonly { readonly type: number; readonly linkLayerAddress: string }[];
}

export function ndToValues(message: NdMessage, checksum: number): HeaderValues {
  const flags = message.flags ?? message;
  const options = [
    ...(message.options ?? []).map((option) => linkLayer(option.type, option.linkLayerAddress)),
    ...(message.sourceMac && message.type !== 136 ? [linkLayer(1, message.sourceMac)] : []),
    ...(message.targetMac && message.type === 136 ? [linkLayer(2, message.targetMac)] : []),
    ...(message.prefix && message.type === 134 ? [prefixOption(message.prefix)] : []),
  ];
  return {
    type: message.type,
    code: message.code,
    checksum,
    curHopLimit: 64,
    managed: message.managed ? 1 : 0,
    other: message.otherConfig ? 1 : 0,
    routerLifetime: 1800,
    reachableTime: 0,
    retransTimer: 0,
    router: flags.router ? 1 : 0,
    solicited: flags.solicited === false ? 0 : 1,
    override: flags.override === false ? 0 : 1,
    ...(message.targetAddress ? { target: message.targetAddress } : {}),
    options,
  };
}
