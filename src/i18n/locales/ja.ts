import type { Catalog } from '../types';
import { annotations } from './ja/annotations';
import { assessment } from './ja/assessment';
import { edits } from './ja/edits';
import { intro } from './ja/intro';
import { narration } from './ja/narration';
import { panel } from './ja/panel';
import { recording } from './ja/recording';
import { snapshots } from './ja/snapshots';

export const ja: Catalog = {
  ...annotations,
  ...assessment,
  ...edits,
  ...intro,
  ...narration,
  ...panel,
  ...recording,
  ...snapshots,
} as const;
