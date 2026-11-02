/**
 * The process-wide protocol index (REQ-302). It holds wire tiers only, so it is safe
 * in the worker. Learn tiers are attached by ./packLearn, which only the UI imports:
 * the worker is one file, and an `import()` there would inline them.
 */
import { dnsWire } from './dns/wire';
import { greWire } from './gre/wire';
import { createWireIndex } from './pack/wireIndex';

export const protocolPacks = createWireIndex([dnsWire, greWire]);
