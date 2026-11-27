import type { Catalog } from '../../../types';
import { optical } from './decks/optical';
import { lossless } from './decks/lossless';
import { qinq } from './decks/qinq';
import { pon } from './decks/pon';
import { tsn } from './decks/tsn';

/** The concept checks' `l2infra` chunk (ja): layer-2 decks of data-centre and provider lessons — optical, lossless, qinq, pon, tsn. */
export const catalog: Catalog = {
  ...optical,
  ...lossless,
  ...qinq,
  ...pon,
  ...tsn,
};
