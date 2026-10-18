/**
 * l3-ospf-both-ways — as l3-ospf-prefer, and the answers must come back the
 * same way. A cost counts outbound only, so the far router needs one too.
 */

import { defineTemplate } from '../shared/exercise';
import { ospfDraft } from '../shared/ospfTask';
import { L } from '../shared/text';

export const l3OspfBothWays = defineTemplate(
  {
    id: 'l3-ospf-both-ways',
    level: 3,
    kind: 'configure',
    title: L('The same way there and back', '行きも帰りも同じ道にする'),
  },
  (draw, seed) => ospfDraft(draw, seed, true),
);
