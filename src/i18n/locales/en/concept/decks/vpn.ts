import type { Catalog } from '../../../../types';

/** The `vpn` deck's questions (en); its name is in the core chunk. */
export const vpn: Catalog = {
  'learning.concept.vpn.q1.b.why':
    'A VPN usually adds slight overhead, not speed; its purpose is a secure, encrypted tunnel over an untrusted network.',
  'learning.concept.vpn.q1.c.why':
    'Public-IP assignment is not a VPN’s job; it creates an encrypted, authenticated tunnel to keep traffic private.',
  'learning.concept.vpn.q2.a.why':
    'Both types encrypt; the real difference is site-to-site joins whole networks via gateways, remote-access connects one client.',
  'learning.concept.vpn.q2.c.why':
    'Remote-access works over any IP path (often the internet), not just Ethernet; the difference is whole-network vs single-client.',
  'learning.concept.vpn.q3.a.why':
    'Split tunneling does not block traffic; it sends only selected destinations through the VPN and the rest direct.',
  'learning.concept.vpn.q3.b.why':
    'It is not double encryption; split tunneling routes only some traffic through the VPN, the rest goes straight out.',
  'learning.concept.vpn.q1.prompt': 'The primary purpose of a VPN is to…',
  'learning.concept.vpn.q1.a': 'Create an encrypted tunnel across an untrusted network',
  'learning.concept.vpn.q1.b': 'Speed up the internet connection itself',
  'learning.concept.vpn.q1.c': 'Assign public IP addresses to hosts',
  'learning.concept.vpn.q1.why':
    'A VPN encapsulates and encrypts traffic so it can traverse a public network as if it were a private link.',
  'learning.concept.vpn.q2.prompt': 'Site-to-site and remote-access VPNs differ in that…',
  'learning.concept.vpn.q2.a': 'Site-to-site needs no encryption at all',
  'learning.concept.vpn.q2.b': 'Site-to-site links whole networks; remote-access links one device',
  'learning.concept.vpn.q2.c': 'Remote-access only works over Ethernet links',
  'learning.concept.vpn.q2.why':
    'Site-to-site gateways tunnel between two subnets; remote-access (client VPN) attaches one user device to the corporate network.',
  'learning.concept.vpn.q3.prompt': 'Split tunneling means…',
  'learning.concept.vpn.q3.a': 'All traffic is blocked until the VPN is up',
  'learning.concept.vpn.q3.b': 'The VPN encrypts everything twice over',
  'learning.concept.vpn.q3.c': 'Only some traffic goes through the VPN; the rest goes direct',
  'learning.concept.vpn.q3.why':
    'Split tunneling routes only selected destinations over the VPN — less load, but wider exposure than a full tunnel.',
};
