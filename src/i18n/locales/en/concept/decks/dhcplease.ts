import type { Catalog } from '../../../../types';

/** The `dhcplease` deck's questions (en); its name is in the core chunk. */
export const dhcplease: Catalog = {
  'learning.concept.dhcplease.q1.prompt':
    'A laptop has an 8-hour lease from its only DHCP server. The server crashes 1 hour later. When does the laptop first send a request that goes unanswered?',
  'learning.concept.dhcplease.q1.a': 'At 1 h: it notices the crash at once',
  'learning.concept.dhcplease.q1.b': 'At 4 h, when it asks to renew (T1)',
  'learning.concept.dhcplease.q1.c': 'At 8 h, when the lease runs out',
  'learning.concept.dhcplease.q1.why':
    'Client and server do not talk between renewals. The first message after the lease is the unicast DHCPREQUEST at T1, half of 8 h: 4 h. The laptop keeps working until the lease ends at 8 h.',
  'learning.concept.dhcplease.q1.a.why':
    'Nothing tells the client the server died: DHCP has no keepalive, so the crash goes unseen until the client next needs the server.',
  'learning.concept.dhcplease.q1.c.why':
    'The address is lost at 8 h, but the client has already been asking without answer since T1 at 4 h, and broadcasting since T2 at 7 h.',
  'learning.concept.dhcplease.q2.prompt':
    'A client with a 24-hour lease gets no answer to its renewals. When does it first broadcast its request so that any server may answer?',
  'learning.concept.dhcplease.q2.a': 'At 12 h, alongside its first renew',
  'learning.concept.dhcplease.q2.b': 'At 24 h, once the lease has ended',
  'learning.concept.dhcplease.q2.c': 'At 21 h, at T2 (7/8 of the lease)',
  'learning.concept.dhcplease.q2.why':
    'At T1 (12 h) it renews by unicast to its own server only. At T2, 0.875 × 24 h = 21 h, it enters REBINDING and broadcasts the DHCPREQUEST.',
  'learning.concept.dhcplease.q2.a.why':
    'Renewing at T1 is unicast to the server that gave the lease; the broadcast is kept as a fallback for T2.',
  'learning.concept.dhcplease.q2.b.why':
    'After the lease ends the client gives up the address and sends DHCPDISCOVER; the broadcast rebind comes earlier, at T2.',
  'learning.concept.dhcplease.q3.prompt':
    'An 8-hour lease; the server crashes 5 hours in and never returns. When does the client lose its address?',
  'learning.concept.dhcplease.q3.a': 'At 12 h: the 4 h renewal restarted the lease',
  'learning.concept.dhcplease.q3.b': 'At 8 h, when the first lease would end',
  'learning.concept.dhcplease.q3.c': 'At 13 h, 8 hours after the crash',
  'learning.concept.dhcplease.q3.why':
    'At T1, 4 h, the server was still up and renewed the lease for 8 h from then. That lease runs out at 12 h, after unanswered renewals from 8 h and rebinds from 11 h.',
  'learning.concept.dhcplease.q3.b.why':
    'The renewal at 4 h replaced the first lease with a new one counted from 4 h, so 8 h is no longer the end.',
  'learning.concept.dhcplease.q3.c.why':
    'A lease is counted from when it was granted, not from when the server failed: the last grant was at 4 h, so it ends at 12 h.',
  'learning.concept.dhcplease.q4.prompt':
    'A second server, B, knows the client’s lease. Server A dies before T1. Why is B first heard from at T2 and not at T1?',
  'learning.concept.dhcplease.q4.a': 'B waits until A has been silent for a while',
  'learning.concept.dhcplease.q4.b': 'B answers only after the client sends DISCOVER',
  'learning.concept.dhcplease.q4.c': 'The T1 renew is unicast to A; only rebind is broadcast',
  'learning.concept.dhcplease.q4.why':
    'Renewing goes by unicast to the server that granted the lease, so B never sees it. At T2 the client broadcasts, B answers, and the address is kept with a new lease.',
  'learning.concept.dhcplease.q4.a.why':
    'B does not watch A; it simply never receives the renew, which is addressed to A alone.',
  'learning.concept.dhcplease.q4.b.why':
    'B can answer the broadcast rebind at T2, before the lease ends, so the client keeps its address and never needs to DISCOVER.',
};
