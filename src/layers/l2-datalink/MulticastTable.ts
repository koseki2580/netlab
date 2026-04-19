export interface MulticastTableEntry {
  vlanId: number;
  multicastMac: string;
  ports: string[];
}

function entryKey(vlanId: number, multicastMac: string): string {
  return `${vlanId}:${multicastMac.toLowerCase()}`;
}

export class MulticastTable {
  private readonly entries = new Map<string, Set<string>>();

  addMembership(vlanId: number, multicastMac: string, portId: string): void {
    const key = entryKey(vlanId, multicastMac);
    let ports = this.entries.get(key);
    if (!ports) {
      ports = new Set();
      this.entries.set(key, ports);
    }
    ports.add(portId);
  }

  removeMembership(vlanId: number, multicastMac: string, portId: string): void {
    const key = entryKey(vlanId, multicastMac);
    const ports = this.entries.get(key);
    if (ports) {
      ports.delete(portId);
      if (ports.size === 0) {
        this.entries.delete(key);
      }
    }
  }

  getJoinedPorts(vlanId: number, multicastMac: string): Set<string> {
    const key = entryKey(vlanId, multicastMac);
    return this.entries.get(key) ?? new Set();
  }

  hasLearnedGroup(vlanId: number, multicastMac: string): boolean {
    const key = entryKey(vlanId, multicastMac);
    return this.entries.has(key);
  }

  snapshot(): MulticastTableEntry[] {
    const rows: MulticastTableEntry[] = [];
    for (const [key, ports] of this.entries) {
      const sepIdx = key.indexOf(':');
      const vlanId = Number(key.slice(0, sepIdx));
      const multicastMac = key.slice(sepIdx + 1);
      rows.push({ vlanId, multicastMac, ports: [...ports].sort() });
    }
    rows.sort((a, b) => a.vlanId - b.vlanId || a.multicastMac.localeCompare(b.multicastMac));
    return rows;
  }

  clear(): void {
    this.entries.clear();
  }
}
