import type { ConceptDeck, ConceptDeckChunk, ConceptLayer, ConceptQuestion } from './types';
import { DECK as anycastDeck } from './lessonDecks/anycast';
import { DECK as bfdDeck } from './lessonDecks/bfd';
import { DECK as echDeck } from './lessonDecks/ech';
import { DECK as encdnsDeck } from './lessonDecks/encdns';
import { DECK as happyeyeballsDeck } from './lessonDecks/happyeyeballs';
import { DECK as httpcacheDeck } from './lessonDecks/httpcache';
import { DECK as timesyncDeck } from './lessonDecks/timesync';
import { DECK as mobilecoreDeck } from './lessonDecks/mobilecore';
import { DECK as dhcpleaseDeck } from './lessonDecks/dhcplease';
import { DECK as cgnatDeck } from './lessonDecks/cgnat';
import { DECK as maclearningDeck } from './lessonDecks/maclearning';
import { DECK as opticalDeck } from './lessonDecks/optical';
import { DECK as ipv6addrDeck } from './lessonDecks/ipv6addr';
import { DECK as plpmtudDeck } from './lessonDecks/plpmtud';
import { DECK as routereflectorDeck } from './lessonDecks/routereflector';
import { DECK as losslessDeck } from './lessonDecks/lossless';
import { DECK as cubicDeck } from './lessonDecks/cubic';
import { DECK as websocketDeck } from './lessonDecks/websocket';
import { DECK as l4sDeck } from './lessonDecks/l4s';
import { DECK as loadbalancerDeck } from './lessonDecks/loadbalancer';
import { DECK as masqueDeck } from './lessonDecks/masque';
import { DECK as mplsteDeck } from './lessonDecks/mplste';
import { DECK as mptcpDeck } from './lessonDecks/mptcp';
import { DECK as netconfDeck } from './lessonDecks/netconf';
import { DECK as physicalDeck } from './lessonDecks/physical';
import { DECK as pimDeck } from './lessonDecks/pim';
import { DECK as portsecurityDeck } from './lessonDecks/portsecurity';
import { DECK as pqkexDeck } from './lessonDecks/pqkex';
import { DECK as redistributionDeck } from './lessonDecks/redistribution';
import { DECK as roamingDeck } from './lessonDecks/roaming';
import { DECK as rpkiDeck } from './lessonDecks/rpki';
import { DECK as sdwanDeck } from './lessonDecks/sdwan';
import { DECK as segroutingDeck } from './lessonDecks/segrouting';
import { DECK as spineleafDeck } from './lessonDecks/spineleaf';
import { DECK as tcpoptionsDeck } from './lessonDecks/tcpoptions';
import { DECK as telemetryDeck } from './lessonDecks/telemetry';
import { DECK as vpcDeck } from './lessonDecks/vpc';
import { DECK as ztnaDeck } from './lessonDecks/ztna';

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

type Questions = readonly (readonly [string, Answer])[];

/**
 * A deck: its id, its layer, each question's id with the letter of its answer,
 * and the string chunk its questions load from — its layer, except that a
 * layer-7 deck names one of the two layer-7 chunks.
 */
function deck(
  id: string,
  layer: 'l7',
  questions: Questions,
  chunk: Extract<ConceptDeckChunk, 'l7web' | 'l7apps'>,
): ConceptDeck;
function deck(
  id: string,
  layer: Exclude<ConceptLayer, 'l7'>,
  questions: Questions,
  chunk?: ConceptDeckChunk,
): ConceptDeck;
function deck(
  id: string,
  layer: ConceptLayer,
  questions: Questions,
  chunk: ConceptDeckChunk = layer as ConceptDeckChunk,
): ConceptDeck {
  return {
    id,
    layer,
    chunk,
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
  deck(
    'dns',
    'l7',
    [
      ['q4', 'a'],
      ['q5', 'b'],
      ['q1', 'a'],
      ['q2', 'b'],
      ['q3', 'c'],
    ],
    'l7web',
  ),
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
  deck(
    'dhcp',
    'l7',
    [
      ['q1', 'b'],
      ['q2', 'a'],
      ['q3', 'c'],
    ],
    'l7apps',
  ),
  deck('icmp', 'l3', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
    ['q4', 'b'],
    ['q5', 'c'],
    ['q6', 'a'],
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
  deck(
    'http',
    'l7',
    [
      ['q1', 'a'],
      ['q2', 'b'],
      ['q3', 'c'],
    ],
    'l7web',
  ),
  deck('quic', 'l4', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'c'],
  ]),
  deck(
    'http2',
    'l7',
    [
      ['q1', 'a'],
      ['q2', 'b'],
      ['q3', 'c'],
    ],
    'l7web',
  ),
  deck(
    'http3',
    'l7',
    [
      ['q1', 'a'],
      ['q2', 'b'],
      ['q3', 'c'],
    ],
    'l7web',
  ),
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
    ['q7', 'b'],
    ['q8', 'c'],
    ['q9', 'a'],
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
  deck(
    'ftp',
    'l7',
    [
      ['q1', 'a'],
      ['q2', 'b'],
      ['q3', 'c'],
    ],
    'l7apps',
  ),
  deck(
    'smtp',
    'l7',
    [
      ['q1', 'a'],
      ['q2', 'b'],
      ['q3', 'c'],
    ],
    'l7apps',
  ),
  deck(
    'email',
    'l7',
    [
      ['q1', 'a'],
      ['q2', 'b'],
      ['q3', 'c'],
    ],
    'l7apps',
  ),
  deck(
    'ntp',
    'l7',
    [
      ['q1', 'a'],
      ['q2', 'b'],
      ['q3', 'c'],
    ],
    'l7apps',
  ),
  deck(
    'snmp',
    'l7',
    [
      ['q1', 'a'],
      ['q2', 'b'],
      ['q3', 'c'],
    ],
    'l7apps',
  ),
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
  deck(
    'sip',
    'l7',
    [
      ['q1', 'b'],
      ['q2', 'c'],
      ['q3', 'a'],
    ],
    'l7apps',
  ),
  deck(
    'rtp',
    'l7',
    [
      ['q1', 'a'],
      ['q2', 'b'],
      ['q3', 'c'],
    ],
    'l7apps',
  ),
  deck(
    'stun',
    'l7',
    [
      ['q1', 'c'],
      ['q2', 'a'],
      ['q3', 'b'],
    ],
    'l7apps',
  ),
  deck(
    'dnssec',
    'l7',
    [
      ['q1', 'a'],
      ['q2', 'b'],
      ['q3', 'c'],
    ],
    'l7web',
  ),
  deck('commands', 'fundamentals', [
    ['q1', 'a'],
    ['q2', 'b'],
    ['q3', 'a'],
    ['q4', 'c'],
    ['q5', 'b'],
    ['q6', 'c'],
  ]),
  // Decks of the lessons, one file each (src/learning/concept-check/lessonDecks/).
  deck(anycastDeck.id, anycastDeck.layer, anycastDeck.answers),
  deck(bfdDeck.id, bfdDeck.layer, bfdDeck.answers),
  deck(echDeck.id, echDeck.layer, echDeck.answers),
  deck(encdnsDeck.id, encdnsDeck.layer, encdnsDeck.answers, encdnsDeck.chunk),
  deck(happyeyeballsDeck.id, happyeyeballsDeck.layer, happyeyeballsDeck.answers),
  deck(httpcacheDeck.id, httpcacheDeck.layer, httpcacheDeck.answers, httpcacheDeck.chunk),
  deck(l4sDeck.id, l4sDeck.layer, l4sDeck.answers),
  deck(loadbalancerDeck.id, loadbalancerDeck.layer, loadbalancerDeck.answers),
  deck(masqueDeck.id, masqueDeck.layer, masqueDeck.answers, masqueDeck.chunk),
  deck(mplsteDeck.id, mplsteDeck.layer, mplsteDeck.answers),
  deck(mptcpDeck.id, mptcpDeck.layer, mptcpDeck.answers),
  deck(netconfDeck.id, netconfDeck.layer, netconfDeck.answers, netconfDeck.chunk),
  deck(physicalDeck.id, physicalDeck.layer, physicalDeck.answers),
  deck(pimDeck.id, pimDeck.layer, pimDeck.answers),
  deck(portsecurityDeck.id, portsecurityDeck.layer, portsecurityDeck.answers),
  deck(pqkexDeck.id, pqkexDeck.layer, pqkexDeck.answers),
  deck(redistributionDeck.id, redistributionDeck.layer, redistributionDeck.answers),
  deck(roamingDeck.id, roamingDeck.layer, roamingDeck.answers),
  deck(rpkiDeck.id, rpkiDeck.layer, rpkiDeck.answers),
  deck(sdwanDeck.id, sdwanDeck.layer, sdwanDeck.answers),
  deck(segroutingDeck.id, segroutingDeck.layer, segroutingDeck.answers),
  deck(spineleafDeck.id, spineleafDeck.layer, spineleafDeck.answers),
  deck(tcpoptionsDeck.id, tcpoptionsDeck.layer, tcpoptionsDeck.answers),
  deck(telemetryDeck.id, telemetryDeck.layer, telemetryDeck.answers, telemetryDeck.chunk),
  deck(vpcDeck.id, vpcDeck.layer, vpcDeck.answers),
  deck(ztnaDeck.id, ztnaDeck.layer, ztnaDeck.answers),
  deck(websocketDeck.id, websocketDeck.layer, websocketDeck.answers, websocketDeck.chunk),
  deck(cubicDeck.id, cubicDeck.layer, cubicDeck.answers, cubicDeck.chunk),
  deck(losslessDeck.id, losslessDeck.layer, losslessDeck.answers, losslessDeck.chunk),
  deck(
    routereflectorDeck.id,
    routereflectorDeck.layer,
    routereflectorDeck.answers,
    routereflectorDeck.chunk,
  ),
  deck(plpmtudDeck.id, plpmtudDeck.layer, plpmtudDeck.answers, plpmtudDeck.chunk),
  deck(ipv6addrDeck.id, ipv6addrDeck.layer, ipv6addrDeck.answers, ipv6addrDeck.chunk),
  deck(opticalDeck.id, opticalDeck.layer, opticalDeck.answers, opticalDeck.chunk),
  deck(maclearningDeck.id, maclearningDeck.layer, maclearningDeck.answers, maclearningDeck.chunk),
  deck(cgnatDeck.id, cgnatDeck.layer, cgnatDeck.answers, cgnatDeck.chunk),
  deck(dhcpleaseDeck.id, dhcpleaseDeck.layer, dhcpleaseDeck.answers, dhcpleaseDeck.chunk),
  deck(mobilecoreDeck.id, mobilecoreDeck.layer, mobilecoreDeck.answers, mobilecoreDeck.chunk),
  deck(timesyncDeck.id, timesyncDeck.layer, timesyncDeck.answers, timesyncDeck.chunk),
];
