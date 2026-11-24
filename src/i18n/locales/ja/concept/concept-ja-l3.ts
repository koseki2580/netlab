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
import { happyeyeballs } from './decks/happyeyeballs';
import { vpc } from './decks/vpc';
import { mobilecore } from './decks/mobilecore';
import { cgnat } from './decks/cgnat';
import { ipv6addr } from './decks/ipv6addr';

/** The concept checks' `l3` chunk (ja): the questions of nat, icmp, ipv4, ipv6, qos, vrrp, multicast, mtu, gre, tunneling, ndp. */
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
  ...happyeyeballs,
  ...vpc,
  ...mobilecore,
  ...cgnat,
  ...ipv6addr,
};
