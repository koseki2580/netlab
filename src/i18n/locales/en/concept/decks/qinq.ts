import type { Catalog } from '../../../../types';

/** The `qinq` deck's questions (en); its name is in the core chunk. */
export const qinq: Catalog = {
  'learning.concept.qinq.q1.prompt':
    'A customer’s frame carries 1500 bytes of payload and its own 802.1Q tag: 1522 bytes with header and FCS. The provider’s edge adds an 802.1ad S-tag. How big is the frame in the provider’s core?',
  'learning.concept.qinq.q1.a': '1522 bytes: the S-tag replaces the customer’s tag',
  'learning.concept.qinq.q1.b': '1526 bytes: one more 4-byte tag',
  'learning.concept.qinq.q1.c': '1540 bytes: a new header and tag around it',
  'learning.concept.qinq.q1.why':
    'The S-tag is another 4-byte tag (TPID 0x88A8 and the VLAN ID) inserted before the customer’s tag. No new Ethernet header is added, so 1522 + 4 = 1526 bytes.',
  'learning.concept.qinq.q1.a.why':
    'The customer’s C-tag stays inside, untouched; the far edge removes only the S-tag and hands the customer its own tag back.',
  'learning.concept.qinq.q1.c.why':
    'That would be encapsulation in a new frame, as provider backbone bridging or VXLAN do. Q-in-Q keeps the customer’s MAC addresses and only stacks a tag.',
  'learning.concept.qinq.q2.prompt':
    'A provider runs Q-in-Q over core switches that accept frames of at most 1522 bytes. A customer sends full 1500-byte packets in its own tagged VLAN. What happens?',
  'learning.concept.qinq.q2.a': 'They fit: tags do not count in the frame size',
  'learning.concept.qinq.q2.b': 'The edge switch fragments them to fit',
  'learning.concept.qinq.q2.c': 'They do not fit: only 1496 bytes of payload do',
  'learning.concept.qinq.q2.why':
    'Two tags take 8 bytes, so a 1522-byte frame leaves 1522 − 14 − 4 − 8 = 1496 bytes of payload. The provider must raise its core frame size to at least 1526, or the customer its MTU.',
  'learning.concept.qinq.q2.a.why':
    'The tags sit inside the frame, so every byte of them counts against the largest frame a switch accepts.',
  'learning.concept.qinq.q2.b.why':
    'Ethernet switches do not fragment; a frame too large for the link is simply dropped.',
  'learning.concept.qinq.q3.prompt':
    'Customers A and B both use VLAN 10. The provider tags A’s traffic with S-VLAN 100 and B’s with S-VLAN 200. A broadcast sent in A’s VLAN 10 reaches which far sites?',
  'learning.concept.qinq.q3.a': 'Only A’s other site',
  'learning.concept.qinq.q3.b': 'Both A’s and B’s other sites',
  'learning.concept.qinq.q3.c': 'Neither: VLAN 10 clashes',
  'learning.concept.qinq.q3.why':
    'The provider’s switches forward by the outer S-tag. Only A’s ports are in S-VLAN 100, so the C-VLAN 10 inside never meets B’s traffic.',
  'learning.concept.qinq.q3.b.why':
    'That is what happens if the provider carries VLAN 10 as it is. With an S-tag per customer, B’s VLAN 10 is a different S-VLAN.',
  'learning.concept.qinq.q3.c.why':
    'The provider does not look at the customer’s VLAN ID at all, so the same ID in two customers causes no conflict.',
  'learning.concept.qinq.q4.prompt':
    'Each tag offers 4094 usable VLAN IDs. With an S-tag per customer and every C-VLAN free inside it, how many customer VLANs can one provider core carry at most?',
  'learning.concept.qinq.q4.a': '4094, as the customers share one ID space',
  'learning.concept.qinq.q4.b': '4094 × 4094, about 16.8 million',
  'learning.concept.qinq.q4.c': '4094 + 4094 = 8188',
  'learning.concept.qinq.q4.why':
    'Each of the 4094 S-VLANs holds a whole set of 4094 C-VLANs: 16 760 836. The number of customers is still limited to 4094, one S-VLAN each.',
  'learning.concept.qinq.q4.a.why':
    'Customers do not share one ID space: each customer’s C-VLANs sit inside its own S-VLAN, so they may all reuse the same IDs.',
  'learning.concept.qinq.q4.c.why':
    'The tags nest rather than add: every S-VLAN carries all 4094 C-VLANs, so the counts multiply.',
};
