import type { Catalog } from '../types';
import { annotations } from './ja/annotations';
import { assessment } from './ja/assessment';
import { canvasPanel } from './ja/canvasPanel';
import { edits } from './ja/edits';
import { editor } from './ja/editor';
import { intro } from './ja/intro';
import { learning } from './ja/learning';
import { lessonPanels } from './ja/lessonPanels';
import { narration } from './ja/narration';
import { panel } from './ja/panel';
import { recording } from './ja/recording';
import { snapshots } from './ja/snapshots';
import { simulation } from './ja/simulation';

// conceptCheck is lazy-loaded (see en.ts note) and intentionally not spread here.
export const ja: Catalog = {
  ...annotations,
  ...assessment,
  ...edits,
  ...editor,
  ...intro,
  ...learning,
  ...narration,
  ...panel,
  ...recording,
  ...snapshots,
  ...simulation,
  ...canvasPanel,
  ...lessonPanels,
} as const;
