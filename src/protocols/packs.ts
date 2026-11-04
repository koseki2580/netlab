/**
 * The process-wide protocol index (REQ-302, REQ-312). DNS's wire tier is eager: its
 * bytes are needed on every DNS hop, synchronously. GRE's loads on the first router
 * with a tunnel, so the worker, an ES module, fetches it only then. Learn tiers are
 * attached by ./packLearn, which only the UI imports.
 */
import { dnsWire } from './dns/wire';
import { greIdentity } from './gre/identity';
import { ntpIdentity } from './ntp/identity';
import { createWireIndex } from './pack/wireIndex';

export const protocolPacks = createWireIndex([
  dnsWire,
  { ...greIdentity, loadWire: () => import('./gre/wire').then((module) => module.greWire) },
  { ...ntpIdentity, loadWire: () => import('./ntp/wire').then((module) => module.ntpWire) },
]);
