/**
 * Protocol-pack registry (REQ-104, REQ-302). Wire tiers and identity lookups are
 * synchronous and never load anything; `load` resolves a learn tier once. A pack
 * is checked by `defineProtocol`, and a lazy one against its registration on load.
 */
import { descriptorError } from './errors';
import type { Loader, ProtocolIdentity, ProtocolPack, ProtocolWire, Transport } from './types';

export interface ProtocolPackStub extends ProtocolIdentity {
  readonly load: Loader<ProtocolPack>;
}

export interface ProtocolPackRegistry {
  /** A wire tier, or a whole pack. A wire tier can be given its `load`. */
  register(pack: ProtocolWire | ProtocolPack, load?: Loader<ProtocolPack>): void;
  registerLazy(stub: ProtocolPackStub): void;
  unregister(id: string): void;
  identity(id: string): ProtocolIdentity | undefined;
  /** The wire tier, when one was registered. */
  wire(id: string): ProtocolWire | undefined;
  byIpProtocol(protocol: number): ProtocolIdentity | undefined;
  byEtherType(etherType: number): ProtocolIdentity | undefined;
  byPort(transport: Transport, port: number): ProtocolIdentity | undefined;
  list(): readonly ProtocolIdentity[];
  /** The whole pack, once registered whole or loaded. */
  get(id: string): ProtocolPack | undefined;
  load(id: string): Promise<ProtocolPack>;
}

interface Entry {
  readonly source: object;
  readonly identity: ProtocolIdentity;
  readonly claims: readonly string[];
  readonly wire?: ProtocolWire;
  readonly loader?: Loader<ProtocolPack>;
  pack?: ProtocolPack;
  pending?: Promise<ProtocolPack> | undefined;
}

const identityOf = ({ id, name, layer, numbers }: ProtocolIdentity): ProtocolIdentity => ({
  id,
  name: { short: name.short, en: name.en, ja: name.ja },
  layer,
  ...(numbers ? { numbers } : {}),
});

function claimsOf({ numbers: n = {} }: ProtocolIdentity): string[] {
  return [
    ...(n.ipProtocol === undefined ? [] : [`ipProtocol:${n.ipProtocol}`]),
    ...(n.etherType === undefined ? [] : [`etherType:${n.etherType}`]),
    ...(n.ports ?? []).map((p) => `${p.transport}:${p.port}`),
  ];
}

const sameIdentity = (a: ProtocolIdentity, b: ProtocolIdentity) =>
  JSON.stringify(identityOf(a)) === JSON.stringify(identityOf(b));

export function createProtocolPackRegistry(): ProtocolPackRegistry {
  const entries = new Map<string, Entry>();
  const claims = new Map<string, string>();

  const add = (source: object, identity: ProtocolIdentity, extra: Partial<Entry>) => {
    const existing = entries.get(identity.id);
    if (existing?.source === source) return;
    if (existing) throw descriptorError('pack/duplicate-id', identity.id, 'id');
    const mine = claimsOf(identity);
    for (const claim of mine) {
      if (claims.has(claim)) {
        const kind = claim.split(':')[0]!;
        throw descriptorError(
          'pack/duplicate-number',
          `${claim} is ${claims.get(claim)}'s`,
          kind.startsWith('ip') || kind.startsWith('ether') ? `numbers.${kind}` : 'numbers.ports',
        );
      }
    }
    for (const claim of mine) claims.set(claim, identity.id);
    entries.set(identity.id, { source, identity: identityOf(identity), claims: mine, ...extra });
  };

  const byClaim = (claim: string) => entries.get(claims.get(claim) ?? '')?.identity;

  const register: ProtocolPackRegistry['register'] = (pack, load) =>
    add(pack, pack, {
      wire: pack,
      ...('specs' in pack ? { pack } : {}),
      ...(load ? { loader: load } : {}),
    });

  return {
    register,
    registerLazy: (stub) => add(stub, stub, { loader: stub.load }),
    unregister(id) {
      for (const claim of entries.get(id)?.claims ?? []) claims.delete(claim);
      entries.delete(id);
    },
    identity: (id) => entries.get(id)?.identity,
    wire: (id) => entries.get(id)?.wire,
    byIpProtocol: (protocol) => byClaim(`ipProtocol:${protocol}`),
    byEtherType: (etherType) => byClaim(`etherType:${etherType}`),
    byPort: (transport, port) => byClaim(`${transport}:${port}`),
    list: () => [...entries.values()].map((e) => e.identity),
    get: (id) => entries.get(id)?.pack,
    load(id) {
      const entry = entries.get(id);
      if (!entry?.loader && !entry?.pack) {
        return Promise.reject(descriptorError('pack/unknown-id', id, 'id'));
      }
      if (entry.pack) return Promise.resolve(entry.pack);
      entry.pending ??= entry.loader!().then(
        (loaded) => {
          entry.pending = undefined;
          const pack = 'default' in loaded ? loaded.default : loaded;
          if (!sameIdentity(pack, entry.identity)) {
            throw descriptorError('pack/identity-mismatch', pack.id, 'id');
          }
          entry.pack = pack;
          return pack;
        },
        (error: unknown) => {
          entry.pending = undefined;
          throw error;
        },
      );
      return entry.pending;
    },
  };
}
