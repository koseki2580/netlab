import type { ConceptDeck } from './types';

/** Concept-check decks — add a protocol by adding an entry here + its catalog keys. */
export const CONCEPT_DECKS: readonly ConceptDeck[] = [
  {
    id: 'arp',
    layer: 'l2',
    nameKey: 'learning.concept.arp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.arp.q1.prompt',
        explanationKey: 'learning.concept.arp.q1.why',
        options: [
          { key: 'learning.concept.arp.q1.a', correct: true },
          { key: 'learning.concept.arp.q1.b' },
          { key: 'learning.concept.arp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.arp.q2.prompt',
        explanationKey: 'learning.concept.arp.q2.why',
        options: [
          { key: 'learning.concept.arp.q2.a' },
          { key: 'learning.concept.arp.q2.b', correct: true },
          { key: 'learning.concept.arp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.arp.q3.prompt',
        explanationKey: 'learning.concept.arp.q3.why',
        options: [
          { key: 'learning.concept.arp.q3.a' },
          { key: 'learning.concept.arp.q3.b' },
          { key: 'learning.concept.arp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'stp',
    layer: 'l2',
    nameKey: 'learning.concept.stp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.stp.q1.prompt',
        explanationKey: 'learning.concept.stp.q1.why',
        options: [
          { key: 'learning.concept.stp.q1.a' },
          { key: 'learning.concept.stp.q1.b', correct: true },
          { key: 'learning.concept.stp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.stp.q2.prompt',
        explanationKey: 'learning.concept.stp.q2.why',
        options: [
          { key: 'learning.concept.stp.q2.a', correct: true },
          { key: 'learning.concept.stp.q2.b' },
          { key: 'learning.concept.stp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.stp.q3.prompt',
        explanationKey: 'learning.concept.stp.q3.why',
        options: [
          { key: 'learning.concept.stp.q3.a' },
          { key: 'learning.concept.stp.q3.b' },
          { key: 'learning.concept.stp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'vlan',
    layer: 'l2',
    nameKey: 'learning.concept.vlan.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.vlan.q1.prompt',
        explanationKey: 'learning.concept.vlan.q1.why',
        options: [
          { key: 'learning.concept.vlan.q1.a', correct: true },
          { key: 'learning.concept.vlan.q1.b' },
          { key: 'learning.concept.vlan.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.vlan.q2.prompt',
        explanationKey: 'learning.concept.vlan.q2.why',
        options: [
          { key: 'learning.concept.vlan.q2.a' },
          { key: 'learning.concept.vlan.q2.b', correct: true },
          { key: 'learning.concept.vlan.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.vlan.q3.prompt',
        explanationKey: 'learning.concept.vlan.q3.why',
        options: [
          { key: 'learning.concept.vlan.q3.a' },
          { key: 'learning.concept.vlan.q3.b' },
          { key: 'learning.concept.vlan.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'tcp',
    layer: 'l4',
    nameKey: 'learning.concept.tcp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.tcp.q1.prompt',
        explanationKey: 'learning.concept.tcp.q1.why',
        options: [
          { key: 'learning.concept.tcp.q1.a', correct: true },
          { key: 'learning.concept.tcp.q1.b' },
          { key: 'learning.concept.tcp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.tcp.q2.prompt',
        explanationKey: 'learning.concept.tcp.q2.why',
        options: [
          { key: 'learning.concept.tcp.q2.a' },
          { key: 'learning.concept.tcp.q2.b', correct: true },
          { key: 'learning.concept.tcp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.tcp.q3.prompt',
        explanationKey: 'learning.concept.tcp.q3.why',
        options: [
          { key: 'learning.concept.tcp.q3.a' },
          { key: 'learning.concept.tcp.q3.b' },
          { key: 'learning.concept.tcp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'udp',
    layer: 'l4',
    nameKey: 'learning.concept.udp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.udp.q1.prompt',
        explanationKey: 'learning.concept.udp.q1.why',
        options: [
          { key: 'learning.concept.udp.q1.a' },
          { key: 'learning.concept.udp.q1.b' },
          { key: 'learning.concept.udp.q1.c', correct: true },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.udp.q2.prompt',
        explanationKey: 'learning.concept.udp.q2.why',
        options: [
          { key: 'learning.concept.udp.q2.a' },
          { key: 'learning.concept.udp.q2.b', correct: true },
          { key: 'learning.concept.udp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.udp.q3.prompt',
        explanationKey: 'learning.concept.udp.q3.why',
        options: [
          { key: 'learning.concept.udp.q3.a', correct: true },
          { key: 'learning.concept.udp.q3.b' },
          { key: 'learning.concept.udp.q3.c' },
        ],
      },
    ],
  },
  {
    id: 'nat',
    layer: 'l3',
    nameKey: 'learning.concept.nat.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.nat.q1.prompt',
        explanationKey: 'learning.concept.nat.q1.why',
        options: [
          { key: 'learning.concept.nat.q1.a', correct: true },
          { key: 'learning.concept.nat.q1.b' },
          { key: 'learning.concept.nat.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.nat.q2.prompt',
        explanationKey: 'learning.concept.nat.q2.why',
        options: [
          { key: 'learning.concept.nat.q2.a' },
          { key: 'learning.concept.nat.q2.b', correct: true },
          { key: 'learning.concept.nat.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.nat.q3.prompt',
        explanationKey: 'learning.concept.nat.q3.why',
        options: [
          { key: 'learning.concept.nat.q3.a' },
          { key: 'learning.concept.nat.q3.b' },
          { key: 'learning.concept.nat.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'dns',
    layer: 'l7',
    nameKey: 'learning.concept.dns.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.dns.q1.prompt',
        explanationKey: 'learning.concept.dns.q1.why',
        options: [
          { key: 'learning.concept.dns.q1.a', correct: true },
          { key: 'learning.concept.dns.q1.b' },
          { key: 'learning.concept.dns.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.dns.q2.prompt',
        explanationKey: 'learning.concept.dns.q2.why',
        options: [
          { key: 'learning.concept.dns.q2.a' },
          { key: 'learning.concept.dns.q2.b', correct: true },
          { key: 'learning.concept.dns.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.dns.q3.prompt',
        explanationKey: 'learning.concept.dns.q3.why',
        options: [
          { key: 'learning.concept.dns.q3.a' },
          { key: 'learning.concept.dns.q3.b' },
          { key: 'learning.concept.dns.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'tls',
    layer: 'l5',
    nameKey: 'learning.concept.tls.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.tls.q1.prompt',
        explanationKey: 'learning.concept.tls.q1.why',
        options: [
          { key: 'learning.concept.tls.q1.a' },
          { key: 'learning.concept.tls.q1.b', correct: true },
          { key: 'learning.concept.tls.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.tls.q2.prompt',
        explanationKey: 'learning.concept.tls.q2.why',
        options: [
          { key: 'learning.concept.tls.q2.a' },
          { key: 'learning.concept.tls.q2.b' },
          { key: 'learning.concept.tls.q2.c', correct: true },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.tls.q3.prompt',
        explanationKey: 'learning.concept.tls.q3.why',
        options: [
          { key: 'learning.concept.tls.q3.a', correct: true },
          { key: 'learning.concept.tls.q3.b' },
          { key: 'learning.concept.tls.q3.c' },
        ],
      },
    ],
  },
];
