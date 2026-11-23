import type { Catalog } from '../../../../types';

/** The `netconf` deck's questions (en); its name is in the core chunk. */
export const netconf: Catalog = {
  'learning.concept.netconf.q1.prompt':
    'R2’s NETCONF change sets a description, adds an address and sets an MTU of 10000; its model allows 68–9216. After edit-config into the candidate, validate and commit, what is in R2’s running config?',
  'learning.concept.netconf.q1.a': 'The description and address, but not the MTU',
  'learning.concept.netconf.q1.b': 'All three, with the MTU capped at 9216',
  'learning.concept.netconf.q1.c': 'None of them: running is exactly as before',
  'learning.concept.netconf.q1.why':
    'The MTU is outside the YANG range 68–9216, so R2 answers invalid-value at …/ipv4/mtu (a range is checked as soon as the edit reaches the candidate, and <validate> would catch it too). Nothing is committed: the edits are discarded and running is unchanged.',
  'learning.concept.netconf.q1.a.why':
    'That is what a line-by-line CLI script leaves. With a candidate the whole change is validated first, and a failed validation commits nothing.',
  'learning.concept.netconf.q1.b.why':
    'A YANG range is a constraint, not a clamp: an out-of-range value is rejected with invalid-value.',
  'learning.concept.netconf.q2.prompt':
    'The same three changes go to R2 as a CLI script, one line at a time, ending with ip mtu 10000. What is left on R2?',
  'learning.concept.netconf.q2.a': 'Description and new address live, MTU still 1500',
  'learning.concept.netconf.q2.b': 'Nothing: the router undoes the earlier lines',
  'learning.concept.netconf.q2.c': 'Only the description; the address waits for the MTU',
  'learning.concept.netconf.q2.why':
    'The description and address lines went live as they were entered; the script stopped at ip mtu 10000. R2 is half-configured, and the script now has to notice and repair it.',
  'learning.concept.netconf.q2.b.why':
    'A CLI applies each line the moment it is entered; nothing groups the lines, so nothing undoes those before the error.',
  'learning.concept.netconf.q2.c.why':
    'Lines do not wait for each other: the address line was live as soon as the router accepted it.',
  'learning.concept.netconf.q3.prompt':
    'An orchestrator pushes to R1, R2 and R3 all-or-none: it validates every candidate and commits only if all are valid. Only R2’s MTU is out of range. What happens to R1 and R3?',
  'learning.concept.netconf.q3.a': 'They commit, and only R2 stays unchanged',
  'learning.concept.netconf.q3.b': 'Their candidates are discarded too',
  'learning.concept.netconf.q3.c': 'They commit, then roll back when R2 fails',
  'learning.concept.netconf.q3.why':
    'R2’s candidate fails validation, so the orchestrator discards all three candidates: R1 and R3 are aborted, and the three routers stay consistent.',
  'learning.concept.netconf.q3.a.why':
    'That is a per-device push. All-or-none commits nowhere unless every candidate validated.',
  'learning.concept.netconf.q3.c.why':
    'Nothing is committed and then undone: every candidate is validated before any commit, so R1 and R3 never change.',
  'learning.concept.netconf.q4.prompt':
    'A change sent with <commit><confirmed/> shuts eth0, the interface the script reaches R2 through. What happens?',
  'learning.concept.netconf.q4.a': 'eth0 stays shut until someone reaches the console',
  'learning.concept.netconf.q4.b': 'R2 refuses the commit, as it would cut the session',
  'learning.concept.netconf.q4.c': 'R2 restores the old config itself after the timeout',
  'learning.concept.netconf.q4.why':
    'The script loses R2 the moment eth0 shuts, so no confirming <commit> can arrive; when the confirm-timeout (600 s by default) runs out, or sooner if R2 notices the session has ended, R2 rolls back by itself and eth0 is up again.',
  'learning.concept.netconf.q4.a.why':
    'That is a plain commit. A confirmed commit is undone unless a confirming <commit> arrives in time, and here none can.',
  'learning.concept.netconf.q4.b.why':
    'The change is valid by the model, so it is committed; the router does not judge which interface carries the session.',
};
