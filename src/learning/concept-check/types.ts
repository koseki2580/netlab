/** OSI-ish grouping used to organize protocol decks in the picker. */
export type ConceptLayer = 'fundamentals' | 'l2' | 'l3' | 'l4' | 'l5' | 'l7' | 'routing';

/** One answer choice; exactly one option per question is `correct`. */
export interface ConceptOption {
  /** i18n key for the option text. */
  readonly key: string;
  readonly correct?: boolean;
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
  /** i18n key for the protocol's display name. */
  readonly nameKey: string;
  readonly questions: readonly ConceptQuestion[];
}
