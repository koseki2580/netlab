import type { Catalog } from '../../types';
import { catalog as core } from './concept/concept-en-core';
import { catalog as fundamentals } from './concept/concept-en-fundamentals';
import { catalog as l2 } from './concept/concept-en-l2';
import { catalog as l2infra } from './concept/concept-en-l2infra';
import { catalog as l3 } from './concept/concept-en-l3';
import { catalog as l4 } from './concept/concept-en-l4';
import { catalog as l5 } from './concept/concept-en-l5';
import { catalog as l7web } from './concept/concept-en-l7web';
import { catalog as l7apps } from './concept/concept-en-l7apps';
import { catalog as routing } from './concept/concept-en-routing';

/**
 * Every concept-check string (en) in one catalog, for tests and tools. The
 * panel never imports this: it loads the chunks it needs one by one
 * (`loadConceptChunk` in `src/components/learning/conceptCatalog.ts`).
 */
export const conceptCheck: Catalog = {
  ...core,
  ...fundamentals,
  ...l2,
  ...l2infra,
  ...l3,
  ...l4,
  ...l5,
  ...l7web,
  ...l7apps,
  ...routing,
};
