import type { Catalog } from '../../../../types';

/** The `mobilecore` deck's questions (en); its name is in the core chunk. */
export const mobilecore: Catalog = {
  'learning.concept.mobilecore.q1.prompt':
    'N3 runs over IPv4 with an MTU of 1500. Each packet carries UDP and a GTP-U header with a PDU Session Container. Which TCP MSS fits a UE’s IPv4 packets without fragmenting N3?',
  'learning.concept.mobilecore.q1.a': '1460 bytes',
  'learning.concept.mobilecore.q1.b': '1416 bytes',
  'learning.concept.mobilecore.q1.c': '1424 bytes',
  'learning.concept.mobilecore.q1.why':
    'The tunnel costs 20 + 8 + 8 + 4 + 4 = 44 bytes (IPv4, UDP, GTP-U mandatory header, optional fields, container), leaving 1456 for the inner packet; minus 40 for its IPv4 and TCP headers gives 1416.',
  'learning.concept.mobilecore.q1.a.why':
    '1460 is the MSS of an untunnelled 1500-byte link; inside N3 the tunnel headers come out of the 1500 too.',
  'learning.concept.mobilecore.q1.c.why':
    'That counts only the 8-byte mandatory GTP-U header. With the container come 4 bytes of optional fields and the container’s own 4.',
  'learning.concept.mobilecore.q2.prompt':
    'A UE downloading over TCP moves from gNB1 to gNB2 in an Xn handover; both reach the same UPF. What changes?',
  'learning.concept.mobilecore.q2.a': 'The UE’s IP address and its anchor UPF',
  'learning.concept.mobilecore.q2.b': 'The anchor, which moves to gNB2; the IP stays',
  'learning.concept.mobilecore.q2.c': 'Only the gNB end of the N3 downlink tunnel',
  'learning.concept.mobilecore.q2.why':
    'gNB2 gives the core its own address and a TEID, and the UPF sends downlink packets there. The UPF stays the PDU session anchor and the UE keeps its IP.',
  'learning.concept.mobilecore.q2.a.why':
    'The IP is allocated with the PDU session and reached through the anchor UPF; a handover between gNBs keeps both.',
  'learning.concept.mobilecore.q2.b.why':
    'A gNB is never the anchor: the PDU session anchor is always a UPF.',
  'learning.concept.mobilecore.q3.prompt':
    'Why does the UE’s TCP connection survive the handover without MPTCP or QUIC migration?',
  'learning.concept.mobilecore.q3.a': 'Its IP stays, reached through the same anchor',
  'learning.concept.mobilecore.q3.b': 'TCP retransmits until it learns the new IP',
  'learning.concept.mobilecore.q3.c': 'The gNBs copy the TCP state to each other',
  'learning.concept.mobilecore.q3.why':
    'The move is hidden below IP: the internet keeps reaching the same address through the same UPF, and only the tunnel inside the core is redirected.',
  'learning.concept.mobilecore.q3.b.why':
    'TCP cannot carry on with a new address at all; the connection survives because the address never changes.',
  'learning.concept.mobilecore.q3.c.why':
    'gNBs never see TCP state; they carry the UE’s packets inside GTP-U without terminating its connections.',
  'learning.concept.mobilecore.q4.prompt':
    'The operator moves N3 from IPv4 to IPv6 transport. How much more does each tunnelled packet cost?',
  'learning.concept.mobilecore.q4.a': '40 bytes',
  'learning.concept.mobilecore.q4.b': '20 bytes',
  'learning.concept.mobilecore.q4.c': '0 bytes',
  'learning.concept.mobilecore.q4.why':
    'Only the outer IP header changes: 40 bytes for IPv6 instead of 20 for IPv4. The tunnel goes from 44 to 64 bytes.',
  'learning.concept.mobilecore.q4.a.why':
    '40 bytes is the whole IPv6 header, but it replaces a 20-byte IPv4 header, so only 20 are added.',
  'learning.concept.mobilecore.q4.c.why':
    'GTP-U and UDP stay the same size, but the outer IP header grows from 20 to 40 bytes.',
};
