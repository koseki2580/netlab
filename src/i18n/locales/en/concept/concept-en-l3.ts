import type { Catalog } from '../../../types';
import { nat } from './decks/nat';
import { icmp } from './decks/icmp';
import { ipv4 } from './decks/ipv4';
import { ipv6 } from './decks/ipv6';
import { qos } from './decks/qos';
import { vrrp } from './decks/vrrp';
import { multicast } from './decks/multicast';
import { mtu } from './decks/mtu';
import { gre } from './decks/gre';
import { tunneling } from './decks/tunneling';
import { ndp } from './decks/ndp';

/** The concept checks' `l3` chunk (en): the questions of nat, icmp, ipv4, ipv6, qos, vrrp, multicast, mtu, gre, tunneling, ndp. */
export const catalog: Catalog = {
  ...nat,
  ...icmp,
  ...ipv4,
  ...ipv6,
  ...qos,
  ...vrrp,
  ...multicast,
  ...mtu,
  ...gre,
  ...tunneling,
  ...ndp,
};
