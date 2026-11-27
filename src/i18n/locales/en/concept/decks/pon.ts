import type { Catalog } from '../../../../types';

/** The `pon` deck's questions (en); its name is in the core chunk. */
export const pon: Catalog = {
  'learning.concept.pon.q1.prompt':
    'An XGS-PON port (line rate 9.95 Gb/s downstream) feeds a 1:32 splitter. All 32 homes behind it, each on a “10 Gb/s” plan, download flat out at once. At most, what does each get downstream?',
  'learning.concept.pon.q1.a': 'About 9.95 Gb/s: each home has its own fibre',
  'learning.concept.pon.q1.b': 'About 1 Gb/s: the splitter limits each port',
  'learning.concept.pon.q1.c': 'About 311 Mb/s: one stream is shared by 32',
  'learning.concept.pon.q1.why':
    'The splitter sends the OLT’s single 9.95 Gb/s downstream to every home, so 32 busy homes share it: 9953.28 ÷ 32 = 311.04 Mb/s each (less after framing and FEC).',
  'learning.concept.pon.q1.a.why':
    'Only the last stretch after the splitter is per home; the fibre back to the OLT and its line rate are shared by everyone behind the splitter.',
  'learning.concept.pon.q1.b.why':
    'A splitter is passive glass with no speed of its own; the limit is the shared line rate divided among the busy homes.',
  'learning.concept.pon.q2.prompt':
    'Downstream, the splitter delivers the OLT’s light, and so every frame, to every ONU. What stops one home from reading a neighbour’s traffic?',
  'learning.concept.pon.q2.a': 'Downstream is encrypted with a key per ONU',
  'learning.concept.pon.q2.b': 'The splitter sends each home only its own frames',
  'learning.concept.pon.q2.c': 'Each home receives on its own wavelength',
  'learning.concept.pon.q2.why':
    'Every ONU receives everything and keeps only frames for its own IDs. Because a modified ONU could keep the rest, PON encrypts downstream traffic (AES-128) with a key per ONU.',
  'learning.concept.pon.q2.b.why':
    'A passive splitter cannot look at frames: it divides the light, and all of it, among every output.',
  'learning.concept.pon.q2.c.why':
    'GPON and XGS-PON send downstream on one wavelength for all; a wavelength per home is the different design called WDM-PON.',
  'learning.concept.pon.q3.prompt':
    'A 1:64 split (21 dB), 20 km of fibre (7 dB) and 4 connectors (2 dB) add up to 30 dB. XGS-PON class N1 allows 14–29 dB between OLT and ONU. What does this mean?',
  'learning.concept.pon.q3.a': 'Nothing: a splitter’s loss is not counted',
  'learning.concept.pon.q3.b': 'It is 1 dB over: use a class such as N2 (to 31 dB)',
  'learning.concept.pon.q3.c': 'It fits: the class limits only the fibre length',
  'learning.concept.pon.q3.why':
    'The class bounds the whole loss from OLT to ONU. 30 dB is 1 dB beyond N1’s 29 dB, so either the plant changes (a smaller split, a shorter run) or stronger optics of class N2 (16–31 dB) are used.',
  'learning.concept.pon.q3.a.why':
    'The splitter is usually the largest single loss in the plant, and it is part of the budget like the fibre and the connectors.',
  'learning.concept.pon.q3.c.why':
    'The class is a range of loss in dB, not a distance; splitter, fibre and connectors all count against it.',
  'learning.concept.pon.q4.prompt':
    'Upstream, all ONUs send on the same wavelength into one fibre, and they cannot hear one another. How do they avoid sending at the same moment?',
  'learning.concept.pon.q4.a': 'Each listens and sends when the fibre is quiet',
  'learning.concept.pon.q4.b': 'Each ONU sends on its own wavelength',
  'learning.concept.pon.q4.c': 'The OLT grants each ONU a time slot to send in',
  'learning.concept.pon.q4.why':
    'Upstream is TDMA: the OLT tells each ONU where its burst starts and ends in every 125 µs frame, and DBA sizes the grants from the queues the ONUs report.',
  'learning.concept.pon.q4.a.why':
    'An ONU’s light goes only up to the OLT, so no ONU can hear whether another is sending; listening first is impossible.',
  'learning.concept.pon.q4.b.why':
    'In GPON and XGS-PON every ONU uses the same upstream wavelength; separate wavelengths would be WDM-PON.',
};
