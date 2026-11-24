import type { Catalog } from '../../../types';
import { tcp } from './decks/tcp';
import { udp } from './decks/udp';
import { quic } from './decks/quic';
import { l4s } from './decks/l4s';
import { loadbalancer } from './decks/loadbalancer';
import { mptcp } from './decks/mptcp';
import { tcpoptions } from './decks/tcpoptions';
import { plpmtud } from './decks/plpmtud';
import { cubic } from './decks/cubic';

/** The concept checks' `l4` chunk (ja): the questions of tcp, udp, quic. */
export const catalog: Catalog = {
  ...tcp,
  ...udp,
  ...quic,
  ...l4s,
  ...loadbalancer,
  ...mptcp,
  ...tcpoptions,
  ...plpmtud,
  ...cubic,
};
