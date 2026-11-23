import type { Catalog } from '../../../../types';

/** The `pim` deck's questions (en); its name is in the core chunk. */
export const pim: Catalog = {
  'learning.concept.pim.q1.prompt':
    'The source is behind R1 and the RP is R3. R5, R6 and R7 have all switched to the source tree. Whose traffic still passes through R3?',
  'learning.concept.pim.q1.a': 'All three: (S,G) traffic always flows via the RP',
  'learning.concept.pim.q1.b': 'None: a source tree never passes the RP',
  'learning.concept.pim.q1.c': 'Only R6’s: its shortest path from R1 crosses R3',
  'learning.concept.pim.q1.why':
    'Each last-hop router joins towards the source along its own shortest path: R5 and R7 via R4, R6 via R2 and R3. Only R6’s path happens to cross the RP’s router.',
  'learning.concept.pim.q1.a.why':
    'After the switch each receiver gets traffic along its shortest path from the source; the RP is on that path only by chance.',
  'learning.concept.pim.q1.b.why':
    'The source tree ignores the RP, but it can still cross the RP’s router: R6’s shortest path from R1 is R1–R2–R3–R6.',
  'learning.concept.pim.q2.prompt':
    'R5 is on the source tree, and its shortest path to the source goes through R4. A copy of the group’s traffic arrives at R5 from R3. What does R5 do?',
  'learning.concept.pim.q2.a': 'Forwards it, as it came from a PIM neighbour',
  'learning.concept.pim.q2.b': 'Drops it: it failed the RPF check',
  'learning.concept.pim.q2.c': 'Forwards it if no copy from R4 came first',
  'learning.concept.pim.q2.why':
    'R5 reaches R1 through R4, so it accepts the group’s traffic only from R4. Each router taking it from exactly one neighbour is what stops copies circling the R3–R5–R4–R7 ring.',
  'learning.concept.pim.q2.a.why':
    'Being a neighbour is not enough; R5 accepts only from the one neighbour on its own path back to the source.',
  'learning.concept.pim.q2.c.why':
    'RPF does not race copies: the interface is fixed by the unicast route to the source, so R3’s copy is dropped whatever arrives first.',
  'learning.concept.pim.q3.prompt':
    'The RP is moved to R6. Before any router switches to the source tree, how does traffic reach R5?',
  'learning.concept.pim.q3.a': 'R1→R4→R5, its shortest path, as before',
  'learning.concept.pim.q3.b': 'Up to R6 and back down via R3',
  'learning.concept.pim.q3.c': 'R1→R2→R3→R5, skipping R6 as a dead end',
  'learning.concept.pim.q3.why':
    'On the shared tree everything passes the RP: R1–R2–R3–R6, then back R6–R3–R5, 13 ms against 5 ms on the source tree. An RP off the receivers’ paths costs delay until the switch.',
  'learning.concept.pim.q3.a.why':
    'That is the source tree. Before the switch, traffic reaches receivers only down the shared tree from the RP.',
  'learning.concept.pim.q3.c.why':
    'The shared tree is rooted at the RP, so traffic cannot skip R6, even though R3 lies on the way.',
  'learning.concept.pim.q4.prompt':
    'Receivers join 232.1.1.1 with SSM, naming the source 10.1.1.10 in IGMPv3. What changes compared with any-source multicast?',
  'learning.concept.pim.q4.a': 'The source tree is built at once, with no RP at all',
  'learning.concept.pim.q4.b': 'An RP is still used, but only for the first packets',
  'learning.concept.pim.q4.c': 'Traffic floods every router, which prunes what it does not want',
  'learning.concept.pim.q4.why':
    'Because the receiver names the source, its router joins straight towards it: the (S,G) tree exists from the start, with no RP and no shared tree.',
  'learning.concept.pim.q4.b.why':
    'That is any-source multicast before the switch. In SSM the receiver already names the source, so nothing needs an RP to find it.',
  'learning.concept.pim.q4.c.why':
    'Flood-and-prune is PIM dense mode. SSM sends joins towards the named source, so only the tree’s links carry traffic.',
};
