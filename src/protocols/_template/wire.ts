/**
 * TEMPLATE wire tier: the structure, field names and enum names, in wire order, from
 * the RFC's header figure. No learner text here: it goes in ./pack-template.ts.
 */
import type { ProtocolWire } from '../pack/types';
import { templateIdentity } from './identity';

export const templateWire: ProtocolWire = {
  ...templateIdentity,
  defaultVersion: 'v1',
  versions: [{ id: 'v1' }],
  label: { field: 'kind' }, // optional: an enum whose name follows the short name in traces
  header: [
    {
      key: 'kind',
      name: 'Kind',
      type: 'enum',
      bits: 8,
      values: [
        { value: 1, name: 'REQUEST' },
        { value: 2, name: 'REPLY' },
      ],
    },
    { key: 'flag', name: 'Flag', type: 'flag' },
    { key: 'reserved', name: 'Reserved', type: 'reserved', bits: 7 },
    { key: 'length', name: 'Length', type: 'uint', bits: 16 },
  ],
};
