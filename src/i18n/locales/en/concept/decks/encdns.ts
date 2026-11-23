import type { Catalog } from '../../../../types';

/** The `encdns` deck's questions (en); its name is in the core chunk. */
export const encdns: Catalog = {
  'learning.concept.encdns.q1.prompt':
    'A café’s network blocks encrypted DNS by port number so it can keep reading names. Which method can it not block that way without also blocking the web?',
  'learning.concept.encdns.q1.a': 'DNS over TLS, on TCP 853',
  'learning.concept.encdns.q1.b': 'DNS over HTTPS, on TCP 443',
  'learning.concept.encdns.q1.c': 'DNS over QUIC, on UDP 853',
  'learning.concept.encdns.q1.why':
    'DoH travels inside ordinary HTTPS on TCP 443; to stop it the network has to know the resolver’s address and block that.',
  'learning.concept.encdns.q1.a.why':
    'Port 853 carries only DNS, so one rule blocks DoT; the device then falls back to plain DNS or fails to resolve.',
  'learning.concept.encdns.q1.c.why':
    'DoQ also has its own port, UDP 853, so blocking it costs the café nothing else.',
  'learning.concept.encdns.q2.prompt':
    'With classic DNS on UDP 53, what can the café’s network do to your lookup?',
  'learning.concept.encdns.q2.a': 'Read the name, but not change the answer',
  'learning.concept.encdns.q2.b': 'Only see that some lookup took place',
  'learning.concept.encdns.q2.c': 'Read the name and forge the answer too',
  'learning.concept.encdns.q2.why':
    'Classic DNS is neither encrypted nor authenticated on the way to the resolver: the network reads the name and can reply first with an answer of its own.',
  'learning.concept.encdns.q2.a.why':
    'Nothing protects the answer on the path, so the network can answer in the resolver’s place.',
  'learning.concept.encdns.q2.b.why': 'The question is plain text on the wire, name included.',
  'learning.concept.encdns.q3.prompt':
    'You switch to DNS over TLS. Who can still read every name you look up?',
  'learning.concept.encdns.q3.a': 'The resolver you chose',
  'learning.concept.encdns.q3.b': 'Nobody: it is encrypted to the site',
  'learning.concept.encdns.q3.c': 'The café, by watching port 853',
  'learning.concept.encdns.q3.why':
    'Encrypted DNS protects the path, not the endpoint: it moves your trust from the local network to the resolver you chose.',
  'learning.concept.encdns.q3.b.why':
    'The encryption runs from you to the resolver, which must read the question to answer it.',
  'learning.concept.encdns.q3.c.why':
    'The café sees that you use port 853 and which resolver you talk to, but not the names inside.',
};
