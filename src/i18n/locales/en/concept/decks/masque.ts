import type { Catalog } from '../../../../types';

/** The `masque` deck's questions (en); its name is in the core chunk. */
export const masque: Catalog = {
  'learning.concept.masque.q1.prompt':
    'Through two MASQUE relays (an ingress and an egress, run by different companies), who besides you knows both your address and that you visit news.example?',
  'learning.concept.masque.q1.a': 'The ingress relay, which you connect to',
  'learning.concept.masque.q1.b': 'The egress relay, which opens your request',
  'learning.concept.masque.q1.c': 'Nobody but you',
  'learning.concept.masque.q1.why':
    'Each relay holds half: the ingress knows who, the egress knows where. Only if their operators share notes can the two be linked.',
  'learning.concept.masque.q1.a.why':
    'The ingress relay sees your address but only a request sealed to the egress relay, so it never learns the site.',
  'learning.concept.masque.q1.b.why':
    'The egress relay learns the site, but the packets reach it from the ingress relay’s address, not yours.',
  'learning.concept.masque.q2.prompt':
    'With a single CONNECT-UDP proxy instead, what does that proxy learn?',
  'learning.concept.masque.q2.a': 'Both your address and which site you visit',
  'learning.concept.masque.q2.b': 'Only your address; the site stays sealed',
  'learning.concept.masque.q2.c': 'Only the site; your address stays hidden',
  'learning.concept.masque.q2.why':
    'One proxy receives your packets and is told where to send them, so it alone can link who and where — the reason private relays chain two hops.',
  'learning.concept.masque.q2.b.why':
    'The proxy has to be told where to forward (“CONNECT-UDP to news.example”), so it learns the site.',
  'learning.concept.masque.q2.c.why':
    'Your packets reach the proxy from your own address, so it sees who you are as well.',
  'learning.concept.masque.q3.prompt':
    'With two relays, can the egress relay read the page you read on the site?',
  'learning.concept.masque.q3.a': 'Yes: it decrypts the request to forward it',
  'learning.concept.masque.q3.b': 'No: your QUIC to the site is sealed end to end',
  'learning.concept.masque.q3.c': 'Yes: HTTP/3 proxies always terminate TLS',
  'learning.concept.masque.q3.why':
    'Your own QUIC connection to the site travels inside the proxy layers, as HTTP Datagrams; only the site holds its keys.',
  'learning.concept.masque.q3.a.why':
    'It opens only its own layer (“connect to this host”); inside is your QUIC connection, keyed with the site.',
  'learning.concept.masque.q3.c.why':
    'CONNECT-UDP relays the inner QUIC as datagrams without terminating it; the proxy’s TLS covers only its own layer.',
  'learning.concept.masque.q4.prompt':
    'With two relays, which address does news.example see your traffic coming from?',
  'learning.concept.masque.q4.a': 'The egress relay’s address',
  'learning.concept.masque.q4.b': 'Your own address, carried inside',
  'learning.concept.masque.q4.c': 'The ingress relay’s address',
  'learning.concept.masque.q4.why':
    'Every hop sends from its own address, so the site sees the egress relay — usually one near you, which reveals only your region.',
  'learning.concept.masque.q4.b.why':
    'No layer carries your address onward; each hop sends from its own address.',
  'learning.concept.masque.q4.c.why':
    'The ingress relay sends only to the egress relay; the last stretch to the site comes from the egress relay.',
};
