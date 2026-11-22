import type { Catalog } from '../../../../types';

/** The `ntp` deck's questions (en); its name is in the core chunk. */
export const ntp: Catalog = {
  'learning.concept.ntp.q1.b.why': 'Hostname resolution is DNS; NTP synchronizes device clocks.',
  'learning.concept.ntp.q1.c.why':
    'Address assignment is DHCP; NTP keeps clocks synchronized across devices.',
  'learning.concept.ntp.q2.a.why':
    'VLANs segment L2 traffic; NTP arranges time sources into strata (distance from a reference clock).',
  'learning.concept.ntp.q2.c.why':
    'Autonomous systems are BGP routing domains; NTP uses strata to rank time sources.',
  'learning.concept.ntp.q3.a.why':
    'Time has nothing to do with cable speed; it matters for log correlation, certificate validity and auth.',
  'learning.concept.ntp.q3.b.why':
    'MTU is a frame-size limit, unrelated to time; accurate clocks matter for certs, logs and TLS/Kerberos.',
  'learning.concept.ntp.q1.prompt': 'NTP is used to…',
  'learning.concept.ntp.q1.a': 'Synchronize clocks across devices',
  'learning.concept.ntp.q1.b': 'Resolve hostnames into addresses',
  'learning.concept.ntp.q1.c': 'Assign addresses to interfaces',
  'learning.concept.ntp.q1.why': 'NTP keeps device clocks aligned to a reference time source.',
  'learning.concept.ntp.q2.prompt': 'NTP organizes time sources into…',
  'learning.concept.ntp.q2.a': 'Groups per VLAN',
  'learning.concept.ntp.q2.b': 'Strata (stratum 0, 1, 2, …)',
  'learning.concept.ntp.q2.c': 'Groups per autonomous system',
  'learning.concept.ntp.q2.why':
    'Stratum number is the distance from the reference clock; lower is closer and more authoritative.',
  'learning.concept.ntp.q3.prompt': 'Accurate time matters for…',
  'learning.concept.ntp.q3.a': 'Faster cables and lower propagation delay',
  'learning.concept.ntp.q3.b': 'Bigger MTUs and fewer fragmented packets',
  'learning.concept.ntp.q3.c': 'Log correlation, certificate validity and time-based auth',
  'learning.concept.ntp.q3.why':
    'Certificate validity windows, log correlation, and time-based auth all break with skewed clocks.',
};
