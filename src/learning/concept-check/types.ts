/** OSI-ish grouping used to organize protocol decks in the picker. */
export type ConceptLayer = 'fundamentals' | 'l2' | 'l3' | 'l4' | 'l5' | 'l7' | 'routing';

/**
 * A lazily loaded group of concept-check strings. `core` holds the panel's own
 * strings and every deck's name; each other chunk holds its decks' questions.
 * A deck's chunk is its layer, except that layer 7 is split in two and layer 2's
 * data-centre and provider decks have a chunk of their own (`l2infra`).
 */
export type ConceptChunk =
  | 'core'
  | 'fundamentals'
  | 'l2'
  | 'l2infra'
  | 'l3'
  | 'l4'
  | 'l5'
  | 'l7web'
  | 'l7apps'
  | 'routing';

/** The chunk a deck's questions live in (never `core`). */
export type ConceptDeckChunk = Exclude<ConceptChunk, 'core'>;

/** One answer choice; exactly one option per question is `correct`. */
export interface ConceptOption {
  /** i18n key for the option text. */
  readonly key: string;
  readonly correct?: boolean;
  /**
   * Optional i18n key for a distractor explanation — *why this wrong choice is
   * wrong*. Shown (before the general explanation) when a learner picks it.
   * Rolled out deck-by-deck; absent options fall back to the general one.
   */
  readonly whyKey?: string;
}

/** A single multiple-choice question, all text addressed by i18n key. */
export interface ConceptQuestion {
  readonly id: string;
  readonly promptKey: string;
  readonly explanationKey: string;
  readonly options: readonly ConceptOption[];
}

/** A protocol's deck of concept-check questions. */
export interface ConceptDeck {
  readonly id: string;
  readonly layer: ConceptLayer;
  /** The string chunk holding this deck's questions (its name is in `core`). */
  readonly chunk: ConceptDeckChunk;
  /** i18n key for the protocol's display name. */
  readonly nameKey: string;
  readonly questions: readonly ConceptQuestion[];
}
