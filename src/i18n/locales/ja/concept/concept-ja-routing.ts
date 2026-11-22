import type { Catalog } from '../../../types';
import { ospf } from './decks/ospf';
import { bgp } from './decks/bgp';
import { rip } from './decks/rip';
import { ecmp } from './decks/ecmp';
import { mpls } from './decks/mpls';
import { isis } from './decks/isis';
import { eigrp } from './decks/eigrp';

/** The concept checks' `routing` chunk (ja): the questions of ospf, bgp, rip, ecmp, mpls, isis, eigrp. */
export const catalog: Catalog = {
  ...ospf,
  ...bgp,
  ...rip,
  ...ecmp,
  ...mpls,
  ...isis,
  ...eigrp,
};
