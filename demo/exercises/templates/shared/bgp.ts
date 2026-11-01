/**
 * A site with two providers, for the BGP exercises.
 *
 *               ra (provider A, AS 65010) ──────────── rc
 * pc — r1  <                                             > rc (server's AS 65040) — srv
 *  AS 65001     rb (provider B, AS 65020) — rx (AS 65030) — rc
 *
 * One provider reaches the server's AS directly; the other through one more
 * AS (`rx`), so its AS_PATH is one AS longer. r1 starts with no policy of its
 * own (LOCAL_PREF 100 on both), so its traffic leaves by the shorter AS_PATH;
 * the longer side is the one an exercise asks for. Every router speaks eBGP
 * with its neighbours; each originates its own LAN, so replies find their way.
 */

import type { BgpNeighborConfig } from '../../../../src/types/routing';
import type { TopologySnapshot } from '../../../../src/types/topology';
import { host, iface, link, router, snapshot } from './build';
import { L, type Named } from './text';

export type Provider = 'A' | 'B';

export interface BgpExitsAddresses {
  /** The PC's network and the server's, as /24 bases (`10.0.1`). */
  readonly near: string;
  readonly far: string;
  /** Five /30 links, by their first three numbers and a block number: r1–ra, r1–rb, ra–rc, rb–rx, rx–rc. */
  readonly linkBlock: string;
}

export interface BgpExits {
  readonly topology: TopologySnapshot;
  readonly names: Readonly<Record<string, Named>>;
  /** r1's neighbour address for each provider: the BGP session r1 has with it. */
  readonly neighbour: Readonly<Record<Provider, string>>;
  /** The router of each provider, and the cable from r1 to it. */
  readonly routerOf: Readonly<Record<Provider, 'ra' | 'rb'>>;
  readonly edgeOf: Readonly<Record<Provider, string>>;
  /** The provider whose way to the server is one AS longer. */
  readonly longer: Provider;
  readonly nearCidr: string;
  readonly farCidr: string;
}

const AS = { r1: 65001, ra: 65010, rb: 65020, rx: 65030, rc: 65040 } as const;
const at = (col: number, row: number) => ({ x: col * 200, y: row * 120 });

export const PROVIDER_NAMES: Readonly<Record<Provider, Named>> = {
  A: L('provider A', 'プロバイダ A'),
  B: L('provider B', 'プロバイダ B'),
};

/** The site, with `longer` the provider whose way goes through the extra AS. */
export function bgpExits(
  addresses: BgpExitsAddresses,
  longer: Provider,
  names: Readonly<{ pc: Named; r1: Named; rc: Named; rx: Named; srv: Named }>,
): BgpExits {
  const { near, far, linkBlock } = addresses;
  const pair = (index: number) => {
    const base = index * 4;
    return { a: `${linkBlock}.${base + 1}`, b: `${linkBlock}.${base + 2}` };
  };
  const [l1a, l1b, lac, lbx, lxc] = [pair(0), pair(1), pair(2), pair(3), pair(4)];
  // The provider routers are drawn at the same places whichever side is longer;
  // what changes is which of them goes on through rx.
  const short: Provider = longer === 'A' ? 'B' : 'A';
  const viaX = longer === 'A' ? 'ra' : 'rb';
  const direct = short === 'A' ? 'ra' : 'rb';
  const toR1 = { ra: l1a, rb: l1b };
  const neighbor = (address: string, remoteAs: number): BgpNeighborConfig => ({
    address,
    remoteAs,
  });
  const bgp = (
    localAs: number,
    routerId: string,
    neighbors: BgpNeighborConfig[],
    networks: string[],
  ) => ({
    bgpConfig: { localAs, routerId, neighbors, networks },
  });
  // The two cables on from the providers: the direct one to rc, the other to rx.
  const onDirect = direct === 'ra' ? lac : lbx;
  const onViaX = viaX === 'ra' ? lac : lbx;
  const providerRouter = (id: 'ra' | 'rb', row: number) => {
    const goesDirect = id === direct;
    const on = goesDirect ? onDirect : onViaX;
    return router(
      id,
      [iface('to-r1', `${toR1[id].b}/30`), iface('on', `${on.a}/30`)],
      bgp(
        AS[id],
        id === 'ra' ? '10.0.0.10' : '10.0.0.20',
        [neighbor(toR1[id].a, AS.r1), neighbor(on.b, goesDirect ? AS.rc : AS.rx)],
        [],
      ),
      at(2, row),
    );
  };
  const topology = snapshot(
    [
      host('pc', `${near}.10`, at(0, 1)),
      router(
        'r1',
        [
          iface('lan', `${near}.1/24`),
          iface('to-ra', `${l1a.a}/30`),
          iface('to-rb', `${l1b.a}/30`),
        ],
        bgp(AS.r1, '10.0.0.1', [neighbor(l1a.b, AS.ra), neighbor(l1b.b, AS.rb)], [`${near}.0/24`]),
        at(1, 1),
      ),
      providerRouter('ra', 0),
      providerRouter('rb', 2),
      router(
        'rx',
        [iface('to-p', `${onViaX.b}/30`), iface('to-rc', `${lxc.a}/30`)],
        bgp(AS.rx, '10.0.0.30', [neighbor(onViaX.a, AS[viaX]), neighbor(lxc.b, AS.rc)], []),
        at(3, longer === 'A' ? 0 : 2),
      ),
      router(
        'rc',
        [
          iface('to-p', `${onDirect.b}/30`),
          iface('to-rx', `${lxc.b}/30`),
          iface('lan', `${far}.1/24`),
        ],
        bgp(
          AS.rc,
          '10.0.0.40',
          [neighbor(onDirect.a, AS[direct]), neighbor(lxc.a, AS.rx)],
          [`${far}.0/24`],
        ),
        at(4, 1),
      ),
      host('srv', `${far}.10`, { role: 'server', ...at(5, 1) }),
    ],
    [
      link('e-pc', 'pc', 'r1:lan'),
      link('e-1a', 'r1:to-ra', 'ra:to-r1'),
      link('e-1b', 'r1:to-rb', 'rb:to-r1'),
      link('e-direct', `${direct}:on`, 'rc:to-p'),
      link('e-viax', `${viaX}:on`, 'rx:to-p'),
      link('e-xc', 'rx:to-rc', 'rc:to-rx'),
      link('e-srv', 'rc:lan', 'srv'),
    ],
  );
  return {
    topology,
    names: {
      pc: names.pc,
      r1: names.r1,
      ra: PROVIDER_NAMES.A,
      rb: PROVIDER_NAMES.B,
      rx: names.rx,
      rc: names.rc,
      srv: names.srv,
    },
    neighbour: { A: l1a.b, B: l1b.b },
    routerOf: { A: 'ra', B: 'rb' },
    edgeOf: { A: 'e-1a', B: 'e-1b' },
    longer,
    nearCidr: `${near}.0/24`,
    farCidr: `${far}.0/24`,
  };
}

/** A fixed instance, for tests: provider B is the longer way. */
export function bgpExitsFixture(): BgpExits {
  const named = (en: string) => L(en, en);
  return bgpExits({ near: '10.0.1', far: '10.0.4', linkBlock: '10.9.0' }, 'B', {
    pc: named('PC'),
    r1: named('site router'),
    rc: named('server router'),
    rx: named('transit router'),
    srv: named('server'),
  });
}
