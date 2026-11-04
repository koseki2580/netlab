/**
 * The read-only index the engine and the views use (REQ-302). It is in the worker,
 * so it is small: claims are checked by a test on the built-in tiers, and by the full
 * registry (./registry) for packs added at run time. A wire tier that is not needed on
 * every hop can be lazy: its identity is here at once, the tier on first `loadWire`.
 */
import type { ProtocolIdentity, ProtocolPack, ProtocolWire, Transport } from './types';

/** An identity whose wire tier loads on first use (REQ-312). */
export interface LazyWire extends ProtocolIdentity {
  readonly loadWire: () => Promise<ProtocolWire>;
}

export interface WireIndex {
  identity(id: string): ProtocolIdentity | undefined;
  /** The wire tier, if it is eager or already loaded. */
  wire(id: string): ProtocolWire | undefined;
  /** The wire tier, loading it once if it is lazy. */
  loadWire(id: string): Promise<ProtocolWire | undefined>;
  byIpProtocol(protocol: number): ProtocolIdentity | undefined;
  byPort(transport: Transport, port: number): ProtocolIdentity | undefined;
  byIcmpType(version: 4 | 6, type: number): ProtocolIdentity | undefined;
  list(): readonly ProtocolIdentity[];
  /** The whole pack, once its learn tier is attached. */
  get(id: string): ProtocolPack | undefined;
  attach(pack: ProtocolPack): void;
  detach(id: string): void;
}

export function createWireIndex(entries: readonly (ProtocolWire | LazyWire)[]): WireIndex {
  const wires = new Map<string, ProtocolWire | Promise<ProtocolWire>>();
  const packs = new Map<string, ProtocolPack>();
  for (const entry of entries) if (!('loadWire' in entry)) wires.set(entry.id, entry);
  const find = (test: (entry: ProtocolIdentity) => boolean) => entries.find(test);
  const wire = (id: string) => {
    const known = wires.get(id);
    return known instanceof Promise ? undefined : known;
  };
  return {
    identity: (id) => find((entry) => entry.id === id),
    wire,
    loadWire(id) {
      const entry = find((candidate) => candidate.id === id);
      if (!entry || !('loadWire' in entry)) return Promise.resolve(wire(id));
      const known = wires.get(id);
      if (known) return Promise.resolve(known);
      const loading = entry.loadWire().then(
        (loaded) => (wires.set(id, loaded), loaded),
        (error: unknown) => {
          wires.delete(id);
          throw error;
        },
      );
      wires.set(id, loading);
      return loading;
    },
    byIpProtocol: (protocol) => find((entry) => entry.numbers?.ipProtocol === protocol),
    byPort: (transport, port) =>
      find(
        (entry) =>
          entry.numbers?.ports?.some((p) => p.transport === transport && p.port === port) ?? false,
      ),
    byIcmpType: (version, type) =>
      find((entry) => (entry.numbers?.icmpTypes?.[`v${version}`] ?? []).includes(type)),
    list: () => entries,
    get: (id) => packs.get(id),
    attach: (pack) => void packs.set(pack.id, pack),
    detach: (id) => void packs.delete(id),
  };
}
