import type { Catalog } from '../../../../types';

/** The `acl` deck's questions (en); its name is in the core chunk. */
export const acl: Catalog = {
  'learning.concept.acl.q1.prompt': 'An ACL filters traffic by…',
  'learning.concept.acl.q1.a': 'Matching packet fields against permit/deny rules',
  'learning.concept.acl.q1.b': 'Encrypting the payload so only the peer reads it',
  'learning.concept.acl.q1.c': 'Compressing the payload to save bandwidth',
  'learning.concept.acl.q1.why':
    'An access control list checks fields like src/dst IP and port against ordered rules and permits or denies.',
  'learning.concept.acl.q2.prompt': 'A stateful firewall differs from a stateless ACL by…',
  'learning.concept.acl.q2.a': 'Being slower in every case',
  'learning.concept.acl.q2.b': 'Tracking connections so replies are allowed',
  'learning.concept.acl.q2.c': 'Ignoring port numbers entirely',
  'learning.concept.acl.q2.why':
    'A stateful firewall remembers established flows and permits their return traffic without an explicit reverse rule.',
  'learning.concept.acl.q3.prompt': 'A common secure default for a firewall is…',
  'learning.concept.acl.q3.a': 'Permit any any at the top',
  'learning.concept.acl.q3.b': 'No rules at all on the interface',
  'learning.concept.acl.q3.c': 'Default deny — block unless explicitly allowed',
  'learning.concept.acl.q3.why':
    'Default-deny means only explicitly permitted traffic passes, shrinking the attack surface.',
  'learning.concept.acl.q1.b.why':
    'An ACL does not encrypt; it matches packet fields against ordered permit/deny rules.',
  'learning.concept.acl.q1.c.why':
    'Compression saves bandwidth, unrelated to filtering; an ACL permits or denies by matching packet fields.',
  'learning.concept.acl.q2.a.why':
    'Stateful inspection is not always slower — the state table often shortcuts rule evaluation for established flows.',
  'learning.concept.acl.q2.c.why':
    'Both inspect ports; a stateful firewall additionally tracks connection state to permit replies automatically.',
  'learning.concept.acl.q3.a.why':
    '“Permit any any” allows everything; a secure default denies first and permits only what is needed.',
  'learning.concept.acl.q3.b.why':
    'No rules often means an implicit allow or undefined behavior; secure design is an explicit default-deny.',
};
