import type { Catalog } from '../../../../types';

/** The `segrouting` deck's questions (en); its name is in the core chunk. */
export const segrouting: Catalog = {
  'learning.concept.segrouting.q1.prompt':
    'In SR-MPLS, R1 pushes a single label, R4’s node SID 16004, and its route to R4 goes via R2. What do R2 and R4 do with that label?',
  'learning.concept.segrouting.q1.a': 'R2 swaps it for a label it chose itself, as LDP does',
  'learning.concept.segrouting.q1.b': 'R2 pops it and routes the packet on by its IP address',
  'learning.concept.segrouting.q1.c': 'R2 sends it on unchanged toward R4, and R4 pops it',
  'learning.concept.segrouting.q1.why':
    'A node SID means the same in every router: “take me to R4”. R2 forwards 16004 toward R4 with the same label, and R4 pops its own SID.',
  'learning.concept.segrouting.q2.prompt':
    'To steer traffic via R3, R1 pushes the stack 16003 | 16004 (R3’s SID on top). What does R3 do when the packet arrives?',
  'learning.concept.segrouting.q2.a': 'Pops 16003, its own, and sends it on toward R4 by 16004',
  'learning.concept.segrouting.q2.b': 'Sends it to R4 with both labels on, as only R4 pops',
  'learning.concept.segrouting.q2.c': 'Drops it, having no state for this path from R1',
  'learning.concept.segrouting.q2.why':
    'Each router reads only the top SID. 16003 is R3’s own, so R3 pops it; the next segment, 16004, then leads to R4, which pops it in turn.',
  'learning.concept.segrouting.q3.prompt':
    'R1 switches from the shortest path to the path via R3. What has to change in the tables of R2, R3 and R4?',
  'learning.concept.segrouting.q3.a': 'R3 needs a new entry for the path, signalled as in RSVP-TE',
  'learning.concept.segrouting.q3.b': 'Nothing: only the stack that R1 pushes changes',
  'learning.concept.segrouting.q3.c': 'Every router on the new path must learn the policy',
  'learning.concept.segrouting.q3.why':
    'The path is written in the packet as SIDs, so the core keeps no per-path state; steering traffic (traffic engineering) needs no signalling in the core.',
  'learning.concept.segrouting.q1.a.why':
    'With LDP each router picks its own labels hop by hop; a node SID is one value known everywhere, so R2 keeps it.',
  'learning.concept.segrouting.q1.b.why':
    'Only the router that owns a SID pops it. 16004 belongs to R4, so R2 forwards the label toward R4.',
  'learning.concept.segrouting.q2.b.why':
    'Each SID is popped by the router it names; R3 pops 16003 and R4 is left with only its own 16004 to pop.',
  'learning.concept.segrouting.q2.c.why':
    'No router needs state per path: R3 knows its own SID and R4’s, and that is all the stack asks of it.',
  'learning.concept.segrouting.q3.a.why':
    'That is RSVP-TE’s way, with state in each router on the tunnel; segment routing carries the path in the packet instead.',
  'learning.concept.segrouting.q3.c.why':
    'The policy lives only at R1, the ingress; the routers on the path just follow the SIDs they already know.',
};
