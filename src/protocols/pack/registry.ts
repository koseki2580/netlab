/**
 * Protocol-pack registry (REQ-104). Identity lookups are synchronous and never
 * load a pack; `load` resolves a lazily registered pack once.
 */
import { validateIdentity } from './define';
import { descriptorError } from './errors';
import type { Loader, ProtocolIdentity, ProtocolPack, Transport } from './types';

export interface ProtocolPackStub extends ProtocolIdentity {
  readonly load: Loader<ProtocolPack>;
}

export interface ProtocolPackRegistry {
  register(pack: ProtocolPack): void;
  registerLazy(stub: ProtocolPackStub): void;
  unregister(id: string): void;
  identity(id: string): ProtocolIdentity | undefined;
  byIpProtocol(protocol: number): ProtocolIdentity | undefined;
  byEtherType(etherType: number): ProtocolIdentity | undefined;
  byPort(transport: Transport, port: number): ProtocolIdentity | undefined;
  list(): readonly ProtocolIdentity[];
  /** The pack, once registered eagerly or loaded. */
  get(id: string): ProtocolPack | undefined;
  load(id: string): Promise<ProtocolPack>;
}

interface Entry {
  readonly source: object;
  readonly identity: ProtocolIdentity;
  readonly claims: readonly string[];
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

function claimsOf(identity: ProtocolIdentity): [claim: string, path: string][] {
  const n = identity.numbers ?? {};
  return [
    ...(n.ipProtocol === undefined
      ? []
      : [[`ip:${n.ipProtocol}`, 'numbers.ipProtocol'] as [string, string]]),
    ...(n.etherType === undefined
      ? []
      : [[`ether:${n.etherType}`, 'numbers.etherType'] as [string, string]]),
    ...(n.ports ?? []).map((p): [string, string] => [`${p.transport}:${p.port}`, 'numbers.ports']),
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
    validateIdentity(identity);
    if (existing)
      throw descriptorError(
        'pack/duplicate-id',
        `A pack "${identity.id}" is already registered`,
        'id',
      );
    const mine = claimsOf(identity);
    for (const [claim, path] of mine) {
      const owner = claims.get(claim);
      if (owner !== undefined) {
        throw descriptorError(
          'pack/duplicate-number',
          `${claim} is already claimed by "${owner}"`,
          path,
        );
      }
    }
    for (const [claim] of mine) claims.set(claim, identity.id);
    entries.set(identity.id, {
      source,
      identity: identityOf(identity),
      claims: mine.map(([c]) => c),
      ...extra,
    });
  };

  const byClaim = (claim: string) => {
    const id = claims.get(claim);
    return id === undefined ? undefined : entries.get(id)?.identity;
  };

  return {
    register: (pack) => add(pack, pack, { pack }),
    registerLazy: (stub) => add(stub, stub, { loader: stub.load }),
    unregister(id) {
      const entry = entries.get(id);
      if (!entry) return;
      for (const claim of entry.claims) claims.delete(claim);
      entries.delete(id);
    },
    identity: (id) => entries.get(id)?.identity,
    byIpProtocol: (protocol) => byClaim(`ip:${protocol}`),
    byEtherType: (etherType) => byClaim(`ether:${etherType}`),
    byPort: (transport, port) => byClaim(`${transport}:${port}`),
    list: () => [...entries.values()].map((e) => e.identity),
    get: (id) => entries.get(id)?.pack,
    load(id) {
      const entry = entries.get(id);
      if (!entry) {
        return Promise.reject(
          descriptorError('pack/unknown-id', `No pack "${id}" is registered`, 'id'),
        );
      }
      if (entry.pack) return Promise.resolve(entry.pack);
      entry.pending ??= entry.loader!().then(
        (loaded) => {
          const pack = 'default' in loaded ? loaded.default : loaded;
          if (!sameIdentity(pack, entry.identity)) {
            entry.pending = undefined;
            throw descriptorError(
              'pack/identity-mismatch',
              `The loaded pack "${pack.id}" differs from its registration "${id}"`,
              'id',
            );
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
