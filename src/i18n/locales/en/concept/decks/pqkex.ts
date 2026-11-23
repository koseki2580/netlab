import type { Catalog } from '../../../../types';

/** The `pqkex` deck's questions (en); its name is in the core chunk. */
export const pqkex: Catalog = {
  'learning.concept.pqkex.q1.prompt':
    'A TLS session is recorded today. Which key exchange keeps its key secret against today’s computers, a future quantum computer and a flaw found later in ML-KEM — all three?',
  'learning.concept.pqkex.q1.a': 'X25519 alone, the long-proven curve',
  'learning.concept.pqkex.q1.b': 'ML-KEM-768 alone, the post-quantum one',
  'learning.concept.pqkex.q1.c': 'The hybrid X25519MLKEM768',
  'learning.concept.pqkex.q1.why':
    'The hybrid derives the session key from both shared secrets, so it falls only if both components fall — and none of the three attackers breaks both.',
  'learning.concept.pqkex.q1.a.why':
    'A large quantum computer running Shor’s algorithm solves X25519’s elliptic-curve problem.',
  'learning.concept.pqkex.q1.b.why':
    'ML-KEM is still young; a flaw found in it later would expose every session it alone protected.',
  'learning.concept.pqkex.q2.prompt':
    'Traffic protected by X25519 alone is recorded today. Years later a large quantum computer exists. What then?',
  'learning.concept.pqkex.q2.a': 'Its session key can be recovered and read',
  'learning.concept.pqkex.q2.b': 'It stays safe: forward secrecy protects it',
  'learning.concept.pqkex.q2.c': 'It stays safe: it was secure when sent',
  'learning.concept.pqkex.q2.why':
    'The recording holds both X25519 public keys; a quantum computer can solve for a private key and recompute the session key — “harvest now, decrypt later”.',
  'learning.concept.pqkex.q2.b.why':
    'Forward secrecy guards against a server key stolen later, not against solving the key exchange itself from the recording.',
  'learning.concept.pqkex.q2.c.why':
    'A recording keeps; “harvest now, decrypt later” attacks exactly the gap between sending and breaking.',
  'learning.concept.pqkex.q3.prompt':
    'A browser’s ClientHello is about 480 bytes plus its key share. With the hybrid share, on a path whose TCP segments carry 1,460 bytes, what happens?',
  'learning.concept.pqkex.q3.a': 'It still fits one segment, a little larger',
  'learning.concept.pqkex.q3.b': 'It spills over into a second TCP segment',
  'learning.concept.pqkex.q3.c': 'It needs an extra round trip to finish',
  'learning.concept.pqkex.q3.why':
    'The hybrid share is 1,216 bytes (1,184 of ML-KEM + 32 of X25519), so the hello is about 1,696 bytes and arrives in two segments; with X25519 alone (about 512) it fit in one.',
  'learning.concept.pqkex.q3.a.why':
    'The hybrid share alone is 1,216 bytes, so the hello grows to about 1,696 — more than one 1,460-byte segment.',
  'learning.concept.pqkex.q3.c.why':
    'Both segments go out in the same flight, so no round trip is added — but middleboxes that expected the whole hello in one packet broke.',
};
