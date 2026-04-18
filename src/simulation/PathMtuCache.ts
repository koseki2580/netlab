export const IPV4_DEFAULT_PMTU = 1500;
export const IPV4_MIN_PMTU = 68;

export class PathMtuCache {
  private readonly entries = new Map<string, number>();

  get(dstIp: string): number {
    return this.entries.get(dstIp) ?? IPV4_DEFAULT_PMTU;
  }

  update(dstIp: string, nextHopMtu: number): void {
    if (!Number.isFinite(nextHopMtu) || nextHopMtu <= 0) {
      return;
    }

    const normalized = Math.max(IPV4_MIN_PMTU, Math.floor(nextHopMtu));
    const current = this.entries.get(dstIp);

    if (current !== undefined && normalized >= current) {
      return;
    }

    this.entries.set(dstIp, normalized);
  }

  clear(): void {
    this.entries.clear();
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.entries.entries());
  }

  size(): number {
    return this.entries.size;
  }
}
