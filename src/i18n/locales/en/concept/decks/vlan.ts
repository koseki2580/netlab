import type { Catalog } from '../../../../types';

/** The `vlan` deck's questions (en); its name is in the core chunk. */
export const vlan: Catalog = {
  'learning.concept.vlan.q1.prompt': 'A VLAN creates…',
  'learning.concept.vlan.q1.a': 'A separate broadcast domain on a shared switch',
  'learning.concept.vlan.q1.b': 'A new physical cable run between switches',
  'learning.concept.vlan.q1.c': 'A routing table for the subnet',
  'learning.concept.vlan.q1.why':
    'Each VLAN is its own L2 broadcast domain; hosts in different VLANs need a router to talk.',
  'learning.concept.vlan.q2.prompt': 'A trunk port carries…',
  'learning.concept.vlan.q2.a': 'One VLAN only, untagged',
  'learning.concept.vlan.q2.b': 'Multiple VLANs, tagged with 802.1Q',
  'learning.concept.vlan.q2.c': 'Only untagged traffic, one VLAN',
  'learning.concept.vlan.q2.why':
    'Trunks tag frames with a VLAN ID so several VLANs share one link between switches.',
  'learning.concept.vlan.q3.prompt': 'To move traffic between two VLANs you need…',
  'learning.concept.vlan.q3.a': 'A longer cable',
  'learning.concept.vlan.q3.b': 'A second root bridge',
  'learning.concept.vlan.q3.c': 'A router or L3 switch',
  'learning.concept.vlan.q3.why':
    'Each VLAN is a separate broadcast domain carrying its own IP subnet, so inter-VLAN traffic must be routed.',
  'learning.concept.vlan.q1.b.why':
    'A VLAN is logical, not physical — it splits one switch into separate broadcast domains without new cabling.',
  'learning.concept.vlan.q1.c.why':
    'A routing table is an L3 router structure; a VLAN just creates a separate L2 broadcast domain.',
  'learning.concept.vlan.q2.a.why':
    'Carrying one VLAN is an access port; a trunk carries many VLANs, tagged with 802.1Q.',
  'learning.concept.vlan.q2.c.why':
    'A trunk tags frames with 802.1Q so VLANs stay distinct; untagged-only describes an access port.',
  'learning.concept.vlan.q3.a.why':
    'Cabling does not bridge VLANs — 802.1Q keeps them as separate broadcast domains in different subnets; you need a router or L3 switch.',
  'learning.concept.vlan.q3.b.why':
    'A root bridge is an STP concept within one L2 domain; crossing VLANs needs L3 routing.',
};
