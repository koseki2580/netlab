import type { Catalog } from '../../../../types';

/** The `bgpgr` deck's questions (en); its name is in the core chunk. */
export const bgpgr: Catalog = {
  'learning.concept.bgpgr.q1.prompt':
    'R1’s BGP process restarts while its forwarding plane keeps forwarding. R2, with no other path to R1’s prefixes and no graceful restart, sees the session drop at once; it is back after 45 s and End-of-RIB follows 15 s later. How long is R2’s traffic lost?',
  'learning.concept.bgpgr.q1.a': 'None: R1 kept forwarding',
  'learning.concept.bgpgr.q1.b': '45 s, until the session is back',
  'learning.concept.bgpgr.q1.c': '60 s, until the routes are back',
  'learning.concept.bgpgr.q1.why':
    'Without GR, R2 withdraws R1’s routes when the session drops and has nowhere to send the traffic until they are re-sent, by End-of-RIB at 60 s.',
  'learning.concept.bgpgr.q1.a.why':
    'R1 forwards, but R2 no longer sends to it: without GR, R2 withdrew R1’s routes as soon as the session dropped.',
  'learning.concept.bgpgr.q1.b.why':
    'A session that is up has not yet re-sent its routes; R2 has none via R1 until the updates arrive, by End-of-RIB.',
  'learning.concept.bgpgr.q2.prompt':
    'The same restart, now with graceful restart negotiated and a Restart Time of 120 s. What does R2 do with R1’s routes while R1 restarts?',
  'learning.concept.bgpgr.q2.a': 'Keeps them as stale and forwards on them until End-of-RIB',
  'learning.concept.bgpgr.q2.b': 'Withdraws them, then waits up to 120 s for R1',
  'learning.concept.bgpgr.q2.c': 'Keeps them for exactly 120 s, then deletes them',
  'learning.concept.bgpgr.q2.why':
    'The helper marks the routes stale and keeps forwarding to R1, so no traffic is lost; at End-of-RIB (60 s) the re-sent routes replace them.',
  'learning.concept.bgpgr.q2.b.why':
    'Withdrawing them is what happens without GR, and the traffic would be lost; GR exists to keep them.',
  'learning.concept.bgpgr.q2.c.why':
    'The Restart Time only limits how long R2 waits for the session; once it is back, the stale routes stay until End-of-RIB.',
  'learning.concept.bgpgr.q3.prompt':
    'R1 loses power, forwarding plane included. GR is on (Restart Time 120 s), BFD at 300 ms × 3 notices in 0.9 s but its C bit is 0, so R2 treats it as a possible restart. R2 has a backup path via R3. How long is traffic lost?',
  'learning.concept.bgpgr.q3.a': 'About 0.9 s, until BFD notices',
  'learning.concept.bgpgr.q3.b': 'About 121 s, until the Restart Time ends',
  'learning.concept.bgpgr.q3.c': 'None: the backup path takes over',
  'learning.concept.bgpgr.q3.why':
    'R2 keeps the stale routes via the dead R1 for the whole Restart Time and moves to the backup only at 0.9 + 120 = 120.9 s.',
  'learning.concept.bgpgr.q3.a.why':
    'BFD noticed, but with the C bit at 0 a BFD failure may be just a restart, so the GR helper keeps the stale routes.',
  'learning.concept.bgpgr.q3.c.why':
    'The backup is used only when R2 has no route via R1, and it keeps a stale one for the Restart Time.',
  'learning.concept.bgpgr.q4.prompt':
    'Which change lets R2 keep GR for control-plane restarts but move to the backup within a second when R1 really dies?',
  'learning.concept.bgpgr.q4.a': 'BFD with the C bit at 1, independent of the control plane',
  'learning.concept.bgpgr.q4.b': 'A longer Restart Time on R1',
  'learning.concept.bgpgr.q4.c': 'A shorter BGP hold time on both routers',
  'learning.concept.bgpgr.q4.why':
    'A C-bit-1 BFD stays up through a control-plane restart, so GR still works; when it goes down the forwarding plane failed, and R2 drops the routes at 0.9 s.',
  'learning.concept.bgpgr.q4.b.why':
    'A longer Restart Time makes R2 keep forwarding into a dead router even longer.',
  'learning.concept.bgpgr.q4.c.why':
    'The hold time only changes when R2 notices; with GR it still keeps the stale routes for the Restart Time after that.',
};
