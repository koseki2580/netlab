import { canonicalizeIpv6, parseIpv6 } from '../utils/ipv6';

export const ICMPV6_TYPE = {
  DESTINATION_UNREACHABLE: 1,
  PACKET_TOO_BIG: 2,
  TIME_EXCEEDED: 3,
  ECHO_REQUEST: 128,
  ECHO_REPLY: 129,
  NEIGHBOR_SOLICITATION: 135,
  NEIGHBOR_ADVERTISEMENT: 136,
  ROUTER_ADVERTISEMENT: 134,
} as const;

export const ICMPV6_CODE = {
  NO_ROUTE: 0,
  HOP_LIMIT_EXCEEDED: 0,
} as const;

export type Icmpv6Type = (typeof ICMPV6_TYPE)[keyof typeof ICMPV6_TYPE];
export type Icmpv6Code = (typeof ICMPV6_CODE)[keyof typeof ICMPV6_CODE];

export interface Icmpv6Message {
  layer: 'L4';
  type: Icmpv6Type;
  code: number;
  checksum: number;
  identifier?: number;
  sequenceNumber?: number;
  data?: string;
  targetAddress?: string;
  sourceMac?: string;
  targetMac?: string;
  prefix?: string;
  managed?: boolean;
  otherConfig?: boolean;
}

/** An NDP option (RFC 4861 §4.6.1): Source (1) or Target (2) Link-Layer Address. */
export interface NdpLinkLayerOption {
  readonly type: 1 | 2;
  readonly linkLayerAddress: string;
}

/**
 * A Neighbor Solicitation (RFC 4861 §4.3, type 135) or Advertisement (§4.4,
 * type 136) as on the wire. `flags` is the NA's R, S and O bits.
 */
export interface NdpMessage {
  readonly layer: 'L4';
  readonly type: 135 | 136;
  readonly code: 0;
  readonly checksum: number;
  readonly targetAddress: string;
  readonly flags?: {
    readonly router: boolean;
    readonly solicited: boolean;
    readonly override: boolean;
  };
  readonly options: readonly NdpLinkLayerOption[];
}

/** ff02::1:ff00:0/104 plus the address's last 24 bits (RFC 4291 §2.7.1). */
export function solicitedNodeAddress(address: string): string {
  const [, , , , , , seventh = 0, last = 0] = parseIpv6(address).hextets;
  return canonicalizeIpv6(
    `ff02::1:${(0xff00 | (seventh & 0xff)).toString(16)}:${last.toString(16)}`,
  );
}

/** 33:33 plus the last 32 bits of the solicited-node address (RFC 2464 §7). */
export function solicitedNodeMac(address: string): string {
  const [, , , , , , seventh = 0, last = 0] = parseIpv6(solicitedNodeAddress(address)).hextets;
  const bytes = [0x33, 0x33, seventh >> 8, seventh & 0xff, last >> 8, last & 0xff];
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(':');
}

export interface RouterAdvertisementResult {
  mode: 'dhcpv6-address' | 'slaac-with-dhcpv6-other' | 'slaac-only';
  needsDhcpv6Address: boolean;
  needsDhcpv6OtherConfig: boolean;
  slaacAddress?: string;
}

export function buildIcmpv6EchoRequest(options: {
  identifier: number;
  sequenceNumber: number;
  data?: string;
}): Icmpv6Message {
  return {
    layer: 'L4',
    type: ICMPV6_TYPE.ECHO_REQUEST,
    code: 0,
    checksum: 0,
    identifier: options.identifier,
    sequenceNumber: options.sequenceNumber,
    ...(options.data !== undefined ? { data: options.data } : {}),
  };
}

export function buildIcmpv6EchoReply(request: Icmpv6Message): Icmpv6Message {
  return {
    layer: 'L4',
    type: ICMPV6_TYPE.ECHO_REPLY,
    code: 0,
    checksum: 0,
    ...(request.identifier !== undefined ? { identifier: request.identifier } : {}),
    ...(request.sequenceNumber !== undefined ? { sequenceNumber: request.sequenceNumber } : {}),
    ...(request.data !== undefined ? { data: request.data } : {}),
  };
}

export function buildNeighborSolicitation(
  targetAddress: string,
  sourceMac?: string,
): Icmpv6Message {
  return {
    layer: 'L4',
    type: ICMPV6_TYPE.NEIGHBOR_SOLICITATION,
    code: 0,
    checksum: 0,
    targetAddress: canonicalizeIpv6(targetAddress),
    ...(sourceMac !== undefined ? { sourceMac } : {}),
  };
}

export function buildNeighborAdvertisement(
  targetAddress: string,
  targetMac: string,
): Icmpv6Message {
  return {
    layer: 'L4',
    type: ICMPV6_TYPE.NEIGHBOR_ADVERTISEMENT,
    code: 0,
    checksum: 0,
    targetAddress: canonicalizeIpv6(targetAddress),
    targetMac,
  };
}

export function buildRouterAdvertisement(options: {
  prefix: string;
  managed: boolean;
  otherConfig: boolean;
}): Icmpv6Message {
  return {
    layer: 'L4',
    type: ICMPV6_TYPE.ROUTER_ADVERTISEMENT,
    code: 0,
    checksum: 0,
    prefix: options.prefix,
    managed: options.managed,
    otherConfig: options.otherConfig,
  };
}

export function applyRouterAdvertisement(
  advertisement: Icmpv6Message,
  macAddress: string,
): RouterAdvertisementResult {
  if (advertisement.type !== ICMPV6_TYPE.ROUTER_ADVERTISEMENT || !advertisement.prefix) {
    throw new RangeError('Expected ICMPv6 Router Advertisement with a prefix');
  }

  if (advertisement.managed) {
    return {
      mode: 'dhcpv6-address',
      needsDhcpv6Address: true,
      needsDhcpv6OtherConfig: false,
    };
  }

  const slaacAddress = deriveSlaacAddress(advertisement.prefix, macAddress);
  if (advertisement.otherConfig) {
    return {
      mode: 'slaac-with-dhcpv6-other',
      needsDhcpv6Address: false,
      needsDhcpv6OtherConfig: true,
      slaacAddress,
    };
  }

  return {
    mode: 'slaac-only',
    needsDhcpv6Address: false,
    needsDhcpv6OtherConfig: false,
    slaacAddress,
  };
}

function deriveSlaacAddress(prefix: string, macAddress: string): string {
  const [network] = prefix.split('/');
  if (!network) throw new RangeError(`Invalid IPv6 prefix: ${prefix}`);
  const prefixText = canonicalizeIpv6(network);
  const interfaceId = deriveEui64Text(macAddress);
  const base = prefixText.endsWith('::') ? prefixText : `${prefixText.split('::')[0]}::`;
  return canonicalizeIpv6(`${base}${interfaceId}`);
}

function deriveEui64Text(macAddress: string): string {
  const octets = macAddress.split(':').map((part) => Number.parseInt(part, 16));
  if (
    octets.length !== 6 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    throw new RangeError(`Invalid MAC address: ${macAddress}`);
  }
  octets[0] = (octets[0] ?? 0) ^ 0x02;
  return [
    ((octets[0] ?? 0) << 8) | (octets[1] ?? 0),
    ((octets[2] ?? 0) << 8) | 0xff,
    (0xfe << 8) | (octets[3] ?? 0),
    ((octets[4] ?? 0) << 8) | (octets[5] ?? 0),
  ]
    .map((part) => part.toString(16))
    .join(':');
}
