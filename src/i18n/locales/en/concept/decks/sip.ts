import type { Catalog } from '../../../../types';

/** The `sip` deck's questions (en); its name is in the core chunk. */
export const sip: Catalog = {
  'learning.concept.sip.q1.a.why':
    'The audio travels in RTP, not SIP; SIP is the signaling that sets up, changes and ends the call.',
  'learning.concept.sip.q1.c.why':
    'Address assignment is DHCP; SIP signals call setup/teardown, leaving the media to RTP.',
  'learning.concept.sip.q2.a.why':
    'SIP carries no media samples; the audio flows separately over RTP, with SIP/SDP just negotiating it.',
  'learning.concept.sip.q2.b.why':
    'Neither audio nor video rides in SIP; both flow over RTP, which SIP negotiates via SDP.',
  'learning.concept.sip.q3.b.why':
    'SIP is text-based like HTTP, not a binary routing protocol; INVITE is a request with methods and headers.',
  'learning.concept.sip.q3.c.why':
    'An Ethernet frame is L2 binary framing; SIP is an HTTP-like text protocol with methods and status codes.',
  'learning.concept.sip.q1.prompt': 'What is SIP responsible for?',
  'learning.concept.sip.q1.a': 'Carrying the actual voice and video media',
  'learning.concept.sip.q1.b': 'Setting up, modifying and tearing down calls',
  'learning.concept.sip.q1.c': 'Assigning IP addresses to the phones',
  'learning.concept.sip.q1.why':
    'SIP is a signaling protocol: it locates users and negotiates sessions, while the media travels in a separate stream.',
  'learning.concept.sip.q2.prompt': 'Does the voice/video itself travel inside SIP?',
  'learning.concept.sip.q2.a': 'Yes, SIP carries the audio samples',
  'learning.concept.sip.q2.b': 'Only the video, not the audio',
  'learning.concept.sip.q2.c': 'No — media flows separately, usually over RTP',
  'learning.concept.sip.q2.why':
    'SIP carries SDP to agree codecs/ports, then the media (RTP) flows directly between endpoints, separate from signaling.',
  'learning.concept.sip.q3.prompt': 'A SIP request such as INVITE most resembles…',
  'learning.concept.sip.q3.a': 'HTTP — text requests and responses with status codes',
  'learning.concept.sip.q3.b': 'A binary routing protocol update',
  'learning.concept.sip.q3.c': 'An Ethernet frame with a header and FCS',
  'learning.concept.sip.q3.why':
    'SIP was modeled on HTTP/SMTP: human-readable methods (INVITE, BYE) and responses (200 OK, 404) make it familiar to web developers.',
};
