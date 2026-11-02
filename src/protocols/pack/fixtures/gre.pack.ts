/** The full GRE pack: the two tiers joined and validated. */
import greLearn from '../../gre/pack-gre';
import { greWire } from '../../gre/wire';
import { defineProtocol } from '../define';
import { mergeLearn } from '../merge';

export { greHeaderToValues } from '../../gre/wire';
export const grePack = defineProtocol(mergeLearn(greWire, greLearn));
