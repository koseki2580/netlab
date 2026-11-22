import type { Catalog } from '../../../../types';

/** The `snmp` deck's questions (en); its name is in the core chunk. */
export const snmp: Catalog = {
  'learning.concept.snmp.q1.b.why':
    'Routing packets is the routers’ job; SNMP monitors and manages network devices.',
  'learning.concept.snmp.q1.c.why':
    'Link encryption is TLS/IPsec/MACsec; SNMP is for monitoring and managing devices.',
  'learning.concept.snmp.q2.a.why':
    'Routing tables live in routers; SNMP exposes managed data as OIDs in a MIB tree.',
  'learning.concept.snmp.q2.c.why':
    'MAC tables are a switch’s L2 structure; SNMP organizes managed objects as OIDs in a MIB.',
  'learning.concept.snmp.q3.a.why':
    'A GET is the manager polling the device; an unsolicited device-initiated alert is a Trap.',
  'learning.concept.snmp.q3.b.why':
    'An ACK just confirms receipt; the event-driven message a device pushes is an SNMP Trap.',
  'learning.concept.snmp.q1.prompt': 'SNMP is used for…',
  'learning.concept.snmp.q1.a': 'Monitoring and managing network devices',
  'learning.concept.snmp.q1.b': 'Routing packets between the subnets',
  'learning.concept.snmp.q1.c': 'Encrypting links between devices',
  'learning.concept.snmp.q1.why':
    'SNMP reads and writes device state (counters, status) for network management.',
  'learning.concept.snmp.q2.prompt': 'SNMP organizes managed data as…',
  'learning.concept.snmp.q2.a': 'Routing tables',
  'learning.concept.snmp.q2.b': 'OIDs in a MIB tree',
  'learning.concept.snmp.q2.c': 'MAC tables',
  'learning.concept.snmp.q2.why':
    'Each value has an Object Identifier within the Management Information Base hierarchy.',
  'learning.concept.snmp.q3.prompt': 'An unsolicited SNMP alert a device sends on an event is a…',
  'learning.concept.snmp.q3.a': 'GET',
  'learning.concept.snmp.q3.b': 'ACK',
  'learning.concept.snmp.q3.c': 'Trap',
  'learning.concept.snmp.q3.why':
    'Traps/notifications are device-initiated alerts, versus manager-initiated GET/SET polls.',
};
