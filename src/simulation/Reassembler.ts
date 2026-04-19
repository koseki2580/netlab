import type { IpPacket } from '../types/packets';
import { packetSizeBytes, type ReassemblyBufferEntry, tryReassemble } from './fragmentation';

function buildReassemblyKey(fragment: IpPacket): string {
  return `${fragment.srcIp}|${fragment.dstIp}|${fragment.identification ?? 0}|${fragment.protocol}`;
}

function isFragmentedPacket(packet: IpPacket): boolean {
  return (
    packet.identification !== undefined &&
    (packet.flags?.mf === true || (packet.fragmentOffset ?? 0) > 0)
  );
}

export class Reassembler {
  private readonly buffers = new Map<string, ReassemblyBufferEntry>();
  private lastCompletedFragmentCount: number | null = null;

  accept(fragment: IpPacket): IpPacket | null {
    this.lastCompletedFragmentCount = null;

    if (!isFragmentedPacket(fragment)) {
      return fragment;
    }

    const key = buildReassemblyKey(fragment);
    const entry = this.buffers.get(key) ?? {
      key,
      firstFragment: fragment,
      fragments: new Map<number, IpPacket>(),
      totalBytesExpected: null,
    };

    if ((fragment.fragmentOffset ?? 0) === 0) {
      entry.firstFragment = fragment;
    }
    entry.fragments.set(fragment.fragmentOffset ?? 0, fragment);

    if (fragment.flags?.mf !== true) {
      entry.totalBytesExpected =
        (fragment.fragmentOffset ?? 0) * 8 + (packetSizeBytes(fragment) - 20);
    }

    this.buffers.set(key, entry);

    const reassembled = tryReassemble(entry);
    if (!reassembled) {
      return null;
    }

    this.lastCompletedFragmentCount = entry.fragments.size;
    this.buffers.delete(key);
    return reassembled;
  }

  clear(key: string): void {
    this.buffers.delete(key);
  }

  size(): number {
    return this.buffers.size;
  }

  getLastCompletedFragmentCount(): number | null {
    return this.lastCompletedFragmentCount;
  }
}
