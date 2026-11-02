/** Loads a pack's learn tier on demand (REQ-302). UI only: see ./packs. */
import { mergeLearn } from './pack/merge';
import type { ProtocolLearn, ProtocolPack } from './pack/types';
import { protocolPacks } from './packs';

const LEARN: Readonly<Record<string, () => Promise<{ default: ProtocolLearn }>>> = {
  dns: () => import('./dns/pack-dns'),
  gre: () => import('./gre/pack-gre'),
};

const pending = new Map<string, Promise<ProtocolPack | undefined>>();

/** The whole pack, loaded once. A failed load can be tried again. */
export function loadLearnTier(id: string): Promise<ProtocolPack | undefined> {
  const loaded = protocolPacks.get(id);
  if (loaded) return Promise.resolve(loaded);
  const wire = protocolPacks.wire(id);
  const load = LEARN[id];
  if (!wire || !load) return Promise.resolve(undefined);
  const running =
    pending.get(id) ??
    load().then((module) => {
      const pack = { ...mergeLearn(wire, module.default), defaultVersion: wire.defaultVersion };
      protocolPacks.attach(pack);
      return pack;
    });
  pending.set(id, running);
  const settle = () => pending.delete(id);
  running.then(settle, settle);
  return running;
}
