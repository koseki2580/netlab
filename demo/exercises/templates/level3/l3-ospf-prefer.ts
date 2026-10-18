/**
 * l3-ospf-prefer — two ways to the server; OSPF takes the one the story does
 * not want. The learner changes a cost so that traffic takes the named way.
 */

import { defineTemplate } from '../shared/exercise';
import { ospfDraft } from '../shared/ospfTask';
import { L } from '../shared/text';

export const l3OspfPrefer = defineTemplate(
  {
    id: 'l3-ospf-prefer',
    level: 3,
    kind: 'configure',
    title: L('Steer traffic with an OSPF cost', 'OSPF のコストで道を選ばせる'),
  },
  (draw, seed) => ospfDraft(draw, seed, false),
);
