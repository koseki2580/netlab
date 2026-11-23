import type { Catalog } from '../../../../types';

/** The `sdwan` deck's questions (en); its name is in the core chunk. */
export const sdwan: Catalog = {
  'learning.concept.sdwan.q1.prompt':
    'At 18:00 the internet line gets busy: 120 ms, 40 ms of jitter, 3 % loss. Voice allows 150 ms, 30 ms and 1 %. Costs: internet 1, LTE 2, MPLS 3. Where do voice calls go?',
  'learning.concept.sdwan.q1.a': 'The MPLS line, the best-quality link',
  'learning.concept.sdwan.q1.b': 'LTE, the cheapest link that still fits',
  'learning.concept.sdwan.q1.c': 'They stay on the internet line',
  'learning.concept.sdwan.q1.why':
    'LTE (70 ms, 15 ms, 1 %) meets every one of voice’s limits and costs 2, less than MPLS’s 3, so voice moves to LTE.',
  'learning.concept.sdwan.q1.a.why':
    'MPLS fits too, but it costs more than LTE; the policy takes the cheapest link that meets the needs, not the best one.',
  'learning.concept.sdwan.q1.c.why':
    'At 40 ms of jitter and 3 % loss the internet line misses voice’s needs, so SD-WAN moves the calls off it.',
  'learning.concept.sdwan.q2.prompt':
    'In the same rush, video meetings allow 100 ms, 20 ms and only 0.5 % loss. Where do they go?',
  'learning.concept.sdwan.q2.a': 'LTE, the same link as voice',
  'learning.concept.sdwan.q2.b': 'The internet line, for its low cost',
  'learning.concept.sdwan.q2.c': 'MPLS, since LTE’s loss is too high',
  'learning.concept.sdwan.q2.why':
    'Only MPLS (30 ms, 2 ms, 0 %) meets video’s limits during the rush, so video moves there even though it costs the most.',
  'learning.concept.sdwan.q2.a.why':
    'LTE’s 1 % loss exceeds video’s 0.5 % limit: the same rush can send two kinds of traffic to two different links.',
  'learning.concept.sdwan.q2.b.why':
    'Cost only chooses among links that meet the needs, and the busy internet line misses all three of video’s limits.',
  'learning.concept.sdwan.q3.prompt':
    'Outside the rush the internet line is fine (25 ms, 4 ms, 0.1 %). Why don’t voice calls use MPLS, the best link?',
  'learning.concept.sdwan.q3.a': 'The internet line meets voice’s needs and costs less',
  'learning.concept.sdwan.q3.b': 'MPLS is kept idle as a standby for failures',
  'learning.concept.sdwan.q3.c': 'Each link carries one kind of traffic, fixed by policy',
  'learning.concept.sdwan.q3.why':
    'The policy only asks “is this link good enough?” and then picks the cheapest such link: here the internet line, cost 1.',
  'learning.concept.sdwan.q3.b.why':
    'MPLS is not reserved here — video moves onto it in the rush. It is simply not chosen while a cheaper link fits.',
  'learning.concept.sdwan.q3.c.why':
    'Nothing is pinned: each period every kind of traffic gets the cheapest link that meets it, so voice and video can share a link.',
  'learning.concept.sdwan.q4.prompt':
    'During the rush, where does the nightly backup (1000 ms, 500 ms and 5 % allowed) go?',
  'learning.concept.sdwan.q4.a': 'MPLS, so the backup loses no data',
  'learning.concept.sdwan.q4.b': 'It stays on the internet line',
  'learning.concept.sdwan.q4.c': 'LTE, together with the voice calls',
  'learning.concept.sdwan.q4.why':
    'Even busy, the internet line (120 ms, 40 ms, 3 %) is within the backup’s limits and is the cheapest, so the backup stays: each policy decides for its own traffic.',
  'learning.concept.sdwan.q4.a.why':
    'TCP repairs loss by retransmitting; with limits this loose, even the busy internet line is good enough.',
  'learning.concept.sdwan.q4.c.why':
    'Voice moved because its limits are tight; the backup’s are loose, so the cheapest line still fits it.',
};
