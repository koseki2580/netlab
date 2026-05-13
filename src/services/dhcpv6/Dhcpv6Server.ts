import type { Dhcpv6IaAddress, Dhcpv6Message } from './Dhcpv6MessageTypes';
import { DHCPV6_MESSAGE_TYPE } from './Dhcpv6MessageTypes';
import { canonicalizeIpv6, parseIpv6 } from '../../utils/ipv6';

export interface Dhcpv6ServerConfig {
  readonly serverDuid: string;
  readonly pool: {
    readonly start: string;
    readonly end: string;
  };
  readonly dnsServers?: readonly string[];
  readonly preferredLifetimeSec?: number;
  readonly validLifetimeSec?: number;
}

export class Dhcpv6Server {
  private readonly leases = new Map<string, string>();

  constructor(private readonly config: Dhcpv6ServerConfig) {}

  handle(message: Dhcpv6Message): Dhcpv6Message {
    if (message.msgType === DHCPV6_MESSAGE_TYPE.SOLICIT) {
      return this.buildResponse(DHCPV6_MESSAGE_TYPE.ADVERTISE, message);
    }
    if (message.msgType === DHCPV6_MESSAGE_TYPE.REQUEST) {
      return this.buildResponse(DHCPV6_MESSAGE_TYPE.REPLY, message);
    }
    throw new RangeError(`Unsupported DHCPv6 message type: ${message.msgType}`);
  }

  private buildResponse(msgType: 'Advertise' | 'Reply', request: Dhcpv6Message): Dhcpv6Message {
    const clientDuid = request.clientDuid;
    if (!clientDuid) {
      return {
        msgType,
        txid: request.txid,
        serverDuid: this.config.serverDuid,
        options: { statusCode: 'NoAddrsAvail' },
      };
    }

    const address = this.allocate(clientDuid);
    return {
      msgType,
      txid: request.txid,
      clientDuid,
      serverDuid: this.config.serverDuid,
      options: {
        statusCode: address ? 'Success' : 'NoAddrsAvail',
        ...(address ? { iaNa: this.buildIaNa(address) } : {}),
        ...(this.config.dnsServers !== undefined ? { dnsServers: this.config.dnsServers } : {}),
      },
    };
  }

  private allocate(clientDuid: string): string | null {
    const existing = this.leases.get(clientDuid);
    if (existing) return existing;

    const start = parseIpv6(this.config.pool.start).bigint;
    const end = parseIpv6(this.config.pool.end).bigint;
    if (end < start) throw new RangeError('DHCPv6 pool end must be greater than or equal to start');
    const size = end - start + 1n;
    const initialOffset = hashString(clientDuid) % size;

    for (let probe = 0n; probe < size; probe += 1n) {
      const candidate = canonicalizeIpv6FromBigInt(start + ((initialOffset + probe) % size));
      if ([...this.leases.values()].includes(candidate)) continue;
      this.leases.set(clientDuid, candidate);
      return candidate;
    }

    return null;
  }

  private buildIaNa(address: string) {
    const preferred = this.config.preferredLifetimeSec ?? 43_200;
    const valid = this.config.validLifetimeSec ?? 86_400;
    const iaAddress: Dhcpv6IaAddress = {
      address,
      preferredLifetimeSec: preferred,
      validLifetimeSec: valid,
    };
    return {
      iaid: 1,
      t1Sec: Math.floor(preferred / 2),
      t2Sec: Math.floor(preferred * 0.8),
      addresses: [iaAddress],
    };
  }
}

function hashString(value: string): bigint {
  let hash = 0x811c9dc5n;
  for (const char of value) {
    hash ^= BigInt(char.charCodeAt(0));
    hash = (hash * 0x01000193n) & 0xffffffffn;
  }
  return hash;
}

function canonicalizeIpv6FromBigInt(value: bigint): string {
  const hextets: string[] = [];
  for (let shift = 112n; shift >= 0n; shift -= 16n) {
    hextets.push(Number((value >> shift) & 0xffffn).toString(16));
  }
  return canonicalizeIpv6(hextets.join(':'));
}
