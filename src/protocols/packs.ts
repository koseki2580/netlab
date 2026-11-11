/**
 * The process-wide protocol index (REQ-302, REQ-312). The IPv6 family (IPv6, ICMPv6,
 * ND) is lazy: the worker loads ICMPv6 before its first message, the views on show. DNS's wire tier is eager: its
 * bytes are needed on every DNS hop, synchronously. GRE's loads on the first router
 * with a tunnel, so the worker, an ES module, fetches it only then. Learn tiers are
 * attached by ./packLearn, which only the UI imports.
 */
import { dnsWire } from './dns/wire';
import { greIdentity } from './gre/identity';
import { ntpIdentity } from './ntp/identity';
import { mplsIdentity } from './mpls/identity';
import { vxlanIdentity } from './vxlan/identity';
import { icmpv6Identity } from './icmpv6/identity';
import { ipv6Identity } from './ipv6/identity';
import { ndIdentity } from './nd/identity';
import { registerIcmpv6Codec } from '../utils/packetLayout';
import { createWireIndex } from './pack/wireIndex';

export const protocolPacks = createWireIndex([
  dnsWire,
  { ...greIdentity, loadWire: () => import('./gre/wire').then((module) => module.greWire) },
  { ...ntpIdentity, loadWire: () => import('./ntp/wire').then((module) => module.ntpWire) },
  { ...vxlanIdentity, loadWire: () => import('./vxlan/wire').then((module) => module.vxlanWire) },
  { ...mplsIdentity, loadWire: () => import('./mpls/wire').then((module) => module.mplsWire) },
  {
    ...icmpv6Identity,
    loadWire: () =>
      import('./icmpv6/wire').then((module) => {
        registerIcmpv6Codec(module.icmpv6Codec);
        return module.icmpv6Wire;
      }),
  },
  { ...ndIdentity, loadWire: () => import('./nd/wire').then((module) => module.ndWire) },
  { ...ipv6Identity, loadWire: () => import('./ipv6/wire').then((module) => module.ipv6Wire) },
]);
