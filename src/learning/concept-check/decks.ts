import type { ConceptDeck, ConceptLayer, ConceptQuestion } from './types';

type Answer = 'a' | 'b' | 'c';

/**
 * A question whose catalog keys follow the one pattern every deck uses:
 * `learning.concept.<deck>.<question>` + `.prompt`, `.why`, `.a`–`.c`, and
 * `.<option>.why` for each wrong option (its distractor explanation). Built here
 * so the decks carry no key strings: they ride in a shared chunk.
 */
function question(deck: string, id: string, answer: Answer): ConceptQuestion {
  const base = `learning.concept.${deck}.${id}`;
  return {
    id,
    promptKey: `${base}.prompt`,
    explanationKey: `${base}.why`,
    options: (['a', 'b', 'c'] as const).map((letter) =>
      letter === answer
        ? { key: `${base}.${letter}`, correct: true }
        : { key: `${base}.${letter}`, whyKey: `${base}.${letter}.why` },
    ),
  };
}

/** A deck: its id, its layer, and each question's id with the letter of its answer. */
function deck(
  id: string,
  layer: ConceptLayer,
  questions: readonly (readonly [string, Answer])[],
): ConceptDeck {
  return {
    id,
    layer,
    nameKey: `learning.concept.${id}.name`,
    questions: questions.map(([questionId, answer]) => question(id, questionId, answer)),
  };
}

/** Concept-check decks — add a protocol by adding an entry here + its catalog keys. */
export const CONCEPT_DECKS: readonly ConceptDeck[] = [
  deck('arp', 'l2', [
    ['q4', 'a'],
    ['q5', 'b'],
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('stp', 'l2', [
    ['q1', 'b'],
    ['q2', 'a'],
    ['q3', 'c'],
  ]),
  deck('vlan', 'l2', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('tcp', 'l4', [
    ['q4', 'a'],
    ['q5', 'b'],
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('udp', 'l4', [
    ['q4', 'a'],
    ['q5', 'b'],
    ['q1', 'c'],
    ['q2', 'b'],
    ['q3', 'a'],
  ]),
  deck('nat', 'l3', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('dns', 'l7', [
    ['q4', 'a'],
    ['q5', 'b'],
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('tls', 'l5', [
    ['q1', 'b'],
    ['q2', 'c'],
    ['q3', 'a'],
  ]),
  deck('ethernet', 'l2', [
    ['q4', 'a'],
    ['q5', 'b'],
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('dhcp', 'l7', [
    ['q1', 'b'],
    ['q2', 'a'],
    ['q3', 'c'],
  ]),
  deck('icmp', 'l3', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('ipv4', 'l3', [
    ['q4', 'a'],
    ['q5', 'b'],
    ['q1', 'b'],
    ['q2', 'a'],
    ['q3', 'c'],
  ]),
  deck('ipv6', 'l3', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('ospf', 'routing', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('bgp', 'routing', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('rip', 'routing', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('http', 'l7', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('quic', 'l4', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('http2', 'l7', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('http3', 'l7', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('qos', 'l3', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('ecmp', 'routing', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('vrrp', 'l3', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('multicast', 'l3', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('mtu', 'l3', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('gre', 'l3', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('mpls', 'routing', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('vxlan', 'l2', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('wifi', 'l2', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('acl', 'l5', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('model', 'fundamentals', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
    ['q4', 'a'],
    ['q5', 'b'],
    ['q6', 'c'],
  ]),
  deck('addressing', 'fundamentals', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
    ['q4', 'a'],
    ['q5', 'b'],
    ['q6', 'c'],
  ]),
  deck('ports', 'fundamentals', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
    ['q4', 'a'],
    ['q5', 'b'],
    ['q6', 'c'],
  ]),
  deck('ssh', 'l5', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('ftp', 'l7', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('smtp', 'l7', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('email', 'l7', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('ntp', 'l7', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('snmp', 'l7', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('ipsec', 'l5', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('radius', 'l5', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('isis', 'routing', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('eigrp', 'routing', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('lacp', 'l2', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('lldp', 'l2', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('tunneling', 'l3', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('vpn', 'l5', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('wireguard', 'l5', [
    ['q1', 'b'],
    ['q2', 'c'],
    ['q3', 'a'],
  ]),
  deck('l2tp', 'l5', [
    ['q1', 'b'],
    ['q2', 'a'],
    ['q3', 'c'],
  ]),
  deck('pppoe', 'l2', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('ndp', 'l3', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('sip', 'l7', [
    ['q1', 'b'],
    ['q2', 'c'],
    ['q3', 'a'],
  ]),
  deck('rtp', 'l7', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('stun', 'l7', [
    ['q1', 'c'],
    ['q2', 'a'],
    ['q3', 'b'],
  ]),
  deck('dnssec', 'l7', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck('commands', 'fundamentals', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'a'],
    ['q4', 'c'],
    ['q5', 'b'],
    ['q6', 'c'],
  ]),
];
