import type { Catalog } from '../../../../types';

/** The `dnssec` deck's questions (en); its name is in the core chunk. */
export const dnssec: Catalog = {
  'learning.concept.dnssec.q1.b.why':
    'DNSSEC adds validation work, not speed; it attaches signatures so records can be verified authentic.',
  'learning.concept.dnssec.q1.c.why':
    'IP assignment is DHCP; DNSSEC signs DNS records so resolvers can detect tampering.',
  'learning.concept.dnssec.q2.a.why':
    'DNSSEC does not encrypt — it authenticates; query privacy is a separate problem solved by DoH/DoT.',
  'learning.concept.dnssec.q2.c.why':
    'It is not about encrypting any zone; DNSSEC signs records for integrity, while DoH/DoT add confidentiality.',
  'learning.concept.dnssec.q3.a.why':
    'Blind trust would defeat the purpose; DNSSEC builds a chain of trust from the root down via DS records.',
  'learning.concept.dnssec.q3.b.why':
    'IP allow-lists are not how DNSSEC works; trust flows from the root, each zone’s key signed by its parent.',
  'learning.concept.dnssec.q1.prompt': 'What does DNSSEC add to DNS?',
  'learning.concept.dnssec.q1.a': 'Cryptographic signatures a resolver can verify',
  'learning.concept.dnssec.q1.b': 'Faster lookups by caching more aggressively',
  'learning.concept.dnssec.q1.c': 'Automatic IP assignment for new hosts',
  'learning.concept.dnssec.q1.why':
    'DNSSEC signs records (RRSIG) under zone keys (DNSKEY), letting resolvers detect tampering and forged answers (cache poisoning).',
  'learning.concept.dnssec.q2.prompt': 'Does DNSSEC encrypt your DNS queries?',
  'learning.concept.dnssec.q2.a': 'Yes, fully end to end between you and the server',
  'learning.concept.dnssec.q2.b':
    'No — it authenticates responses; confidentiality is a separate problem',
  'learning.concept.dnssec.q2.c': 'Only for queries that reach the root zone',
  'learning.concept.dnssec.q2.why':
    'DNSSEC proves answers are genuine but is sent in clear; encrypting the query is what DNS-over-HTTPS/TLS adds.',
  'learning.concept.dnssec.q3.prompt': 'How is trust established in DNSSEC?',
  'learning.concept.dnssec.q3.a': 'Every resolver trusts every zone by default',
  'learning.concept.dnssec.q3.b': 'By IP allow-lists kept at each resolver',
  'learning.concept.dnssec.q3.c': 'A chain of trust from the root down, via DS records',
  'learning.concept.dnssec.q3.why':
    'A parent zone publishes a DS record hashing the child’s key, so validation walks root→TLD→domain — anchored at the trusted root key.',
};
