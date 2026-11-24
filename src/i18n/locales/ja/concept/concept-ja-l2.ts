import type { Catalog } from '../../../types';
import { arp } from './decks/arp';
import { stp } from './decks/stp';
import { vlan } from './decks/vlan';
import { ethernet } from './decks/ethernet';
import { vxlan } from './decks/vxlan';
import { wifi } from './decks/wifi';
import { lacp } from './decks/lacp';
import { lldp } from './decks/lldp';
import { pppoe } from './decks/pppoe';
import { physical } from './decks/physical';
import { roaming } from './decks/roaming';
import { maclearning } from './decks/maclearning';
import { optical } from './decks/optical';
import { lossless } from './decks/lossless';

/** The concept checks' `l2` chunk (ja): the questions of arp, stp, vlan, ethernet, vxlan, wifi, lacp, lldp, pppoe. */
export const catalog: Catalog = {
  ...arp,
  ...stp,
  ...vlan,
  ...ethernet,
  ...vxlan,
  ...wifi,
  ...lacp,
  ...lldp,
  ...pppoe,
  ...physical,
  ...roaming,
  ...maclearning,
  ...optical,
  ...lossless,
};
