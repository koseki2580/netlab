export interface TcpLossInjector {
  shouldDropSegment(connId: string, seq: number): boolean;
}

export class NullLossInjector implements TcpLossInjector {
  shouldDropSegment(_connId: string, _seq: number): boolean {
    return false;
  }
}

interface DeterministicLossInjectorOptions {
  readonly oneShot?: boolean;
}

export class DeterministicLossInjector implements TcpLossInjector {
  private readonly dropSeqsByConnection: ReadonlyMap<string, ReadonlySet<number>>;
  private readonly consumedDrops = new Set<string>();
  private readonly oneShot: boolean;

  constructor(
    rules: ReadonlyMap<string, readonly number[]>,
    options: DeterministicLossInjectorOptions = {},
  ) {
    this.dropSeqsByConnection = new Map(
      Array.from(rules.entries()).map(([connId, seqs]) => [connId, new Set(seqs)]),
    );
    this.oneShot = options.oneShot ?? false;
  }

  shouldDropSegment(connId: string, seq: number): boolean {
    const dropSeqs = this.dropSeqsByConnection.get(connId);
    if (!dropSeqs?.has(seq)) {
      return false;
    }

    if (!this.oneShot) {
      return true;
    }

    const key = this.dropKey(connId, seq);
    if (this.consumedDrops.has(key)) {
      return false;
    }

    this.consumedDrops.add(key);
    return true;
  }

  private dropKey(connId: string, seq: number): string {
    return `${connId}:${seq}`;
  }
}
