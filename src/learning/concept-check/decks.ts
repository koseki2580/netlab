import type { ConceptDeck } from './types';

/** Concept-check decks — add a protocol by adding an entry here + its catalog keys. */
export const CONCEPT_DECKS: readonly ConceptDeck[] = [
  {
    id: 'arp',
    layer: 'l2',
    nameKey: 'learning.concept.arp.name',
    questions: [
      {
        id: 'q4',
        promptKey: 'learning.concept.arp.q4.prompt',
        explanationKey: 'learning.concept.arp.q4.why',
        options: [
          { key: 'learning.concept.arp.q4.a', correct: true },
          { key: 'learning.concept.arp.q4.b' },
          { key: 'learning.concept.arp.q4.c' },
        ],
      },
      {
        id: 'q5',
        promptKey: 'learning.concept.arp.q5.prompt',
        explanationKey: 'learning.concept.arp.q5.why',
        options: [
          { key: 'learning.concept.arp.q5.a' },
          { key: 'learning.concept.arp.q5.b', correct: true },
          { key: 'learning.concept.arp.q5.c' },
        ],
      },
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
        id: 'q4',
        promptKey: 'learning.concept.tcp.q4.prompt',
        explanationKey: 'learning.concept.tcp.q4.why',
        options: [
          { key: 'learning.concept.tcp.q4.a', correct: true },
          { key: 'learning.concept.tcp.q4.b' },
          { key: 'learning.concept.tcp.q4.c' },
        ],
      },
      {
        id: 'q5',
        promptKey: 'learning.concept.tcp.q5.prompt',
        explanationKey: 'learning.concept.tcp.q5.why',
        options: [
          { key: 'learning.concept.tcp.q5.a' },
          { key: 'learning.concept.tcp.q5.b', correct: true },
          { key: 'learning.concept.tcp.q5.c' },
        ],
      },
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
        id: 'q4',
        promptKey: 'learning.concept.udp.q4.prompt',
        explanationKey: 'learning.concept.udp.q4.why',
        options: [
          { key: 'learning.concept.udp.q4.a', correct: true },
          { key: 'learning.concept.udp.q4.b' },
          { key: 'learning.concept.udp.q4.c' },
        ],
      },
      {
        id: 'q5',
        promptKey: 'learning.concept.udp.q5.prompt',
        explanationKey: 'learning.concept.udp.q5.why',
        options: [
          { key: 'learning.concept.udp.q5.a' },
          { key: 'learning.concept.udp.q5.b', correct: true },
          { key: 'learning.concept.udp.q5.c' },
        ],
      },
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
        id: 'q4',
        promptKey: 'learning.concept.dns.q4.prompt',
        explanationKey: 'learning.concept.dns.q4.why',
        options: [
          { key: 'learning.concept.dns.q4.a', correct: true },
          { key: 'learning.concept.dns.q4.b' },
          { key: 'learning.concept.dns.q4.c' },
        ],
      },
      {
        id: 'q5',
        promptKey: 'learning.concept.dns.q5.prompt',
        explanationKey: 'learning.concept.dns.q5.why',
        options: [
          { key: 'learning.concept.dns.q5.a' },
          { key: 'learning.concept.dns.q5.b', correct: true },
          { key: 'learning.concept.dns.q5.c' },
        ],
      },
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
  {
    id: 'ethernet',
    layer: 'l2',
    nameKey: 'learning.concept.ethernet.name',
    questions: [
      {
        id: 'q4',
        promptKey: 'learning.concept.ethernet.q4.prompt',
        explanationKey: 'learning.concept.ethernet.q4.why',
        options: [
          { key: 'learning.concept.ethernet.q4.a', correct: true },
          { key: 'learning.concept.ethernet.q4.b' },
          { key: 'learning.concept.ethernet.q4.c' },
        ],
      },
      {
        id: 'q5',
        promptKey: 'learning.concept.ethernet.q5.prompt',
        explanationKey: 'learning.concept.ethernet.q5.why',
        options: [
          { key: 'learning.concept.ethernet.q5.a' },
          { key: 'learning.concept.ethernet.q5.b', correct: true },
          { key: 'learning.concept.ethernet.q5.c' },
        ],
      },
      {
        id: 'q1',
        promptKey: 'learning.concept.ethernet.q1.prompt',
        explanationKey: 'learning.concept.ethernet.q1.why',
        options: [
          { key: 'learning.concept.ethernet.q1.a', correct: true },
          { key: 'learning.concept.ethernet.q1.b' },
          { key: 'learning.concept.ethernet.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.ethernet.q2.prompt',
        explanationKey: 'learning.concept.ethernet.q2.why',
        options: [
          { key: 'learning.concept.ethernet.q2.a' },
          { key: 'learning.concept.ethernet.q2.b', correct: true },
          { key: 'learning.concept.ethernet.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.ethernet.q3.prompt',
        explanationKey: 'learning.concept.ethernet.q3.why',
        options: [
          { key: 'learning.concept.ethernet.q3.a' },
          { key: 'learning.concept.ethernet.q3.b' },
          { key: 'learning.concept.ethernet.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'dhcp',
    layer: 'l7',
    nameKey: 'learning.concept.dhcp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.dhcp.q1.prompt',
        explanationKey: 'learning.concept.dhcp.q1.why',
        options: [
          { key: 'learning.concept.dhcp.q1.a' },
          { key: 'learning.concept.dhcp.q1.b', correct: true },
          { key: 'learning.concept.dhcp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.dhcp.q2.prompt',
        explanationKey: 'learning.concept.dhcp.q2.why',
        options: [
          { key: 'learning.concept.dhcp.q2.a', correct: true },
          { key: 'learning.concept.dhcp.q2.b' },
          { key: 'learning.concept.dhcp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.dhcp.q3.prompt',
        explanationKey: 'learning.concept.dhcp.q3.why',
        options: [
          { key: 'learning.concept.dhcp.q3.a' },
          { key: 'learning.concept.dhcp.q3.b' },
          { key: 'learning.concept.dhcp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'icmp',
    layer: 'l3',
    nameKey: 'learning.concept.icmp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.icmp.q1.prompt',
        explanationKey: 'learning.concept.icmp.q1.why',
        options: [
          { key: 'learning.concept.icmp.q1.a', correct: true },
          { key: 'learning.concept.icmp.q1.b' },
          { key: 'learning.concept.icmp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.icmp.q2.prompt',
        explanationKey: 'learning.concept.icmp.q2.why',
        options: [
          { key: 'learning.concept.icmp.q2.a' },
          { key: 'learning.concept.icmp.q2.b', correct: true },
          { key: 'learning.concept.icmp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.icmp.q3.prompt',
        explanationKey: 'learning.concept.icmp.q3.why',
        options: [
          { key: 'learning.concept.icmp.q3.a' },
          { key: 'learning.concept.icmp.q3.b' },
          { key: 'learning.concept.icmp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'ipv4',
    layer: 'l3',
    nameKey: 'learning.concept.ipv4.name',
    questions: [
      {
        id: 'q4',
        promptKey: 'learning.concept.ipv4.q4.prompt',
        explanationKey: 'learning.concept.ipv4.q4.why',
        options: [
          { key: 'learning.concept.ipv4.q4.a', correct: true },
          { key: 'learning.concept.ipv4.q4.b' },
          { key: 'learning.concept.ipv4.q4.c' },
        ],
      },
      {
        id: 'q5',
        promptKey: 'learning.concept.ipv4.q5.prompt',
        explanationKey: 'learning.concept.ipv4.q5.why',
        options: [
          { key: 'learning.concept.ipv4.q5.a' },
          { key: 'learning.concept.ipv4.q5.b', correct: true },
          { key: 'learning.concept.ipv4.q5.c' },
        ],
      },
      {
        id: 'q1',
        promptKey: 'learning.concept.ipv4.q1.prompt',
        explanationKey: 'learning.concept.ipv4.q1.why',
        options: [
          { key: 'learning.concept.ipv4.q1.a' },
          { key: 'learning.concept.ipv4.q1.b', correct: true },
          { key: 'learning.concept.ipv4.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.ipv4.q2.prompt',
        explanationKey: 'learning.concept.ipv4.q2.why',
        options: [
          { key: 'learning.concept.ipv4.q2.a', correct: true },
          { key: 'learning.concept.ipv4.q2.b' },
          { key: 'learning.concept.ipv4.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.ipv4.q3.prompt',
        explanationKey: 'learning.concept.ipv4.q3.why',
        options: [
          { key: 'learning.concept.ipv4.q3.a' },
          { key: 'learning.concept.ipv4.q3.b' },
          { key: 'learning.concept.ipv4.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'ipv6',
    layer: 'l3',
    nameKey: 'learning.concept.ipv6.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.ipv6.q1.prompt',
        explanationKey: 'learning.concept.ipv6.q1.why',
        options: [
          { key: 'learning.concept.ipv6.q1.a', correct: true },
          { key: 'learning.concept.ipv6.q1.b' },
          { key: 'learning.concept.ipv6.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.ipv6.q2.prompt',
        explanationKey: 'learning.concept.ipv6.q2.why',
        options: [
          { key: 'learning.concept.ipv6.q2.a' },
          { key: 'learning.concept.ipv6.q2.b', correct: true },
          { key: 'learning.concept.ipv6.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.ipv6.q3.prompt',
        explanationKey: 'learning.concept.ipv6.q3.why',
        options: [
          { key: 'learning.concept.ipv6.q3.a' },
          { key: 'learning.concept.ipv6.q3.b' },
          { key: 'learning.concept.ipv6.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'ospf',
    layer: 'routing',
    nameKey: 'learning.concept.ospf.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.ospf.q1.prompt',
        explanationKey: 'learning.concept.ospf.q1.why',
        options: [
          { key: 'learning.concept.ospf.q1.a', correct: true },
          { key: 'learning.concept.ospf.q1.b' },
          { key: 'learning.concept.ospf.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.ospf.q2.prompt',
        explanationKey: 'learning.concept.ospf.q2.why',
        options: [
          { key: 'learning.concept.ospf.q2.a' },
          { key: 'learning.concept.ospf.q2.b', correct: true },
          { key: 'learning.concept.ospf.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.ospf.q3.prompt',
        explanationKey: 'learning.concept.ospf.q3.why',
        options: [
          { key: 'learning.concept.ospf.q3.a' },
          { key: 'learning.concept.ospf.q3.b' },
          { key: 'learning.concept.ospf.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'bgp',
    layer: 'routing',
    nameKey: 'learning.concept.bgp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.bgp.q1.prompt',
        explanationKey: 'learning.concept.bgp.q1.why',
        options: [
          { key: 'learning.concept.bgp.q1.a', correct: true },
          { key: 'learning.concept.bgp.q1.b' },
          { key: 'learning.concept.bgp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.bgp.q2.prompt',
        explanationKey: 'learning.concept.bgp.q2.why',
        options: [
          { key: 'learning.concept.bgp.q2.a' },
          { key: 'learning.concept.bgp.q2.b', correct: true },
          { key: 'learning.concept.bgp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.bgp.q3.prompt',
        explanationKey: 'learning.concept.bgp.q3.why',
        options: [
          { key: 'learning.concept.bgp.q3.a' },
          { key: 'learning.concept.bgp.q3.b' },
          { key: 'learning.concept.bgp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'rip',
    layer: 'routing',
    nameKey: 'learning.concept.rip.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.rip.q1.prompt',
        explanationKey: 'learning.concept.rip.q1.why',
        options: [
          { key: 'learning.concept.rip.q1.a', correct: true },
          { key: 'learning.concept.rip.q1.b' },
          { key: 'learning.concept.rip.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.rip.q2.prompt',
        explanationKey: 'learning.concept.rip.q2.why',
        options: [
          { key: 'learning.concept.rip.q2.a' },
          { key: 'learning.concept.rip.q2.b', correct: true },
          { key: 'learning.concept.rip.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.rip.q3.prompt',
        explanationKey: 'learning.concept.rip.q3.why',
        options: [
          { key: 'learning.concept.rip.q3.a' },
          { key: 'learning.concept.rip.q3.b' },
          { key: 'learning.concept.rip.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'http',
    layer: 'l7',
    nameKey: 'learning.concept.http.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.http.q1.prompt',
        explanationKey: 'learning.concept.http.q1.why',
        options: [
          { key: 'learning.concept.http.q1.a', correct: true },
          { key: 'learning.concept.http.q1.b' },
          { key: 'learning.concept.http.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.http.q2.prompt',
        explanationKey: 'learning.concept.http.q2.why',
        options: [
          { key: 'learning.concept.http.q2.a' },
          { key: 'learning.concept.http.q2.b', correct: true },
          { key: 'learning.concept.http.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.http.q3.prompt',
        explanationKey: 'learning.concept.http.q3.why',
        options: [
          { key: 'learning.concept.http.q3.a' },
          { key: 'learning.concept.http.q3.b' },
          { key: 'learning.concept.http.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'quic',
    layer: 'l4',
    nameKey: 'learning.concept.quic.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.quic.q1.prompt',
        explanationKey: 'learning.concept.quic.q1.why',
        options: [
          { key: 'learning.concept.quic.q1.a', correct: true },
          { key: 'learning.concept.quic.q1.b' },
          { key: 'learning.concept.quic.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.quic.q2.prompt',
        explanationKey: 'learning.concept.quic.q2.why',
        options: [
          { key: 'learning.concept.quic.q2.a' },
          { key: 'learning.concept.quic.q2.b', correct: true },
          { key: 'learning.concept.quic.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.quic.q3.prompt',
        explanationKey: 'learning.concept.quic.q3.why',
        options: [
          { key: 'learning.concept.quic.q3.a' },
          { key: 'learning.concept.quic.q3.b' },
          { key: 'learning.concept.quic.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'http2',
    layer: 'l7',
    nameKey: 'learning.concept.http2.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.http2.q1.prompt',
        explanationKey: 'learning.concept.http2.q1.why',
        options: [
          { key: 'learning.concept.http2.q1.a', correct: true },
          { key: 'learning.concept.http2.q1.b' },
          { key: 'learning.concept.http2.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.http2.q2.prompt',
        explanationKey: 'learning.concept.http2.q2.why',
        options: [
          { key: 'learning.concept.http2.q2.a' },
          { key: 'learning.concept.http2.q2.b', correct: true },
          { key: 'learning.concept.http2.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.http2.q3.prompt',
        explanationKey: 'learning.concept.http2.q3.why',
        options: [
          { key: 'learning.concept.http2.q3.a' },
          { key: 'learning.concept.http2.q3.b' },
          { key: 'learning.concept.http2.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'http3',
    layer: 'l7',
    nameKey: 'learning.concept.http3.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.http3.q1.prompt',
        explanationKey: 'learning.concept.http3.q1.why',
        options: [
          { key: 'learning.concept.http3.q1.a', correct: true },
          { key: 'learning.concept.http3.q1.b' },
          { key: 'learning.concept.http3.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.http3.q2.prompt',
        explanationKey: 'learning.concept.http3.q2.why',
        options: [
          { key: 'learning.concept.http3.q2.a' },
          { key: 'learning.concept.http3.q2.b', correct: true },
          { key: 'learning.concept.http3.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.http3.q3.prompt',
        explanationKey: 'learning.concept.http3.q3.why',
        options: [
          { key: 'learning.concept.http3.q3.a' },
          { key: 'learning.concept.http3.q3.b' },
          { key: 'learning.concept.http3.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'qos',
    layer: 'l3',
    nameKey: 'learning.concept.qos.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.qos.q1.prompt',
        explanationKey: 'learning.concept.qos.q1.why',
        options: [
          { key: 'learning.concept.qos.q1.a', correct: true },
          { key: 'learning.concept.qos.q1.b' },
          { key: 'learning.concept.qos.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.qos.q2.prompt',
        explanationKey: 'learning.concept.qos.q2.why',
        options: [
          { key: 'learning.concept.qos.q2.a' },
          { key: 'learning.concept.qos.q2.b', correct: true },
          { key: 'learning.concept.qos.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.qos.q3.prompt',
        explanationKey: 'learning.concept.qos.q3.why',
        options: [
          { key: 'learning.concept.qos.q3.a' },
          { key: 'learning.concept.qos.q3.b' },
          { key: 'learning.concept.qos.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'ecmp',
    layer: 'routing',
    nameKey: 'learning.concept.ecmp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.ecmp.q1.prompt',
        explanationKey: 'learning.concept.ecmp.q1.why',
        options: [
          { key: 'learning.concept.ecmp.q1.a', correct: true },
          { key: 'learning.concept.ecmp.q1.b' },
          { key: 'learning.concept.ecmp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.ecmp.q2.prompt',
        explanationKey: 'learning.concept.ecmp.q2.why',
        options: [
          { key: 'learning.concept.ecmp.q2.a' },
          { key: 'learning.concept.ecmp.q2.b', correct: true },
          { key: 'learning.concept.ecmp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.ecmp.q3.prompt',
        explanationKey: 'learning.concept.ecmp.q3.why',
        options: [
          { key: 'learning.concept.ecmp.q3.a' },
          { key: 'learning.concept.ecmp.q3.b' },
          { key: 'learning.concept.ecmp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'vrrp',
    layer: 'l3',
    nameKey: 'learning.concept.vrrp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.vrrp.q1.prompt',
        explanationKey: 'learning.concept.vrrp.q1.why',
        options: [
          { key: 'learning.concept.vrrp.q1.a', correct: true },
          { key: 'learning.concept.vrrp.q1.b' },
          { key: 'learning.concept.vrrp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.vrrp.q2.prompt',
        explanationKey: 'learning.concept.vrrp.q2.why',
        options: [
          { key: 'learning.concept.vrrp.q2.a' },
          { key: 'learning.concept.vrrp.q2.b', correct: true },
          { key: 'learning.concept.vrrp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.vrrp.q3.prompt',
        explanationKey: 'learning.concept.vrrp.q3.why',
        options: [
          { key: 'learning.concept.vrrp.q3.a' },
          { key: 'learning.concept.vrrp.q3.b' },
          { key: 'learning.concept.vrrp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'multicast',
    layer: 'l3',
    nameKey: 'learning.concept.multicast.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.multicast.q1.prompt',
        explanationKey: 'learning.concept.multicast.q1.why',
        options: [
          { key: 'learning.concept.multicast.q1.a', correct: true },
          { key: 'learning.concept.multicast.q1.b' },
          { key: 'learning.concept.multicast.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.multicast.q2.prompt',
        explanationKey: 'learning.concept.multicast.q2.why',
        options: [
          { key: 'learning.concept.multicast.q2.a' },
          { key: 'learning.concept.multicast.q2.b', correct: true },
          { key: 'learning.concept.multicast.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.multicast.q3.prompt',
        explanationKey: 'learning.concept.multicast.q3.why',
        options: [
          { key: 'learning.concept.multicast.q3.a' },
          { key: 'learning.concept.multicast.q3.b' },
          { key: 'learning.concept.multicast.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'mtu',
    layer: 'l3',
    nameKey: 'learning.concept.mtu.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.mtu.q1.prompt',
        explanationKey: 'learning.concept.mtu.q1.why',
        options: [
          { key: 'learning.concept.mtu.q1.a', correct: true },
          { key: 'learning.concept.mtu.q1.b' },
          { key: 'learning.concept.mtu.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.mtu.q2.prompt',
        explanationKey: 'learning.concept.mtu.q2.why',
        options: [
          { key: 'learning.concept.mtu.q2.a' },
          { key: 'learning.concept.mtu.q2.b', correct: true },
          { key: 'learning.concept.mtu.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.mtu.q3.prompt',
        explanationKey: 'learning.concept.mtu.q3.why',
        options: [
          { key: 'learning.concept.mtu.q3.a' },
          { key: 'learning.concept.mtu.q3.b' },
          { key: 'learning.concept.mtu.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'gre',
    layer: 'l3',
    nameKey: 'learning.concept.gre.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.gre.q1.prompt',
        explanationKey: 'learning.concept.gre.q1.why',
        options: [
          { key: 'learning.concept.gre.q1.a', correct: true },
          { key: 'learning.concept.gre.q1.b' },
          { key: 'learning.concept.gre.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.gre.q2.prompt',
        explanationKey: 'learning.concept.gre.q2.why',
        options: [
          { key: 'learning.concept.gre.q2.a' },
          { key: 'learning.concept.gre.q2.b', correct: true },
          { key: 'learning.concept.gre.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.gre.q3.prompt',
        explanationKey: 'learning.concept.gre.q3.why',
        options: [
          { key: 'learning.concept.gre.q3.a' },
          { key: 'learning.concept.gre.q3.b' },
          { key: 'learning.concept.gre.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'mpls',
    layer: 'routing',
    nameKey: 'learning.concept.mpls.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.mpls.q1.prompt',
        explanationKey: 'learning.concept.mpls.q1.why',
        options: [
          { key: 'learning.concept.mpls.q1.a', correct: true },
          { key: 'learning.concept.mpls.q1.b' },
          { key: 'learning.concept.mpls.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.mpls.q2.prompt',
        explanationKey: 'learning.concept.mpls.q2.why',
        options: [
          { key: 'learning.concept.mpls.q2.a' },
          { key: 'learning.concept.mpls.q2.b', correct: true },
          { key: 'learning.concept.mpls.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.mpls.q3.prompt',
        explanationKey: 'learning.concept.mpls.q3.why',
        options: [
          { key: 'learning.concept.mpls.q3.a' },
          { key: 'learning.concept.mpls.q3.b' },
          { key: 'learning.concept.mpls.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'vxlan',
    layer: 'l2',
    nameKey: 'learning.concept.vxlan.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.vxlan.q1.prompt',
        explanationKey: 'learning.concept.vxlan.q1.why',
        options: [
          { key: 'learning.concept.vxlan.q1.a', correct: true },
          { key: 'learning.concept.vxlan.q1.b' },
          { key: 'learning.concept.vxlan.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.vxlan.q2.prompt',
        explanationKey: 'learning.concept.vxlan.q2.why',
        options: [
          { key: 'learning.concept.vxlan.q2.a' },
          { key: 'learning.concept.vxlan.q2.b', correct: true },
          { key: 'learning.concept.vxlan.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.vxlan.q3.prompt',
        explanationKey: 'learning.concept.vxlan.q3.why',
        options: [
          { key: 'learning.concept.vxlan.q3.a' },
          { key: 'learning.concept.vxlan.q3.b' },
          { key: 'learning.concept.vxlan.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'wifi',
    layer: 'l2',
    nameKey: 'learning.concept.wifi.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.wifi.q1.prompt',
        explanationKey: 'learning.concept.wifi.q1.why',
        options: [
          { key: 'learning.concept.wifi.q1.a', correct: true },
          { key: 'learning.concept.wifi.q1.b' },
          { key: 'learning.concept.wifi.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.wifi.q2.prompt',
        explanationKey: 'learning.concept.wifi.q2.why',
        options: [
          { key: 'learning.concept.wifi.q2.a' },
          { key: 'learning.concept.wifi.q2.b', correct: true },
          { key: 'learning.concept.wifi.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.wifi.q3.prompt',
        explanationKey: 'learning.concept.wifi.q3.why',
        options: [
          { key: 'learning.concept.wifi.q3.a' },
          { key: 'learning.concept.wifi.q3.b' },
          { key: 'learning.concept.wifi.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'acl',
    layer: 'l5',
    nameKey: 'learning.concept.acl.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.acl.q1.prompt',
        explanationKey: 'learning.concept.acl.q1.why',
        options: [
          { key: 'learning.concept.acl.q1.a', correct: true },
          { key: 'learning.concept.acl.q1.b' },
          { key: 'learning.concept.acl.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.acl.q2.prompt',
        explanationKey: 'learning.concept.acl.q2.why',
        options: [
          { key: 'learning.concept.acl.q2.a' },
          { key: 'learning.concept.acl.q2.b', correct: true },
          { key: 'learning.concept.acl.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.acl.q3.prompt',
        explanationKey: 'learning.concept.acl.q3.why',
        options: [
          { key: 'learning.concept.acl.q3.a' },
          { key: 'learning.concept.acl.q3.b' },
          { key: 'learning.concept.acl.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'model',
    layer: 'fundamentals',
    nameKey: 'learning.concept.model.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.model.q1.prompt',
        explanationKey: 'learning.concept.model.q1.why',
        options: [
          { key: 'learning.concept.model.q1.a', correct: true },
          { key: 'learning.concept.model.q1.b' },
          { key: 'learning.concept.model.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.model.q2.prompt',
        explanationKey: 'learning.concept.model.q2.why',
        options: [
          { key: 'learning.concept.model.q2.a' },
          { key: 'learning.concept.model.q2.b', correct: true },
          { key: 'learning.concept.model.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.model.q3.prompt',
        explanationKey: 'learning.concept.model.q3.why',
        options: [
          { key: 'learning.concept.model.q3.a' },
          { key: 'learning.concept.model.q3.b' },
          { key: 'learning.concept.model.q3.c', correct: true },
        ],
      },
      {
        id: 'q4',
        promptKey: 'learning.concept.model.q4.prompt',
        explanationKey: 'learning.concept.model.q4.why',
        options: [
          { key: 'learning.concept.model.q4.a', correct: true },
          { key: 'learning.concept.model.q4.b' },
          { key: 'learning.concept.model.q4.c' },
        ],
      },
      {
        id: 'q5',
        promptKey: 'learning.concept.model.q5.prompt',
        explanationKey: 'learning.concept.model.q5.why',
        options: [
          { key: 'learning.concept.model.q5.a' },
          { key: 'learning.concept.model.q5.b', correct: true },
          { key: 'learning.concept.model.q5.c' },
        ],
      },
      {
        id: 'q6',
        promptKey: 'learning.concept.model.q6.prompt',
        explanationKey: 'learning.concept.model.q6.why',
        options: [
          { key: 'learning.concept.model.q6.a' },
          { key: 'learning.concept.model.q6.b' },
          { key: 'learning.concept.model.q6.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'addressing',
    layer: 'fundamentals',
    nameKey: 'learning.concept.addressing.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.addressing.q1.prompt',
        explanationKey: 'learning.concept.addressing.q1.why',
        options: [
          { key: 'learning.concept.addressing.q1.a', correct: true },
          { key: 'learning.concept.addressing.q1.b' },
          { key: 'learning.concept.addressing.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.addressing.q2.prompt',
        explanationKey: 'learning.concept.addressing.q2.why',
        options: [
          { key: 'learning.concept.addressing.q2.a' },
          { key: 'learning.concept.addressing.q2.b', correct: true },
          { key: 'learning.concept.addressing.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.addressing.q3.prompt',
        explanationKey: 'learning.concept.addressing.q3.why',
        options: [
          { key: 'learning.concept.addressing.q3.a' },
          { key: 'learning.concept.addressing.q3.b' },
          { key: 'learning.concept.addressing.q3.c', correct: true },
        ],
      },
      {
        id: 'q4',
        promptKey: 'learning.concept.addressing.q4.prompt',
        explanationKey: 'learning.concept.addressing.q4.why',
        options: [
          { key: 'learning.concept.addressing.q4.a', correct: true },
          { key: 'learning.concept.addressing.q4.b' },
          { key: 'learning.concept.addressing.q4.c' },
        ],
      },
      {
        id: 'q5',
        promptKey: 'learning.concept.addressing.q5.prompt',
        explanationKey: 'learning.concept.addressing.q5.why',
        options: [
          { key: 'learning.concept.addressing.q5.a' },
          { key: 'learning.concept.addressing.q5.b', correct: true },
          { key: 'learning.concept.addressing.q5.c' },
        ],
      },
      {
        id: 'q6',
        promptKey: 'learning.concept.addressing.q6.prompt',
        explanationKey: 'learning.concept.addressing.q6.why',
        options: [
          { key: 'learning.concept.addressing.q6.a' },
          { key: 'learning.concept.addressing.q6.b' },
          { key: 'learning.concept.addressing.q6.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'ports',
    layer: 'fundamentals',
    nameKey: 'learning.concept.ports.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.ports.q1.prompt',
        explanationKey: 'learning.concept.ports.q1.why',
        options: [
          { key: 'learning.concept.ports.q1.a', correct: true },
          { key: 'learning.concept.ports.q1.b' },
          { key: 'learning.concept.ports.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.ports.q2.prompt',
        explanationKey: 'learning.concept.ports.q2.why',
        options: [
          { key: 'learning.concept.ports.q2.a' },
          { key: 'learning.concept.ports.q2.b', correct: true },
          { key: 'learning.concept.ports.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.ports.q3.prompt',
        explanationKey: 'learning.concept.ports.q3.why',
        options: [
          { key: 'learning.concept.ports.q3.a' },
          { key: 'learning.concept.ports.q3.b' },
          { key: 'learning.concept.ports.q3.c', correct: true },
        ],
      },
      {
        id: 'q4',
        promptKey: 'learning.concept.ports.q4.prompt',
        explanationKey: 'learning.concept.ports.q4.why',
        options: [
          { key: 'learning.concept.ports.q4.a', correct: true },
          { key: 'learning.concept.ports.q4.b' },
          { key: 'learning.concept.ports.q4.c' },
        ],
      },
      {
        id: 'q5',
        promptKey: 'learning.concept.ports.q5.prompt',
        explanationKey: 'learning.concept.ports.q5.why',
        options: [
          { key: 'learning.concept.ports.q5.a' },
          { key: 'learning.concept.ports.q5.b', correct: true },
          { key: 'learning.concept.ports.q5.c' },
        ],
      },
      {
        id: 'q6',
        promptKey: 'learning.concept.ports.q6.prompt',
        explanationKey: 'learning.concept.ports.q6.why',
        options: [
          { key: 'learning.concept.ports.q6.a' },
          { key: 'learning.concept.ports.q6.b' },
          { key: 'learning.concept.ports.q6.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'ssh',
    layer: 'l5',
    nameKey: 'learning.concept.ssh.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.ssh.q1.prompt',
        explanationKey: 'learning.concept.ssh.q1.why',
        options: [
          { key: 'learning.concept.ssh.q1.a', correct: true },
          { key: 'learning.concept.ssh.q1.b' },
          { key: 'learning.concept.ssh.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.ssh.q2.prompt',
        explanationKey: 'learning.concept.ssh.q2.why',
        options: [
          { key: 'learning.concept.ssh.q2.a' },
          { key: 'learning.concept.ssh.q2.b', correct: true },
          { key: 'learning.concept.ssh.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.ssh.q3.prompt',
        explanationKey: 'learning.concept.ssh.q3.why',
        options: [
          { key: 'learning.concept.ssh.q3.a' },
          { key: 'learning.concept.ssh.q3.b' },
          { key: 'learning.concept.ssh.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'ftp',
    layer: 'l7',
    nameKey: 'learning.concept.ftp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.ftp.q1.prompt',
        explanationKey: 'learning.concept.ftp.q1.why',
        options: [
          { key: 'learning.concept.ftp.q1.a', correct: true },
          { key: 'learning.concept.ftp.q1.b' },
          { key: 'learning.concept.ftp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.ftp.q2.prompt',
        explanationKey: 'learning.concept.ftp.q2.why',
        options: [
          { key: 'learning.concept.ftp.q2.a' },
          { key: 'learning.concept.ftp.q2.b', correct: true },
          { key: 'learning.concept.ftp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.ftp.q3.prompt',
        explanationKey: 'learning.concept.ftp.q3.why',
        options: [
          { key: 'learning.concept.ftp.q3.a' },
          { key: 'learning.concept.ftp.q3.b' },
          { key: 'learning.concept.ftp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'smtp',
    layer: 'l7',
    nameKey: 'learning.concept.smtp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.smtp.q1.prompt',
        explanationKey: 'learning.concept.smtp.q1.why',
        options: [
          { key: 'learning.concept.smtp.q1.a', correct: true },
          { key: 'learning.concept.smtp.q1.b' },
          { key: 'learning.concept.smtp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.smtp.q2.prompt',
        explanationKey: 'learning.concept.smtp.q2.why',
        options: [
          { key: 'learning.concept.smtp.q2.a' },
          { key: 'learning.concept.smtp.q2.b', correct: true },
          { key: 'learning.concept.smtp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.smtp.q3.prompt',
        explanationKey: 'learning.concept.smtp.q3.why',
        options: [
          { key: 'learning.concept.smtp.q3.a' },
          { key: 'learning.concept.smtp.q3.b' },
          { key: 'learning.concept.smtp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'email',
    layer: 'l7',
    nameKey: 'learning.concept.email.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.email.q1.prompt',
        explanationKey: 'learning.concept.email.q1.why',
        options: [
          { key: 'learning.concept.email.q1.a', correct: true },
          { key: 'learning.concept.email.q1.b' },
          { key: 'learning.concept.email.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.email.q2.prompt',
        explanationKey: 'learning.concept.email.q2.why',
        options: [
          { key: 'learning.concept.email.q2.a' },
          { key: 'learning.concept.email.q2.b', correct: true },
          { key: 'learning.concept.email.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.email.q3.prompt',
        explanationKey: 'learning.concept.email.q3.why',
        options: [
          { key: 'learning.concept.email.q3.a' },
          { key: 'learning.concept.email.q3.b' },
          { key: 'learning.concept.email.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'ntp',
    layer: 'l7',
    nameKey: 'learning.concept.ntp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.ntp.q1.prompt',
        explanationKey: 'learning.concept.ntp.q1.why',
        options: [
          { key: 'learning.concept.ntp.q1.a', correct: true },
          { key: 'learning.concept.ntp.q1.b' },
          { key: 'learning.concept.ntp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.ntp.q2.prompt',
        explanationKey: 'learning.concept.ntp.q2.why',
        options: [
          { key: 'learning.concept.ntp.q2.a' },
          { key: 'learning.concept.ntp.q2.b', correct: true },
          { key: 'learning.concept.ntp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.ntp.q3.prompt',
        explanationKey: 'learning.concept.ntp.q3.why',
        options: [
          { key: 'learning.concept.ntp.q3.a' },
          { key: 'learning.concept.ntp.q3.b' },
          { key: 'learning.concept.ntp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'snmp',
    layer: 'l7',
    nameKey: 'learning.concept.snmp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.snmp.q1.prompt',
        explanationKey: 'learning.concept.snmp.q1.why',
        options: [
          { key: 'learning.concept.snmp.q1.a', correct: true },
          { key: 'learning.concept.snmp.q1.b' },
          { key: 'learning.concept.snmp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.snmp.q2.prompt',
        explanationKey: 'learning.concept.snmp.q2.why',
        options: [
          { key: 'learning.concept.snmp.q2.a' },
          { key: 'learning.concept.snmp.q2.b', correct: true },
          { key: 'learning.concept.snmp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.snmp.q3.prompt',
        explanationKey: 'learning.concept.snmp.q3.why',
        options: [
          { key: 'learning.concept.snmp.q3.a' },
          { key: 'learning.concept.snmp.q3.b' },
          { key: 'learning.concept.snmp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'ipsec',
    layer: 'l5',
    nameKey: 'learning.concept.ipsec.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.ipsec.q1.prompt',
        explanationKey: 'learning.concept.ipsec.q1.why',
        options: [
          { key: 'learning.concept.ipsec.q1.a', correct: true },
          { key: 'learning.concept.ipsec.q1.b' },
          { key: 'learning.concept.ipsec.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.ipsec.q2.prompt',
        explanationKey: 'learning.concept.ipsec.q2.why',
        options: [
          { key: 'learning.concept.ipsec.q2.a' },
          { key: 'learning.concept.ipsec.q2.b', correct: true },
          { key: 'learning.concept.ipsec.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.ipsec.q3.prompt',
        explanationKey: 'learning.concept.ipsec.q3.why',
        options: [
          { key: 'learning.concept.ipsec.q3.a' },
          { key: 'learning.concept.ipsec.q3.b' },
          { key: 'learning.concept.ipsec.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'radius',
    layer: 'l5',
    nameKey: 'learning.concept.radius.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.radius.q1.prompt',
        explanationKey: 'learning.concept.radius.q1.why',
        options: [
          { key: 'learning.concept.radius.q1.a', correct: true },
          { key: 'learning.concept.radius.q1.b' },
          { key: 'learning.concept.radius.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.radius.q2.prompt',
        explanationKey: 'learning.concept.radius.q2.why',
        options: [
          { key: 'learning.concept.radius.q2.a' },
          { key: 'learning.concept.radius.q2.b', correct: true },
          { key: 'learning.concept.radius.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.radius.q3.prompt',
        explanationKey: 'learning.concept.radius.q3.why',
        options: [
          { key: 'learning.concept.radius.q3.a' },
          { key: 'learning.concept.radius.q3.b' },
          { key: 'learning.concept.radius.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'isis',
    layer: 'routing',
    nameKey: 'learning.concept.isis.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.isis.q1.prompt',
        explanationKey: 'learning.concept.isis.q1.why',
        options: [
          { key: 'learning.concept.isis.q1.a', correct: true },
          { key: 'learning.concept.isis.q1.b' },
          { key: 'learning.concept.isis.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.isis.q2.prompt',
        explanationKey: 'learning.concept.isis.q2.why',
        options: [
          { key: 'learning.concept.isis.q2.a' },
          { key: 'learning.concept.isis.q2.b', correct: true },
          { key: 'learning.concept.isis.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.isis.q3.prompt',
        explanationKey: 'learning.concept.isis.q3.why',
        options: [
          { key: 'learning.concept.isis.q3.a' },
          { key: 'learning.concept.isis.q3.b' },
          { key: 'learning.concept.isis.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'eigrp',
    layer: 'routing',
    nameKey: 'learning.concept.eigrp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.eigrp.q1.prompt',
        explanationKey: 'learning.concept.eigrp.q1.why',
        options: [
          { key: 'learning.concept.eigrp.q1.a', correct: true },
          { key: 'learning.concept.eigrp.q1.b' },
          { key: 'learning.concept.eigrp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.eigrp.q2.prompt',
        explanationKey: 'learning.concept.eigrp.q2.why',
        options: [
          { key: 'learning.concept.eigrp.q2.a' },
          { key: 'learning.concept.eigrp.q2.b', correct: true },
          { key: 'learning.concept.eigrp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.eigrp.q3.prompt',
        explanationKey: 'learning.concept.eigrp.q3.why',
        options: [
          { key: 'learning.concept.eigrp.q3.a' },
          { key: 'learning.concept.eigrp.q3.b' },
          { key: 'learning.concept.eigrp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'lacp',
    layer: 'l2',
    nameKey: 'learning.concept.lacp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.lacp.q1.prompt',
        explanationKey: 'learning.concept.lacp.q1.why',
        options: [
          { key: 'learning.concept.lacp.q1.a', correct: true },
          { key: 'learning.concept.lacp.q1.b' },
          { key: 'learning.concept.lacp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.lacp.q2.prompt',
        explanationKey: 'learning.concept.lacp.q2.why',
        options: [
          { key: 'learning.concept.lacp.q2.a' },
          { key: 'learning.concept.lacp.q2.b', correct: true },
          { key: 'learning.concept.lacp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.lacp.q3.prompt',
        explanationKey: 'learning.concept.lacp.q3.why',
        options: [
          { key: 'learning.concept.lacp.q3.a' },
          { key: 'learning.concept.lacp.q3.b' },
          { key: 'learning.concept.lacp.q3.c', correct: true },
        ],
      },
    ],
  },
  {
    id: 'lldp',
    layer: 'l2',
    nameKey: 'learning.concept.lldp.name',
    questions: [
      {
        id: 'q1',
        promptKey: 'learning.concept.lldp.q1.prompt',
        explanationKey: 'learning.concept.lldp.q1.why',
        options: [
          { key: 'learning.concept.lldp.q1.a', correct: true },
          { key: 'learning.concept.lldp.q1.b' },
          { key: 'learning.concept.lldp.q1.c' },
        ],
      },
      {
        id: 'q2',
        promptKey: 'learning.concept.lldp.q2.prompt',
        explanationKey: 'learning.concept.lldp.q2.why',
        options: [
          { key: 'learning.concept.lldp.q2.a' },
          { key: 'learning.concept.lldp.q2.b', correct: true },
          { key: 'learning.concept.lldp.q2.c' },
        ],
      },
      {
        id: 'q3',
        promptKey: 'learning.concept.lldp.q3.prompt',
        explanationKey: 'learning.concept.lldp.q3.why',
        options: [
          { key: 'learning.concept.lldp.q3.a' },
          { key: 'learning.concept.lldp.q3.b' },
          { key: 'learning.concept.lldp.q3.c', correct: true },
        ],
      },
    ],
  },
];
