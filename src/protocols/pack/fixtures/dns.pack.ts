/** The full DNS pack: the two tiers joined and validated, as a learner-facing view sees it. */
import dnsLearn from '../../dns/pack-dns';
import { dnsWire } from '../../dns/wire';
import { defineProtocol } from '../define';
import { mergeLearn } from '../merge';

export { dnsMessageToValues } from '../../dns/wire';
export const dnsPack = defineProtocol(mergeLearn(dnsWire, dnsLearn));
