/**
 * Whether a device name fits its box on the diagram.
 *
 * Measured in a browser (desktop and a 390px phone give the same numbers,
 * because the canvas zooms the whole node): a node box is 80px wide, and the
 * library draws the name on one 60px line at 11px bold, so anything past five
 * kana or nine Latin letters ran out of the box. The exercise diagram
 * (`ui/ExerciseDiagram.tsx`) gives the name 70px and a second line. A
 * full-width character is one em wide, a half-width one about 0.6em in the
 * monospace font the nodes use, so a line holds six kana or ten Latin letters.
 * A name that needs a third line, or has a word longer than a line, does not
 * fit.
 */

export const LABEL_WIDTH_PX = 70;
export const LABEL_FONT_PX = 11;
export const LABEL_MAX_LINES = 2;

const LINE_EM = LABEL_WIDTH_PX / LABEL_FONT_PX;
const HALF_WIDTH_EM = 0.602;

const isHalfWidth = (char: string): boolean => /[ -~]/.test(char);
const widthOf = (text: string): number =>
  [...text].reduce((sum, char) => sum + (isHalfWidth(char) ? HALF_WIDTH_EM : 1), 0);

/**
 * The pieces a browser will not break inside: a run of Latin letters up to and
 * including a hyphen, a space, or one full-width character.
 */
function chunksOf(label: string): string[] {
  return label.match(/ |[!-~]*?-|[!-~]+|[^ -~]/g) ?? [];
}

/** The lines a label takes, or `Infinity` when one unbreakable piece is wider than a line. */
export function labelLines(label: string): number {
  let lines = 1;
  let used = 0;
  for (const chunk of chunksOf(label)) {
    const width = widthOf(chunk);
    if (chunk === ' ') {
      // A space at the end of a line hangs; it only counts between two words.
      used += width;
      continue;
    }
    if (width > LINE_EM) return Infinity;
    if (used > 0 && used + width > LINE_EM) {
      lines += 1;
      used = 0;
    }
    used += width;
  }
  return lines;
}

export const labelFits = (label: string): boolean => labelLines(label) <= LABEL_MAX_LINES;
