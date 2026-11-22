import type { Catalog } from '../../../types';
import { tls } from './decks/tls';
import { acl } from './decks/acl';
import { ssh } from './decks/ssh';
import { ipsec } from './decks/ipsec';
import { radius } from './decks/radius';
import { vpn } from './decks/vpn';
import { wireguard } from './decks/wireguard';
import { l2tp } from './decks/l2tp';

/** The concept checks' `l5` chunk (en): the questions of tls, acl, ssh, ipsec, radius, vpn, wireguard, l2tp. */
export const catalog: Catalog = {
  ...tls,
  ...acl,
  ...ssh,
  ...ipsec,
  ...radius,
  ...vpn,
  ...wireguard,
  ...l2tp,
};
