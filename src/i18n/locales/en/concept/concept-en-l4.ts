import type { Catalog } from '../../../types';
import { tcp } from './decks/tcp';
import { udp } from './decks/udp';
import { quic } from './decks/quic';

/** The concept checks' `l4` chunk (en): the questions of tcp, udp, quic. */
export const catalog: Catalog = {
  ...tcp,
  ...udp,
  ...quic,
};
