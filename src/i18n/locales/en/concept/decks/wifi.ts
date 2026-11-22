import type { Catalog } from '../../../../types';

/** The `wifi` deck's questions (en); its name is in the core chunk. */
export const wifi: Catalog = {
  'learning.concept.wifi.q1.prompt': 'Wi-Fi avoids collisions using…',
  'learning.concept.wifi.q1.a': 'CSMA/CA (collision avoidance)',
  'learning.concept.wifi.q1.b': 'CSMA/CD (collision detection)',
  'learning.concept.wifi.q1.c': 'Token passing',
  'learning.concept.wifi.q1.why':
    'A station cannot reliably hear collisions on radio, so 802.11 listens and backs off to avoid them rather than detecting them.',
  'learning.concept.wifi.q2.prompt': 'A wireless medium is…',
  'learning.concept.wifi.q2.a': 'Full-duplex per station',
  'learning.concept.wifi.q2.b': 'Shared and half-duplex',
  'learning.concept.wifi.q2.c': 'Collision-free',
  'learning.concept.wifi.q2.why':
    'All stations share the same channel and can only transmit or receive at any one time, so the airtime is contended.',
  'learning.concept.wifi.q3.prompt': 'Before sending data, a Wi-Fi client must first…',
  'learning.concept.wifi.q3.a': 'Run OSPF with the access point first',
  'learning.concept.wifi.q3.b': 'Get a public IP address from the ISP',
  'learning.concept.wifi.q3.c': 'Associate and authenticate with an access point',
  'learning.concept.wifi.q3.why':
    'A client scans, authenticates and associates with an AP (e.g. via WPA2) before it can pass traffic.',
  'learning.concept.wifi.q1.b.why':
    'CSMA/CD (detection) is wired Ethernet; a radio can’t hear while sending, so Wi-Fi uses CSMA/CA to avoid collisions.',
  'learning.concept.wifi.q1.c.why':
    'Token passing is Token Ring/FDDI; Wi-Fi uses CSMA/CA to avoid collisions on the shared air.',
  'learning.concept.wifi.q2.a.why':
    'A radio can’t transmit and receive at once on one channel; the medium is shared and half-duplex.',
  'learning.concept.wifi.q2.c.why':
    'Wireless is not collision-free — that is why Wi-Fi needs CSMA/CA; the air is shared and half-duplex.',
  'learning.concept.wifi.q3.a.why':
    'OSPF is a router routing protocol, irrelevant here; a Wi-Fi client must first associate with an access point.',
  'learning.concept.wifi.q3.b.why':
    'A public IP is not required (NAT/private IPs work); first the client must associate and authenticate with the AP.',
};
