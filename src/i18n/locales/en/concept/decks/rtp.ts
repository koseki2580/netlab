import type { Catalog } from '../../../../types';

/** The `rtp` deck's questions (en); its name is in the core chunk. */
export const rtp: Catalog = {
  'learning.concept.rtp.q1.b.why':
    'Reachability is distributed by routing protocols; RTP carries real-time media, typically over UDP.',
  'learning.concept.rtp.q1.c.why':
    'Email uses SMTP/IMAP; RTP carries real-time audio/video over UDP with sequence numbers and timestamps.',
  'learning.concept.rtp.q2.a.why':
    'TCP can carry audio, but its retransmits arrive too late to be useful; RTP prefers UDP’s low latency.',
  'learning.concept.rtp.q2.c.why':
    'UDP is not encrypted (SRTP adds that); RTP uses UDP because timely delivery beats guaranteed delivery.',
  'learning.concept.rtp.q3.a.why':
    'RTCP is not encryption (that is SRTP); it carries quality feedback like jitter, loss and round-trip time.',
  'learning.concept.rtp.q3.b.why':
    'RTCP does not duplicate the media; it reports stats (jitter, loss, RTT) so senders can adapt.',
  'learning.concept.rtp.q1.prompt': 'What does RTP carry, and over what transport?',
  'learning.concept.rtp.q1.a': 'Real-time audio/video media, usually over UDP',
  'learning.concept.rtp.q1.b': 'Routing table updates, over TCP',
  'learning.concept.rtp.q1.c': 'Email messages and attachments, over TLS',
  'learning.concept.rtp.q1.why':
    'RTP adds sequence numbers and timestamps so the receiver can reorder, detect loss, and play media out at the right time.',
  'learning.concept.rtp.q2.prompt': 'Why does RTP usually run over UDP instead of TCP?',
  'learning.concept.rtp.q2.a': 'Because TCP cannot carry audio or video streams',
  'learning.concept.rtp.q2.b': 'Because a late retransmission is useless for live media',
  'learning.concept.rtp.q2.c': 'Because UDP encrypts the media by default',
  'learning.concept.rtp.q2.why':
    'For live media a packet that arrives too late can’t be played, so TCP’s retransmit/ordering would add harmful delay; RTP conceals loss instead.',
  'learning.concept.rtp.q3.prompt': 'What does RTCP add alongside an RTP stream?',
  'learning.concept.rtp.q3.a': 'Stronger encryption of the media',
  'learning.concept.rtp.q3.b': 'A backup copy of the whole media stream',
  'learning.concept.rtp.q3.c': 'Control and quality feedback for the sender',
  'learning.concept.rtp.q3.why':
    'RTCP reports reception quality — jitter, packet loss, round-trip time — periodically, letting endpoints adjust bitrate or diagnose problems: control to RTP’s data.',
};
