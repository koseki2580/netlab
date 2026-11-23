import type { Catalog } from '../../../../types';

/** The `mplste` deck's questions (en); its name is in the core chunk. */
export const mplste: Catalog = {
  'learning.concept.mplste.q1.prompt':
    'Without TE, A sends flows of 6, 5 and 4 Gbit/s to Z. A–B–Z is the lowest-metric path, over 10 Gbit/s links. What happens?',
  'learning.concept.mplste.q1.a': 'All 15 Gbit/s take A–B–Z; 5 are dropped, other links idle',
  'learning.concept.mplste.q1.b': 'The IGP moves the overflow onto A–C–Z',
  'learning.concept.mplste.q1.c': 'The IGP raises A–B’s metric until the load fits',
  'learning.concept.mplste.q1.why':
    'Every flow follows the one lowest-metric path, so A–B is offered 15 Gbit/s on 10: 5 Gbit/s is dropped while A–C–Z and A–E–Z sit idle.',
  'learning.concept.mplste.q1.b.why':
    'The IGP picks paths by metric and ignores load; A–C–Z has a higher metric, so it carries nothing.',
  'learning.concept.mplste.q1.c.why':
    'Metrics are configured, not adjusted to load; the IGP keeps sending everything along the lowest-metric path.',
  'learning.concept.mplste.q2.prompt':
    'With CSPF, LSP 1 (6 Gbit/s) has taken A→B→Z. Next LSP 2 asks for 5 Gbit/s. Where does it go?',
  'learning.concept.mplste.q2.a': 'A→B→Z too, as it is still the shortest',
  'learning.concept.mplste.q2.b': 'A→B→D→Z, staying close to the shortest',
  'learning.concept.mplste.q2.c': 'A→C→Z: A–B has only 4 Gbit/s left',
  'learning.concept.mplste.q2.why':
    'CSPF first removes every link with less unreserved bandwidth than the request, here A–B and B–Z with 4 Gbit/s each, then takes the shortest remaining path, A→C→Z (metric 30).',
  'learning.concept.mplste.q2.a.why':
    'CSPF prunes links whose unreserved bandwidth is below the request; A–B and B–Z have 4 Gbit/s left, less than 5.',
  'learning.concept.mplste.q2.b.why':
    'That path still uses A–B, which has only 4 Gbit/s unreserved, so CSPF pruned it.',
  'learning.concept.mplste.q3.prompt':
    'Link B–Z, which carries LSPs 1 and 3, fails. With fast reroute (facility backup), who moves their traffic first?',
  'learning.concept.mplste.q3.a': 'A, the head end, re-running CSPF at once',
  'learning.concept.mplste.q3.b': 'B, onto its pre-signalled bypass B→D→Z',
  'learning.concept.mplste.q3.c': 'Every router, as the IGP reconverges',
  'learning.concept.mplste.q3.why':
    'B, the point of local repair, has already signalled a bypass to Z around B–Z. It pushes the bypass label onto both LSPs within tens of ms, long before the head end re-signals.',
  'learning.concept.mplste.q3.a.why':
    'The head end does re-place the LSPs, but only after it hears of the failure, in about a second or more; FRR acts before that.',
  'learning.concept.mplste.q3.c.why':
    'IGP reconvergence is slower and ignores reservations; FRR repairs at the router next to the failure.',
  'learning.concept.mplste.q4.prompt':
    'Then A re-runs CSPF without B–Z. LSP 2 keeps its 5 Gbit/s on A–C–Z. Where does LSP 1 (6 Gbit/s) go?',
  'learning.concept.mplste.q4.a': 'A→C→Z, the shortest path that is left',
  'learning.concept.mplste.q4.b': 'It stays on the bypass B→D→Z for good',
  'learning.concept.mplste.q4.c': 'A→E→Z: A–C has only 5 Gbit/s left',
  'learning.concept.mplste.q4.why':
    'With B–Z gone and only 5 Gbit/s unreserved on A–C, the shortest path with 6 Gbit/s free is A→E→Z (metric 40). The bypass then goes quiet again.',
  'learning.concept.mplste.q4.a.why':
    'LSP 2 holds 5 of A–C’s 10 Gbit/s; 5 is less than 6, so CSPF prunes A–C for LSP 1.',
  'learning.concept.mplste.q4.b.why':
    'The bypass is only a bridge and reserves nothing; the head end moves the LSPs onto paths that really have room.',
};
