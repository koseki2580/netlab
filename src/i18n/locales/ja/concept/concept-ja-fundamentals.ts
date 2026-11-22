import type { Catalog } from '../../../types';
import { model } from './decks/model';
import { addressing } from './decks/addressing';
import { ports } from './decks/ports';
import { commands } from './decks/commands';

/** The concept checks' `fundamentals` chunk (ja): the questions of model, addressing, ports, commands. */
export const catalog: Catalog = {
  ...model,
  ...addressing,
  ...ports,
  ...commands,
};
