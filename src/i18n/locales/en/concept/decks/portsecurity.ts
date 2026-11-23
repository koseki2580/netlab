import type { Catalog } from '../../../../types';

/** The `portsecurity` deck's questions (en); its name is in the core chunk. */
export const portsecurity: Catalog = {
  'learning.concept.portsecurity.q1.prompt':
    'A laptop is plugged into a port with 802.1X on and has not authenticated yet. Which of its frames does the switch forward?',
  'learning.concept.portsecurity.q1.a': 'Only EAPOL, which carries the authentication',
  'learning.concept.portsecurity.q1.b': 'EAPOL and DHCP, so it can get an address first',
  'learning.concept.portsecurity.q1.c': 'Everything: 802.1X only records who is connected',
  'learning.concept.portsecurity.q1.why':
    'Until the RADIUS server answers Access-Accept the port is unauthorised and forwards only EAPOL, which the switch relays to RADIUS. The laptop cannot even get an address yet.',
  'learning.concept.portsecurity.q1.b.why':
    'An unauthorised port forwards no DHCP: a device gets no address before it has proved who it is.',
  'learning.concept.portsecurity.q1.c.why':
    '802.1X is access control, not logging: until RADIUS accepts the device, the port drops everything but EAPOL.',
  'learning.concept.portsecurity.q2.prompt':
    'A printer with no 802.1X software is plugged in. RADIUS knows its MAC address and maps it to VLAN 40. What happens?',
  'learning.concept.portsecurity.q2.a': 'It is refused, as it never answers EAPOL',
  'learning.concept.portsecurity.q2.b': 'It is let straight in, into the guest VLAN',
  'learning.concept.portsecurity.q2.c': 'After 90 s of unanswered EAP, MAB puts it in VLAN 40',
  'learning.concept.portsecurity.q2.why':
    'The switch sends 3 EAP requests 30 s apart, then tries MAC Authentication Bypass. RADIUS knows the MAC and answers Access-Accept with Tunnel-Private-Group-ID 40.',
  'learning.concept.portsecurity.q2.a.why':
    'Silence on EAPOL is not the end: the switch falls back to MAB and sends the device’s MAC to RADIUS as its name.',
  'learning.concept.portsecurity.q2.b.why':
    'The guest VLAN is for devices RADIUS rejects; this MAC is known, so the Access-Accept names its own VLAN. And MAB waits for EAP to time out first.',
  'learning.concept.portsecurity.q3.prompt':
    'Port security allows 1 MAC address, violation mode shutdown. A small switch behind the wall socket connects three devices, which send one frame each. How many get access?',
  'learning.concept.portsecurity.q3.a': 'One, the first; the others are dropped',
  'learning.concept.portsecurity.q3.b': 'None: the port is err-disabled',
  'learning.concept.portsecurity.q3.c': 'All three, with a violation logged',
  'learning.concept.portsecurity.q3.why':
    'The second MAC is a violation, and shutdown err-disables the whole port: 0 of 3 have access, even the first, until an administrator or a recovery timer brings it back.',
  'learning.concept.portsecurity.q3.a.why':
    'That is protect or restrict. shutdown takes the whole port down at the first violation.',
  'learning.concept.portsecurity.q3.c.why':
    'Port security never lets a MAC past the limit through; logging is what restrict adds to dropping.',
  'learning.concept.portsecurity.q4.prompt':
    'DHCP snooping and dynamic ARP inspection are on; only the uplink is trusted. A host with a static address, and so no DHCP lease, sends ARP from its access port. What does DAI do?',
  'learning.concept.portsecurity.q4.a': 'Drops it: no binding has its IP and MAC',
  'learning.concept.portsecurity.q4.b': 'Forwards it: static hosts need no DHCP',
  'learning.concept.portsecurity.q4.c': 'Forwards it, as its IP is in the subnet',
  'learning.concept.portsecurity.q4.why':
    'DAI drops ARP from an untrusted port unless the sender’s IP, MAC and port match a DHCP snooping binding. A static host needs a static binding or an ARP ACL.',
  'learning.concept.portsecurity.q4.b.why':
    'DAI cannot tell the host is static; it believes only bindings learned from DHCP ACKs, and this host has none.',
  'learning.concept.portsecurity.q4.c.why':
    'DAI matches the exact IP, MAC and port in the binding table; being inside the right subnet is not checked.',
};
