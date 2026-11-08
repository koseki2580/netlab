/** Loads a pack's learn tier on demand (REQ-302). UI only: see ./packs. */
import { mergeLearn } from './pack/merge';
import type { ProtocolLearn, ProtocolPack } from './pack/types';
import { protocolPacks } from './packs';

const LEARN: Readonly<Record<string, () => Promise<{ default: ProtocolLearn }>>> = {
  dns: () => import('./dns/pack-dns'),
  gre: () => import('./gre/pack-gre'),
  ntp: () => import('./ntp/pack-ntp'),
  vxlan: () => import('./vxlan/pack-vxlan'),
  ipv6: () => import('./ipv6/pack-ipv6'),
  icmpv6: () => import('./icmpv6/pack-icmpv6'),
  nd: () => import('./nd/pack-nd'),
};

const pending = new Map<string, Promise<ProtocolPack | undefined>>();

/** The whole pack, loaded once. A failed load can be tried again. */
export function loadLearnTier(id: string): Promise<ProtocolPack | undefined> {
  const loaded = protocolPacks.get(id);
  if (loaded) return Promise.resolve(loaded);
  const load = LEARN[id];
  if (!load) return Promise.resolve(undefined);
  const running =
    pending.get(id) ??
    Promise.all([protocolPacks.loadWire(id), load()]).then(([wire, module]) => {
      if (!wire) return undefined;
      const pack = { ...mergeLearn(wire, module.default), defaultVersion: wire.defaultVersion };
      protocolPacks.attach(pack);
      return pack;
    });
  pending.set(id, running);
  const settle = () => pending.delete(id);
  running.then(settle, settle);
  return running;
}
