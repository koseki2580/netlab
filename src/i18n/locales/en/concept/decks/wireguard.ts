import type { Catalog } from '../../../../types';

/** The `wireguard` deck's questions (en); its name is in the core chunk. */
export const wireguard: Catalog = {
  'learning.concept.wireguard.q1.a.why':
    'WireGuard avoids TCP+TLS overhead; it runs over UDP on a single port — lean and NAT-friendly.',
  'learning.concept.wireguard.q1.c.why':
    'ICMP is for diagnostics; WireGuard runs over UDP on one port.',
  'learning.concept.wireguard.q2.a.why':
    'WireGuard uses no passwords; each peer is identified by its public key, bound to a set of allowed IPs.',
  'learning.concept.wireguard.q2.b.why':
    'A MAC is a local L2 address that doesn’t cross routers; WireGuard pins each peer’s public key to allowed IPs.',
  'learning.concept.wireguard.q3.b.why':
    'WireGuard is always encrypted; it is simpler because of a tiny codebase and fixed modern crypto, not by skipping encryption.',
  'learning.concept.wireguard.q3.c.why':
    'WireGuard is cross-platform; its speed comes from a small kernel implementation and no cipher negotiation.',
  'learning.concept.wireguard.q1.prompt': 'WireGuard runs over…',
  'learning.concept.wireguard.q1.a': 'TCP, with a full TLS handshake first',
  'learning.concept.wireguard.q1.b': 'UDP, on one lightweight port',
  'learning.concept.wireguard.q1.c': 'ICMP, the way ping does',
  'learning.concept.wireguard.q1.why':
    'WireGuard is a UDP protocol; using one port keeps it fast and easy to pass through NAT and firewalls.',
  'learning.concept.wireguard.q2.prompt': 'WireGuard identifies each peer by…',
  'learning.concept.wireguard.q2.a': 'A username and password pair',
  'learning.concept.wireguard.q2.b': 'Its MAC address on the link',
  'learning.concept.wireguard.q2.c': 'Its public key, pinned to allowed IPs',
  'learning.concept.wireguard.q2.why':
    'Each peer has a static keypair; the public key plus AllowedIPs defines who may send which source addresses (cryptokey routing).',
  'learning.concept.wireguard.q3.prompt':
    'WireGuard is considered simpler and faster than IPsec because…',
  'learning.concept.wireguard.q3.a': 'It has a tiny codebase and fixed modern crypto',
  'learning.concept.wireguard.q3.b': 'It skips encryption entirely for speed',
  'learning.concept.wireguard.q3.c': 'It only works on one operating system',
  'learning.concept.wireguard.q3.why':
    'No ciphersuite negotiation (one modern set), a small auditable codebase, and an in-kernel data path give it low overhead.',
};
