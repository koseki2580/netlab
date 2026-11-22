import type { Catalog } from '../../../../types';

/** The `lldp` deck's questions (en); its name is in the core chunk. */
export const lldp: Catalog = {
  'learning.concept.lldp.q1.b.why':
    'Routing between subnets is L3; LLDP just discovers directly-connected neighbors and their capabilities.',
  'learning.concept.lldp.q1.c.why':
    'LLDP does not encrypt; it advertises a device’s identity/capabilities to directly-connected neighbors.',
  'learning.concept.lldp.q2.a.why':
    'The whole internet is out of reach: LLDP is strictly per-link, discovering only its directly-connected neighbor, never a remote device.',
  'learning.concept.lldp.q2.c.why':
    'LLDP is an L2 protocol with its own EtherType, not carried over TCP; it stays within one link.',
  'learning.concept.lldp.q3.a.why':
    'IP assignment is DHCP; LLDP maps physical topology and helps auto-configure VoIP phones and PoE.',
  'learning.concept.lldp.q3.b.why':
    'Route selection is a routing protocol’s job; LLDP discovers neighbors to map topology and aid VoIP/PoE.',
  'learning.concept.lldp.q1.prompt': 'LLDP lets a device…',
  'learning.concept.lldp.q1.a': 'Discover directly-connected neighbors',
  'learning.concept.lldp.q1.b': 'Route between subnets automatically',
  'learning.concept.lldp.q1.c': 'Encrypt frames on the local link',
  'learning.concept.lldp.q1.why':
    'Devices advertise identity, port and capabilities so neighbors learn the local topology (CDP is the Cisco equivalent).',
  'learning.concept.lldp.q2.prompt': 'LLDP operates…',
  'learning.concept.lldp.q2.a': 'Across the whole internet at once',
  'learning.concept.lldp.q2.b': 'Per link, within one segment',
  'learning.concept.lldp.q2.c': 'Over a TCP connection',
  'learning.concept.lldp.q2.why':
    'LLDP frames are link-local and are not forwarded by switches or routers.',
  'learning.concept.lldp.q3.prompt': 'LLDP is commonly used for…',
  'learning.concept.lldp.q3.a': 'Assigning IP addresses to neighbors',
  'learning.concept.lldp.q3.b': 'Choosing routes between subnets',
  'learning.concept.lldp.q3.c': 'Mapping physical topology and VoIP/PoE setup',
  'learning.concept.lldp.q3.why':
    'Network-management (NMS) tools build wiring maps from LLDP, and phones use it to learn their VLAN and PoE budget.',
};
