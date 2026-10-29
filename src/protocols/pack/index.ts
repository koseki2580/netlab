/**
 * Protocol packs — trial core (W1). Internal: NOT exported from `src/index.ts`
 * until the user has reviewed the DNS/GRE trial. Design: docs/core/protocol-packs.md.
 */
export { defineProtocol, SUPPORTED_PACK_API_VERSIONS } from './define';
export {
  deriveAnnotatedFields,
  deriveFilterToken,
  deriveGlossary,
  deriveLayout,
  derivePacketLabFieldIds,
  deriveTraceLabel,
} from './derive';
export type {
  DeriveOptions,
  GlossaryEntry,
  LayoutField,
  PackAnnotatedField,
  PackLayout,
} from './derive';
export { createProtocolPackRegistry } from './registry';
export type { ProtocolPackRegistry, ProtocolPackStub } from './registry';
export type * from './types';
