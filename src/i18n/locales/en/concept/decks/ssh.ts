import type { Catalog } from '../../../../types';

/** The `ssh` deck's questions (en); its name is in the core chunk. */
export const ssh: Catalog = {
  'learning.concept.ssh.q1.b.why':
    'Plaintext transfer is FTP/Telnet; SSH gives an encrypted remote shell and secure tunnel.',
  'learning.concept.ssh.q1.c.why':
    'Address assignment is DHCP; SSH provides an encrypted remote shell and tunneling.',
  'learning.concept.ssh.q2.a.why': 'Port 23 is Telnet (unencrypted); SSH listens on 22.',
  'learning.concept.ssh.q2.c.why': 'Port 443 is HTTPS; SSH listens on 22.',
  'learning.concept.ssh.q3.a.why':
    'MAC filtering is weak L2 access control, easily spoofed; SSH’s strong method is public-key authentication.',
  'learning.concept.ssh.q3.b.why':
    'A VLAN tag segments traffic, not authenticates users; SSH uses public-key authentication.',
  'learning.concept.ssh.q1.prompt': 'SSH provides…',
  'learning.concept.ssh.q1.a': 'An encrypted remote shell and tunnel',
  'learning.concept.ssh.q1.b': 'Plaintext file transfer to a server',
  'learning.concept.ssh.q1.c': 'IP address assignment for clients',
  'learning.concept.ssh.q1.why':
    'SSH secures remote login and arbitrary tunnels with encryption and authentication, replacing Telnet.',
  'learning.concept.ssh.q2.prompt': 'SSH listens on which well-known port?',
  'learning.concept.ssh.q2.a': '23',
  'learning.concept.ssh.q2.b': '22',
  'learning.concept.ssh.q2.c': '443',
  'learning.concept.ssh.q2.why': 'Port 22 is SSH; 23 is the insecure Telnet; 443 is HTTPS.',
  'learning.concept.ssh.q3.prompt': 'An SSH authentication method stronger than passwords is…',
  'learning.concept.ssh.q3.a': 'MAC filtering on the switch port',
  'learning.concept.ssh.q3.b': 'A VLAN tag on the session',
  'learning.concept.ssh.q3.c': 'Public-key authentication',
  'learning.concept.ssh.q3.why':
    'Key pairs authenticate without sending a secret over the wire; the server trusts the client public key.',
};
