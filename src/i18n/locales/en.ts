import type { Catalog } from '../types';
import { annotations } from './en/annotations';
import { assessment } from './en/assessment';
import { conceptCheck } from './en/conceptCheck';
import { edits } from './en/edits';
import { intro } from './en/intro';
import { learning } from './en/learning';
import { narration } from './en/narration';
import { panel } from './en/panel';
import { recording } from './en/recording';
import { snapshots } from './en/snapshots';

export const en: Catalog = {
  ...annotations,
  ...assessment,
  ...conceptCheck,
  ...edits,
  ...intro,
  ...learning,
  ...narration,
  ...panel,
  ...recording,
  ...snapshots,
} as const;
