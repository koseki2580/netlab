import type { Catalog } from '../types';
import { annotations } from './en/annotations';
import { assessment } from './en/assessment';
import { edits } from './en/edits';
import { intro } from './en/intro';
import { learning } from './en/learning';
import { narration } from './en/narration';
import { panel } from './en/panel';
import { recording } from './en/recording';
import { snapshots } from './en/snapshots';

// NOTE: conceptCheck is intentionally NOT spread here. It is the largest
// sub-catalog and is lazy-loaded by ConceptCheckPanel (see ConceptCheckPanelInner)
// so it stays out of the root bundle. i18n-check still verifies its en/ja parity.
export const en: Catalog = {
  ...annotations,
  ...assessment,
  ...edits,
  ...intro,
  ...learning,
  ...narration,
  ...panel,
  ...recording,
  ...snapshots,
} as const;
