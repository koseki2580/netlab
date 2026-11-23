import type { Catalog } from '../../../types';
import { tls } from './decks/tls';
import { acl } from './decks/acl';
import { ssh } from './decks/ssh';
import { ipsec } from './decks/ipsec';
import { radius } from './decks/radius';
import { vpn } from './decks/vpn';
import { wireguard } from './decks/wireguard';
import { l2tp } from './decks/l2tp';
import { ech } from './decks/ech';
import { portsecurity } from './decks/portsecurity';
import { pqkex } from './decks/pqkex';
import { ztna } from './decks/ztna';

/** The concept checks' `l5` chunk (ja): the questions of tls, acl, ssh, ipsec, radius, vpn, wireguard, l2tp. */
export const catalog: Catalog = {
  ...tls,
  ...acl,
  ...ssh,
  ...ipsec,
  ...radius,
  ...vpn,
  ...wireguard,
  ...l2tp,
  ...ech,
  ...portsecurity,
  ...pqkex,
  ...ztna,
};
