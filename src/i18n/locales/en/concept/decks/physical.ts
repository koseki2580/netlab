import type { Catalog } from '../../../../types';

/** The `physical` deck's questions (en); its name is in the core chunk. */
export const physical: Catalog = {
  'learning.concept.physical.q1.prompt':
    'A switch port is hard-set to 100 Mbit/s full duplex; the PC facing it is left on auto. Both can run 10 or 100. The PC ends up at…',
  'learning.concept.physical.q1.a': '100 full, copied from the switch by autonegotiation',
  'learning.concept.physical.q1.b': 'No link: a fixed port and an auto one never agree',
  'learning.concept.physical.q1.c': '100 half: a duplex mismatch with the switch',
  'learning.concept.physical.q1.why':
    'A fixed port sends no negotiation pulses. The PC finds the speed by parallel detection, but cannot learn the duplex, so it must assume half: the link is up, mismatched.',
  'learning.concept.physical.q2.prompt':
    'On that mismatched link, under load, which errors pile up on the full-duplex side’s counters?',
  'learning.concept.physical.q2.a': 'Runts and FCS errors on the frames it receives',
  'learning.concept.physical.q2.b': 'Late collisions on the frames it sends',
  'learning.concept.physical.q2.c': 'None; only the half-duplex side counts errors',
  'learning.concept.physical.q2.why':
    'The half-duplex side takes the other’s sending for a collision and aborts its own frame; the full-duplex side then receives that frame cut short (a runt) or with a bad checksum (FCS error).',
  'learning.concept.physical.q3.prompt':
    'A 370 W PoE switch powers 12 phones (class 2), 4 cameras (class 3) and 8 APs (class 4), allocating by class. The last AP stays off. Why?',
  'learning.concept.physical.q3.a': 'The devices running already draw more than 370 W',
  'learning.concept.physical.q3.b': 'Each port reserves its class maximum, and those fill it',
  'learning.concept.physical.q3.c': 'Class 4 needs 802.3bt, which the switch lacks',
  'learning.concept.physical.q3.why':
    '12 × 7.0 + 4 × 15.4 + 7 × 30 = 355.6 W is reserved; one more 30 W AP needs 385.6 W of 370. Yet only about 214 W is drawn. Negotiating power over LLDP instead fits all 24.',
  'learning.concept.physical.q4.prompt':
    'core-1 is cabled to access-1 and access-2; an AP is cabled to access-2. core-1’s LLDP neighbour table lists…',
  'learning.concept.physical.q4.a': 'All three, the AP learned through access-2',
  'learning.concept.physical.q4.b': 'Nobody until the switches run CDP as well',
  'learning.concept.physical.q4.c': 'access-1 and access-2, but not the AP',
  'learning.concept.physical.q4.why':
    'LLDP frames go to a multicast address that bridges do not forward, so each device learns only what is at the other end of its own cables.',
  'learning.concept.physical.q1.a.why':
    'There is nothing to copy: a fixed port sends no negotiation pulses, so the auto side learns the speed but has to fall back to half duplex.',
  'learning.concept.physical.q1.b.why':
    'Parallel detection still finds the speed, so the link comes up; only fixed ports set to different speeds get no link.',
  'learning.concept.physical.q2.b.why':
    'Late collisions are counted by the half-duplex side, which listens for collisions; the full-duplex side never checks for them.',
  'learning.concept.physical.q2.c.why':
    'Each frame the half-duplex side aborts arrives damaged at the full-duplex side, so both sides count errors, of different kinds.',
  'learning.concept.physical.q3.a.why':
    'The running devices draw only about 214 W. The budget runs out on reservations, not on actual draw.',
  'learning.concept.physical.q3.c.why':
    'Class 4 is 802.3at (30 W at the port); 802.3bt is for classes 5–8. The AP is refused because the budget is used up.',
  'learning.concept.physical.q4.a.why':
    'LLDP is not relayed: access-2 does not pass on what it heard from the AP, so core-1 never learns of it.',
  'learning.concept.physical.q4.b.why':
    'LLDP is the vendor-neutral standard (802.1AB) and works on its own; CDP is Cisco’s own, separate protocol.',
};
