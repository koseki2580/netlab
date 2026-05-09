import type { Catalog } from '../types';
import { narration } from './en/narration';
import { panel } from './en/panel';

export const en: Catalog = {
  ...narration,
  ...panel,
} as const;
