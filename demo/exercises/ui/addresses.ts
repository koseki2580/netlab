/**
 * What the form accepts as an address. Only text that passes here is written
 * into the topology: the diagram and the grader never see half-typed input.
 */

import { parseCidr } from '../../../src/sandbox/validation/route';
import { isIpAddress } from '../../../src/utils/network';

/** Four numbers from 0 to 255. */
export function isAddress(text: string): boolean {
  return isIpAddress(text) && text.split('.').every((part) => Number(part) <= 255);
}

/** `10.0.2.0/24`. */
export function isNetwork(text: string): boolean {
  const parsed = parseCidr(text);
  return parsed !== null && isAddress(parsed.net);
}

/** A whole number from `min` to `max`, or null. */
export function wholeNumber(text: string, min: number, max: number): number | null {
  if (!/^\d{1,5}$/.test(text)) return null;
  const value = Number(text);
  return value >= min && value <= max ? value : null;
}

/**
 * What a learner typed, as the form reads it. A Japanese keyboard left in
 * full-width mode types 「１０、２０」 and 「１９２．１６８．１．５」; a learner was
 * told "numbers and commas" and could not see what was wrong. Full-width
 * digits, letters, dots, slashes, commas and spaces become the half-width
 * ones, and so do 「、」 and 「。」.
 */
export function typed(text: string): string {
  return text.normalize('NFKC').replace(/、/g, ',').replace(/。/g, '.').trim();
}
