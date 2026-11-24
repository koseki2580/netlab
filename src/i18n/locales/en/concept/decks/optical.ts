import type { Catalog } from '../../../../types';

/** The `optical` deck's questions (en); its name is in the core chunk. */
export const optical: Catalog = {
  'learning.concept.optical.q1.prompt':
    'Optics send at 0 dBm and need −14 dBm. Between them: 30 km of fibre at 0.35 dB/km, 5 splices of 0.1 dB and 2 connectors of 0.5 dB. What margin is left?',
  'learning.concept.optical.q1.a': '14 dB: transmit power minus sensitivity',
  'learning.concept.optical.q1.b': 'None: the link is 2 dB short',
  'learning.concept.optical.q1.c': '2 dB: it comes up, but thinly',
  'learning.concept.optical.q1.why':
    'The losses add up: 10.5 dB of fibre, 0.5 dB of splices, 1 dB of connectors, 12 dB in all. 0 − 12 = −12 dBm arrives, 2 dB above the −14 dBm needed: up, but under the 3 dB designers like.',
  'learning.concept.optical.q1.a.why':
    '14 dB is the power budget, what the link may lose; the margin is what is left of it after the 12 dB the fibre, splices and connectors take.',
  'learning.concept.optical.q1.b.why':
    'The received −12 dBm is above, not below, the −14 dBm sensitivity: dBm values are negative, so −12 is the stronger signal.',
  'learning.concept.optical.q2.prompt':
    'The same 30 km link built with 1550 nm optics of the same power and sensitivity has 5 dB of margin instead of 2. Why?',
  'learning.concept.optical.q2.a': 'The glass loses less per km at 1550 nm',
  'learning.concept.optical.q2.b': 'Longer wavelengths carry more power',
  'learning.concept.optical.q2.c': 'Connectors lose less at 1550 nm',
  'learning.concept.optical.q2.why':
    'Single-mode fibre typically loses about 0.25 dB/km at 1550 nm against 0.35 at 1310 nm: over 30 km that is 7.5 dB instead of 10.5, 3 dB more margin.',
  'learning.concept.optical.q2.b.why':
    'The optics send the same 0 dBm; the wavelength does not add power, it changes how much the glass absorbs and scatters.',
  'learning.concept.optical.q2.c.why':
    'The two connectors cost the same 1 dB in both cases; the whole 3 dB difference is in the fibre.',
  'learning.concept.optical.q3.prompt':
    '10GBASE-SR optics are joined by 500 m of OM3 multimode fibre. The loss is only 2.5 dB, well inside the budget. Does the link work?',
  'learning.concept.optical.q3.a': 'No: 500 m of multimode loses too much light',
  'learning.concept.optical.q3.b': 'No: it is past the 300 m reach, though power is fine',
  'learning.concept.optical.q3.c': 'Yes: it still has more than 6 dB of margin',
  'learning.concept.optical.q3.why':
    'On multimode fibre light takes many paths of different lengths (modal dispersion), so pulses smear. 10GBASE-SR is specified for 300 m over OM3; beyond that errors climb however much power arrives.',
  'learning.concept.optical.q3.a.why':
    'The power is fine: 2.5 dB of loss leaves over 6 dB of margin. What fails is the shape of the pulses, not their strength.',
  'learning.concept.optical.q3.c.why':
    'Margin only says enough light arrives. Past the specified reach, dispersion blurs the bits, and a power budget cannot show that.',
  'learning.concept.optical.q4.prompt':
    'On the ITU-T G.694.1 100 GHz grid, about how many DWDM channels fit in a C-band taken as 1530–1565 nm?',
  'learning.concept.optical.q4.a': 'About 350: one every 0.1 nm',
  'learning.concept.optical.q4.b': 'About 2: one every 20 nm',
  'learning.concept.optical.q4.c': 'About 44: one every 0.8 nm',
  'learning.concept.optical.q4.why':
    '1565 nm is 191.56 THz and 1530 nm is 195.94 THz; the grid points 191.6 to 195.9 THz, 100 GHz apart, are 44 channels. Near 1550 nm 100 GHz is 0.8 nm.',
  'learning.concept.optical.q4.a.why':
    '100 GHz is a frequency step, not 0.1 nm: near 1550 nm it is about 0.8 nm, so the 35 nm band holds about 44.',
  'learning.concept.optical.q4.b.why':
    '20 nm is CWDM’s spacing (ITU-T G.694.2). DWDM packs channels 0.8 nm apart at 100 GHz.',
};
