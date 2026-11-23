import type { Catalog } from '../../../../types';

/** The `happyeyeballs` deck's questions (en); its name is in the core chunk. */
export const happyeyeballs: Catalog = {
  'learning.concept.happyeyeballs.q1.prompt':
    'A dual-stack laptop gets both AAAA and A answers, but IPv6 packets are silently dropped on the way. A Happy Eyeballs v2 browser connects…',
  'learning.concept.happyeyeballs.q1.a': 'Over IPv6, after resending until it gets through',
  'learning.concept.happyeyeballs.q1.b': 'Not at all; IPv6 must be turned off first',
  'learning.concept.happyeyeballs.q1.c': 'Over IPv4, a little over 250 ms after it starts',
  'learning.concept.happyeyeballs.q1.why':
    'It starts IPv6 first and, if IPv6 has not connected within 250 ms, starts IPv4 alongside; IPv4 connects one round trip later, at about 280 ms.',
  'learning.concept.happyeyeballs.q2.prompt':
    'IPv6 works but takes 300 ms per round trip; IPv4 takes 30 ms. A Happy Eyeballs v2 client ends up on…',
  'learning.concept.happyeyeballs.q2.a': 'IPv4, at 280 ms, ahead of IPv6',
  'learning.concept.happyeyeballs.q2.b': 'IPv6, at 300 ms, as it is preferred',
  'learning.concept.happyeyeballs.q2.c': 'IPv4, at 30 ms, as both start at once',
  'learning.concept.happyeyeballs.q2.why':
    'IPv6 is not up by 250 ms, so IPv4 starts then and connects at 250 + 30 = 280 ms, before IPv6 would at 300 ms. The first to connect wins.',
  'learning.concept.happyeyeballs.q3.prompt':
    'With IPv6 silently broken, a client that tries one address at a time (IPv6, then IPv4) connects after about…',
  'learning.concept.happyeyeballs.q3.a': '280 ms, like Happy Eyeballs does',
  'learning.concept.happyeyeballs.q3.b': '21 s, once IPv6 has timed out',
  'learning.concept.happyeyeballs.q3.c': '30 ms, as IPv4 is quicker',
  'learning.concept.happyeyeballs.q3.why':
    'It waits for the IPv6 attempt to time out before trying IPv4: with Windows’ default connect timeout that is 3 + 6 + 12 = 21 s, which is why Happy Eyeballs exists.',
  'learning.concept.happyeyeballs.q4.prompt':
    'A phone on an IPv6-only network looks up a site whose only address is 192.0.2.33. The DNS64 resolver answers with…',
  'learning.concept.happyeyeballs.q4.a': 'The A record, so the phone uses IPv4 for it',
  'learning.concept.happyeyeballs.q4.b': 'An error, as the site has no AAAA record',
  'learning.concept.happyeyeballs.q4.c': 'An AAAA of 64:ff9b::c000:221 with that IPv4 in it',
  'learning.concept.happyeyeballs.q4.why':
    'DNS64 makes up an AAAA by putting the IPv4 address in the last 32 bits of 64:ff9b::/96; the NAT64 on the way out takes it back out and sends the packet over IPv4.',
  'learning.concept.happyeyeballs.q1.a.why':
    'Nothing comes back to say IPv6 is broken, so resending does not help; the browser races IPv4 instead of waiting.',
  'learning.concept.happyeyeballs.q1.b.why':
    'That is the problem Happy Eyeballs solves: the user changes nothing, and IPv4 takes over within a fraction of a second.',
  'learning.concept.happyeyeballs.q2.b.why':
    'Preference only decides which goes first; IPv4 starts 250 ms later and connects at 280 ms, before IPv6 does at 300 ms.',
  'learning.concept.happyeyeballs.q2.c.why':
    'The two are not started together: IPv4 waits for the 250 ms Connection Attempt Delay, so it connects at 280 ms, not 30.',
  'learning.concept.happyeyeballs.q3.a.why':
    'Only Happy Eyeballs starts IPv4 while IPv6 is still pending; this client waits for the dead IPv6 attempt to time out.',
  'learning.concept.happyeyeballs.q3.c.why':
    'IPv4 is quick once tried, but this client tries it only after giving up on IPv6, about 21 s later.',
  'learning.concept.happyeyeballs.q4.a.why':
    'An IPv6-only phone has no IPv4 to use; DNS64 gives it an IPv6 address that leads to the site through the NAT64.',
  'learning.concept.happyeyeballs.q4.b.why':
    'Making up an AAAA where there is none is exactly DNS64’s job; an error would leave IPv4-only sites unreachable.',
};
