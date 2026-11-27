import type { Catalog } from '../../../types';
import { ospf } from './decks/ospf';
import { bgp } from './decks/bgp';
import { rip } from './decks/rip';
import { ecmp } from './decks/ecmp';
import { mpls } from './decks/mpls';
import { isis } from './decks/isis';
import { eigrp } from './decks/eigrp';
import { anycast } from './decks/anycast';
import { bfd } from './decks/bfd';
import { mplste } from './decks/mplste';
import { pim } from './decks/pim';
import { redistribution } from './decks/redistribution';
import { rpki } from './decks/rpki';
import { sdwan } from './decks/sdwan';
import { segrouting } from './decks/segrouting';
import { spineleaf } from './decks/spineleaf';
import { routereflector } from './decks/routereflector';
import { bgpgr } from './decks/bgpgr';

/** The concept checks' `routing` chunk (ja): the questions of ospf, bgp, rip, ecmp, mpls, isis, eigrp. */
export const catalog: Catalog = {
  ...ospf,
  ...bgp,
  ...rip,
  ...ecmp,
  ...mpls,
  ...isis,
  ...eigrp,
  ...anycast,
  ...bfd,
  ...mplste,
  ...pim,
  ...redistribution,
  ...rpki,
  ...sdwan,
  ...segrouting,
  ...spineleaf,
  ...routereflector,
  ...bgpgr,
};
