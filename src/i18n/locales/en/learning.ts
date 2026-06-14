import type { Catalog } from '../../types';

export const learning: Catalog = {
  // Shared drill chrome
  'learning.drill.correct': '✓ Correct',
  'learning.drill.incorrect': '✗ Not quite — answer: {{expected}}',
  'learning.drill.check': 'Check',
  'learning.drill.next': 'Next question',
  'learning.drill.seeResults': 'See results',
  'learning.drill.practiceAgain': 'Practice again',
  'learning.drill.sessionComplete': 'Session complete',
  'learning.drill.progress': 'Question {{current}} / {{total}}',

  // Subnetting drill
  'learning.subnet.title': 'Subnetting Practice',
  'learning.subnet.primer.title': 'New to subnetting? Start here',
  'learning.subnet.primer.body':
    'A subnet splits an address into a network part (the prefix, e.g. /24) and a host part. The network address has all host bits 0; the broadcast has them all 1. Usable hosts = 2^(host bits) − 2 (network and broadcast are not assignable). The mask marks the network bits with 1s, so /24 = 255.255.255.0.',
  'learning.subnet.answerLabel': 'Your answer',
  'learning.subnet.mastered': 'Mastered',
  'learning.subnet.review': 'Review these next',
  'learning.subnet.placeholder.yesNo': 'yes / no',
  'learning.subnet.placeholder.prefix': 'e.g. /24',
  'learning.subnet.placeholder.count': 'e.g. 254',
  'learning.subnet.placeholder.address': 'e.g. 192.168.1.0',
  'learning.subnet.kind.networkAddress': 'Network address',
  'learning.subnet.kind.broadcastAddress': 'Broadcast address',
  'learning.subnet.kind.subnetMask': 'Subnet mask',
  'learning.subnet.kind.prefixFromMask': 'Prefix from mask',
  'learning.subnet.kind.usableHostCount': 'Usable host count',
  'learning.subnet.kind.firstUsableHost': 'First usable host',
  'learning.subnet.kind.lastUsableHost': 'Last usable host',
  'learning.subnet.kind.containsHost': 'Host membership',
  'learning.subnet.prompt.networkAddress': 'What is the network address of {{cidr}}?',
  'learning.subnet.prompt.broadcastAddress': 'What is the broadcast address of {{cidr}}?',
  'learning.subnet.prompt.subnetMask':
    'What is the subnet mask (dotted decimal) for a /{{prefix}} network?',
  'learning.subnet.prompt.prefixFromMask':
    'What prefix length (/n) does the subnet mask {{mask}} represent?',
  'learning.subnet.prompt.usableHostCount': 'How many usable hosts are in {{cidr}}?',
  'learning.subnet.prompt.firstUsableHost': 'What is the first usable host of {{cidr}}?',
  'learning.subnet.prompt.lastUsableHost': 'What is the last usable host of {{cidr}}?',
  'learning.subnet.prompt.containsHost':
    'Is the host {{probe}} part of the subnet {{cidr}}? (yes/no)',
  'learning.subnet.explain.networkAddress':
    'AND the host with the mask {{mask}} to clear the host bits.',
  'learning.subnet.explain.broadcastAddress':
    'Set every host bit: network OR the wildcard {{wildcard}}.',
  'learning.subnet.explain.subnetMask':
    '/{{prefix}} turns on the {{prefix}} highest bits → {{mask}}.',
  'learning.subnet.explain.prefixFromMask':
    '{{mask}} is {{prefix}} contiguous 1-bits, so /{{prefix}}.',
  'learning.subnet.explain.usableHostCount': '2^(32-{{prefix}}) - 2 = {{count}} usable hosts.',
  'learning.subnet.explain.firstUsableHost': 'One above the network {{network}}.',
  'learning.subnet.explain.lastUsableHost': 'One below the broadcast {{broadcast}}.',
  'learning.subnet.explain.containsHostInside': '{{probe}} falls within {{network}}–{{broadcast}}.',
  'learning.subnet.explain.containsHostOutside': '{{probe}} is outside {{network}}–{{broadcast}}.',

  // Subnet visual
  'learning.visual.caption': '{{cidr}} — {{total}} addresses, {{usable}} usable',
  'learning.visual.network': 'network {{address}}',
  'learning.visual.hosts': 'hosts {{first}} – {{last}}',
  'learning.visual.broadcast': 'broadcast {{address}}',

  // Routing drills (text + on-canvas)
  'learning.route.title': 'Routing Decision',
  'learning.route.visualTitle': 'Routing Decision — on the network',
  'learning.route.primer.title': 'New to routing tables? Start here',
  'learning.route.primer.body':
    'A destination can match several routes at once — a default route, a summary prefix, and a specific subnet. The router always forwards via the most specific match: the one with the longest prefix (largest /n). Table order and the other routes do not matter — only which subnet most tightly contains the destination.',
  'learning.route.visualPrimer.title': 'How to answer',
  'learning.route.visualPrimer.body':
    'R1 sits in the middle; each neighbor router is one of its next-hops. Read the routing table, find the most specific route that contains the destination (longest prefix wins), then click that neighbor on the network — or use the answer buttons below the canvas.',
  'learning.route.prompt':
    'A packet is destined for {{dst}}. Which next-hop does the router choose?',
  'learning.route.explain.matched':
    'Longest-prefix match: {{destination}} → {{nextHop}} — more specific than the other matching routes.',
  'learning.route.explain.dropped': 'No route matches {{dst}}, so the packet is dropped.',
  'learning.route.table.caption': 'Routing table',
  'learning.route.table.destination': 'Destination',
  'learning.route.table.nextHop': 'Next-hop',
  'learning.route.answerLabel': 'Chosen next-hop',
  'learning.route.placeholder': 'next-hop, e.g. 192.0.2.3',
  'learning.route.answerGroup': 'Answer by next-hop',
  'learning.route.summary.lesson':
    'Routers always pick the most specific matching route — the longest prefix — regardless of how the table is ordered.',

  // Packet journey (predict-then-observe)
  'learning.journey.title': 'Packet Journey — predict, then watch',
  'learning.journey.primer.title': 'How this works',
  'learning.journey.primer.body':
    'A real packet is about to cross this network, simulated by the actual netlab engine. At every router you predict where it goes next — click the node on the network or use the buttons — and the engine reveals what really happened and why. Three journeys: a specific route, the default route, and a packet that dies.',
  'learning.journey.label': 'Journey {{current}} / {{total}} — to {{dst}}',
  'learning.journey.prompt': 'The packet is at {{node}}. Where does it forward next?',
  'learning.journey.outcome.delivered': '📬 Delivered — the packet reached {{dst}}.',
  'learning.journey.outcome.dropped':
    '💀 Dropped — no route matched at the last router (reason: {{reason}}).',
  'learning.journey.engineSays': 'The engine decided: {{explanation}}',
  'learning.journey.nextJourney': 'Next journey',
  'learning.journey.summary.lesson':
    'You just watched the real forwarding engine at work: the most specific route wins, the default route catches the rest, and a router with no matching route drops the packet.',

  // Resilience Lab (predict failure outcomes)
  'learning.resilience.title': 'Resilience Lab — predict the failure',
  'learning.resilience.primer.title': 'How this works',
  'learning.resilience.primer.body':
    'Each scenario breaks one part of the network, then runs the real engine. Before you see the result, predict it: does the packet reroute and survive, or get dropped? The network has a redundant R2–R3 link, so the answer is not always the same — that is the whole point of redundancy.',
  'learning.resilience.label': 'Scenario {{current}} / {{total}} — to {{dst}}',
  'learning.resilience.break': '💥 {{what}} fails. Will the packet reach {{dst}}?',
  'learning.resilience.fail.r1r2Link': 'The R1–R2 link',
  'learning.resilience.fail.r2Node': 'Router R2',
  'learning.resilience.fail.r1r3Link': 'The R1–R3 link',
  'learning.resilience.predict.survived': '✅ It reroutes and survives',
  'learning.resilience.predict.dropped': '❌ It gets dropped',
  'learning.resilience.outcome.survived': '✅ Survived — rerouted and reached {{dst}}.',
  'learning.resilience.outcome.dropped': '💀 Dropped at {{node}} — {{reason}}.',
  'learning.resilience.lesson.reroute':
    'The redundant R2–R3 link gave the packet a detour: R1 → R3 → R2 → the server. Redundancy turned a broken link into a longer route, not an outage.',
  'learning.resilience.lesson.lastHop':
    'Server A only attaches to R2. When R2 itself dies, no amount of redundancy elsewhere can reach it — the last hop is a single point of failure.',
  'learning.resilience.lesson.uselessBackup':
    'A backup link only helps if a route uses it. R1 has no route to Server B except via R3, so losing that link drops the packet immediately — redundancy in the wrong place is no redundancy.',
  'learning.resilience.next': 'Next scenario',
  'learning.resilience.summary.lesson':
    'Redundancy is about paths AND routes: a spare link saves you only when something can route over it, and a single-attached host is always exposed.',
} as const;
