import type { Catalog } from '../../../types';
import { dhcp } from './decks/dhcp';
import { ftp } from './decks/ftp';
import { smtp } from './decks/smtp';
import { email } from './decks/email';
import { ntp } from './decks/ntp';
import { snmp } from './decks/snmp';
import { sip } from './decks/sip';
import { rtp } from './decks/rtp';
import { stun } from './decks/stun';
import { netconf } from './decks/netconf';
import { telemetry } from './decks/telemetry';

/** The concept checks' `l7apps` chunk (ja): the questions of dhcp, ftp, smtp, email, ntp, snmp, sip, rtp, stun. */
export const catalog: Catalog = {
  ...dhcp,
  ...ftp,
  ...smtp,
  ...email,
  ...ntp,
  ...snmp,
  ...sip,
  ...rtp,
  ...stun,
  ...netconf,
  ...telemetry,
};
