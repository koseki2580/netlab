import type { Catalog } from '../../../../types';

/** The `ethernet` deck's questions (en); its name is in the core chunk. */
export const ethernet: Catalog = {
  'learning.concept.ethernet.q1.prompt': 'An Ethernet frame is addressed using…',
  'learning.concept.ethernet.q1.a': 'MAC addresses',
  'learning.concept.ethernet.q1.b': 'IP addresses',
  'learning.concept.ethernet.q1.c': 'Port numbers',
  'learning.concept.ethernet.q1.why':
    'Layer-2 frames are delivered by 48-bit MAC addresses within a LAN segment.',
  'learning.concept.ethernet.q2.prompt': 'A switch builds its MAC table by…',
  'learning.concept.ethernet.q2.a': 'Reading the IP header of every packet it forwards',
  'learning.concept.ethernet.q2.b': 'Learning source MACs from incoming frames',
  'learning.concept.ethernet.q2.c': 'Running OSPF with its neighbors',
  'learning.concept.ethernet.q2.why':
    'A switch records which port each source MAC arrives on, then forwards by destination MAC.',
  'learning.concept.ethernet.q3.prompt': 'A frame with an unknown destination MAC is…',
  'learning.concept.ethernet.q3.a': 'Dropped',
  'learning.concept.ethernet.q3.b': 'Routed to the gateway',
  'learning.concept.ethernet.q3.c': 'Flooded out all other ports',
  'learning.concept.ethernet.q3.why':
    'Unknown-unicast frames are flooded so the destination can reply and be learned.',
  'learning.concept.ethernet.q4.prompt':
    'Besides addresses and payload, an Ethernet frame’s trailer carries…',
  'learning.concept.ethernet.q4.a': 'A frame check sequence (FCS)',
  'learning.concept.ethernet.q4.b': 'A TTL that limits how far the frame travels',
  'learning.concept.ethernet.q4.c': 'A TCP checksum for the payload',
  'learning.concept.ethernet.q4.why':
    'The FCS — a CRC computed over the frame — lets the receiver detect transmission errors and discard damaged frames.',
  'learning.concept.ethernet.q5.prompt': 'Connecting two switches together extends…',
  'learning.concept.ethernet.q5.a': 'Two separate internets',
  'learning.concept.ethernet.q5.b': 'The same broadcast domain',
  'learning.concept.ethernet.q5.c': 'A routing table',
  'learning.concept.ethernet.q5.why':
    'Plain switching keeps one broadcast domain; you need a router (or VLANs) to split it.',
  'learning.concept.ethernet.q1.b.why':
    'IP addresses are L3; an Ethernet frame is addressed at L2 by MAC.',
  'learning.concept.ethernet.q1.c.why':
    'Port numbers are L4; a frame uses L2 MAC addresses to reach the next device.',
  'learning.concept.ethernet.q2.a.why':
    'A switch does not read IP headers (that is L3 routing); it learns from L2 source MACs.',
  'learning.concept.ethernet.q2.c.why':
    'OSPF is a routing protocol for routers; a switch just learns source MACs from frames.',
  'learning.concept.ethernet.q3.a.why':
    'An unknown-destination frame is flooded, not dropped, so it can still reach the host.',
  'learning.concept.ethernet.q3.b.why':
    'Switches do not route to a gateway (that is L3); they flood unknown unicast out every other port.',
  'learning.concept.ethernet.q4.b.why':
    'A TTL is an IP (L3) field that routers decrement; frames have no hop limit — they never leave their L2 segment anyway.',
  'learning.concept.ethernet.q4.c.why':
    'The TCP checksum is an L4 field inside the payload; the frame’s own error check is the FCS in its trailer.',
  'learning.concept.ethernet.q5.a.why':
    'Linking switches does not create separate internets; it joins them into one broadcast domain.',
  'learning.concept.ethernet.q5.c.why':
    'A routing table is a router’s L3 structure; cabling two switches just extends the L2 domain.',
};
