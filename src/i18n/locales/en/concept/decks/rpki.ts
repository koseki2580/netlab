import type { Catalog } from '../../../../types';

/** The `rpki` deck's questions (en); its name is in the core chunk. */
export const rpki: Catalog = {
  'learning.concept.rpki.q1.prompt':
    'A ROA says 192.0.2.0/24, maxLength 24, origin AS64500. AS64511 announces 192.0.2.0/25. What does route origin validation (ROV) call it?',
  'learning.concept.rpki.q1.a': 'NotFound: no ROA lists the /25 itself',
  'learning.concept.rpki.q1.b': 'Invalid: a ROA covers it, but the origin is wrong',
  'learning.concept.rpki.q1.c': 'Valid: the /24 ROA covers every /25 inside it',
  'learning.concept.rpki.q1.why':
    'The 192.0.2.0/24 ROA covers the /25, but no covering ROA names AS64511 (and a /25 is past maxLength 24), so RFC 6811 calls it Invalid.',
  'learning.concept.rpki.q1.a.why':
    'A ROA covers every more-specific inside its prefix, so the /25 is covered. NotFound is only for a prefix no ROA covers.',
  'learning.concept.rpki.q1.c.why':
    'Covering is not authorising: the ROA allows only AS64500 and only up to /24, so a /25 from AS64511 matches on neither.',
  'learning.concept.rpki.q2.prompt':
    'A router hears the holder’s 192.0.2.0/24 (Valid) and AS64511’s 192.0.2.0/25 (Invalid), and drops Invalid routes. Where do packets to 192.0.2.10 go?',
  'learning.concept.rpki.q2.a': 'Along the /24, to the holder AS64500',
  'learning.concept.rpki.q2.b': 'Along the /25, as the longest match still wins',
  'learning.concept.rpki.q2.c': 'Nowhere: the whole block is cut off',
  'learning.concept.rpki.q2.why':
    'With ROV the /25 never enters the table, so the longest route containing 192.0.2.10 is the holder’s /24. Without ROV the /25 is longer and would win.',
  'learning.concept.rpki.q2.b.why':
    'Longest match chooses among the routes in the table; dropping Invalid removes the /25 before forwarding ever sees it.',
  'learning.concept.rpki.q2.c.why':
    'Only the Invalid /25 is dropped. The holder’s Valid /24 stays, and it still contains 192.0.2.10.',
  'learning.concept.rpki.q3.prompt':
    '203.0.113.0/24 has no ROA at all, so it is NotFound. Why do routers that drop Invalid routes still keep it?',
  'learning.concept.rpki.q3.a': 'BGP already checks the origin of unsigned prefixes',
  'learning.concept.rpki.q3.b': 'NotFound means the validator is down, so it is kept',
  'learning.concept.rpki.q3.c': 'Many prefixes have no ROA; dropping them cuts off real networks',
  'learning.concept.rpki.q3.why':
    'When ROV was introduced most prefixes still had no ROA. Dropping NotFound would cut off networks that are legitimately reachable, so only Invalid is dropped.',
  'learning.concept.rpki.q3.a.why':
    'BGP has no origin check of its own; without a ROA nothing proves or disproves who may originate the prefix.',
  'learning.concept.rpki.q3.b.why':
    'NotFound is an answer, not an outage: the validator checked and found no ROA covering the prefix.',
  'learning.concept.rpki.q4.prompt':
    'AS64501 raises the maxLength of its 198.51.100.0/22 ROA to 28 but announces only /24s. Another network announces 198.51.100.0/26 with AS64501 as the origin. ROV says…',
  'learning.concept.rpki.q4.a': 'Invalid: AS64501 never announced that /26',
  'learning.concept.rpki.q4.b': 'NotFound: no ROA was written for a /26',
  'learning.concept.rpki.q4.c': 'Valid: its origin and length fit the ROA',
  'learning.concept.rpki.q4.why':
    'ROV checks only the origin AS and the length against the ROA, so a forged-origin more-specific within maxLength is Valid. RFC 9319 therefore advises against a loose maxLength.',
  'learning.concept.rpki.q4.a.why':
    'ROV compares with the ROA, not with what is really announced; a /26 from AS64501 is within maxLength 28, so it matches.',
  'learning.concept.rpki.q4.b.why':
    'The /22 ROA covers the /26, and a covered prefix is never NotFound.',
};
