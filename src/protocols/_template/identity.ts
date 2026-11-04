/**
 * TEMPLATE — copy this folder to `src/protocols/<id>/` and follow "Add a protocol" in
 * docs/core/protocol-packs.md. Nothing imports this folder, so no bundle holds it.
 */
import type { ProtocolIdentity } from '../pack/types';

export const templateIdentity: ProtocolIdentity = {
  id: 'template', // lowercase; also the trace-filter word
  name: { short: 'TMPL', en: 'Template protocol', ja: 'テンプレートのプロトコル' },
  layer: 'L7',
  numbers: { ports: [{ transport: 'udp', port: 65000 }] }, // or ipProtocol, etherType, icmpTypes
};
