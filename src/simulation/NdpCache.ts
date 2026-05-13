import { canonicalizeIpv6 } from '../utils/ipv6';

export class NdpCache {
  private readonly entries = new Map<string, string>();

  set(ipv6Address: string, macAddress: string): void {
    this.entries.set(canonicalizeIpv6(ipv6Address), macAddress);
  }

  get(ipv6Address: string): string | undefined {
    return this.entries.get(canonicalizeIpv6(ipv6Address));
  }

  has(ipv6Address: string): boolean {
    return this.entries.has(canonicalizeIpv6(ipv6Address));
  }

  toJSON(): Record<string, string> {
    return Object.fromEntries([...this.entries.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }
}
