import type { Catalog } from '../../../types';
import { dns } from './decks/dns';
import { http } from './decks/http';
import { http2 } from './decks/http2';
import { http3 } from './decks/http3';
import { dnssec } from './decks/dnssec';
import { encdns } from './decks/encdns';
import { httpcache } from './decks/httpcache';
import { masque } from './decks/masque';
import { websocket } from './decks/websocket';

/** The concept checks' `l7web` chunk (ja): the questions of dns, http, http2, http3, dnssec. */
export const catalog: Catalog = {
  ...dns,
  ...http,
  ...http2,
  ...http3,
  ...dnssec,
  ...encdns,
  ...httpcache,
  ...masque,
  ...websocket,
};
