import { CONCEPT_DECKS } from './decks';
import type { ConceptDeck, ConceptLayer, ConceptOption, ConceptQuestion } from './types';

export const CONCEPT_LAYER_ORDER: readonly ConceptLayer[] = [
  'fundamentals',
  'l2',
  'l3',
  'l4',
  'l5',
  'l7',
  'routing',
];

/** Look up a deck by id, or `undefined`. */
export function getDeck(id: string): ConceptDeck | undefined {
  return CONCEPT_DECKS.find((deck) => deck.id === id);
}

/** Decks grouped by layer in `CONCEPT_LAYER_ORDER`, omitting empty layers. */
export function decksByLayer(): { layer: ConceptLayer; decks: ConceptDeck[] }[] {
  return CONCEPT_LAYER_ORDER.map((layer) => ({
    layer,
    decks: CONCEPT_DECKS.filter((deck) => deck.layer === layer),
  })).filter((group) => group.decks.length > 0);
}

/** The single correct option of a question (decks guarantee exactly one). */
export function correctOption(question: ConceptQuestion): ConceptOption | undefined {
  return question.options.find((option) => option.correct);
}

/** True when `optionKey` is the question's correct choice. */
export function isCorrectChoice(question: ConceptQuestion, optionKey: string): boolean {
  return correctOption(question)?.key === optionKey;
}
