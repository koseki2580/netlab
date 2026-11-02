/**
 * The read-only index the engine and the views use (REQ-302). It is in the worker,
 * so it is small: claims are checked by a test on the built-in tiers, and by the full
 * registry (./registry) for packs added at run time.
 */
import type { ProtocolPack, ProtocolWire, Transport } from './types';

export interface WireIndex {
  wire(id: string): ProtocolWire | undefined;
  byIpProtocol(protocol: number): ProtocolWire | undefined;
  byPort(transport: Transport, port: number): ProtocolWire | undefined;
  list(): readonly ProtocolWire[];
  /** The whole pack, once its learn tier is attached. */
  get(id: string): ProtocolPack | undefined;
  attach(pack: ProtocolPack): void;
  detach(id: string): void;
}

export function createWireIndex(wires: readonly ProtocolWire[]): WireIndex {
  const packs = new Map<string, ProtocolPack>();
  return {
    wire: (id) => wires.find((wire) => wire.id === id),
    byIpProtocol: (protocol) => wires.find((wire) => wire.numbers?.ipProtocol === protocol),
    byPort: (transport, port) =>
      wires.find((wire) =>
        wire.numbers?.ports?.some((p) => p.transport === transport && p.port === port),
      ),
    list: () => wires,
    get: (id) => packs.get(id),
    attach: (pack) => void packs.set(pack.id, pack),
    detach: (id) => void packs.delete(id),
  };
}
