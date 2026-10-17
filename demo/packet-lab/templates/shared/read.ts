/** What the read-packet templates share: the questions, worded once, and their candidates. */

import { shuffled, type Draw } from '../../../exercises/templates/shared/draw';
import { L, labelOf } from '../../../exercises/templates/shared/text';
import { FIELD_LABELS } from '../../fields';
import type {
  Candidate,
  FieldId,
  Localised,
  PacketGiven,
  QuestionAsk,
  ReadQuestion,
} from '../../model';
import type { Names } from './nets';

const PROMPTS: Readonly<Record<QuestionAsk, Localised>> = {
  'arrives-at': L('Which device does this packet reach?', 'このパケットは、どの機器に届きますか。'),
  'which-arrive': L(
    'Which of the two packets arrive?',
    '2 つのパケットのうち、届くのはどれですか。',
  ),
  'stops-at': L(
    'Where does the packet stop? (If it arrives, choose where it arrives.)',
    'パケットはどこで止まりますか。（届くなら、届く機器を選びます。）',
  ),
  cause: L('Which field made it stop there?', '止まった原因は、どの欄ですか。'),
  'cut-by': L('Which router cuts it into pieces?', 'どのルータがパケットを分割しますか。'),
  'frame-src-mac': L(
    "On that cable, what is the frame's source MAC address?",
    'その回線で、フレームの送り主 MAC アドレスはどれですか。',
  ),
  'frame-dst-mac': L(
    "On that cable, what is the frame's destination MAC address?",
    'その回線で、フレームのあて先 MAC アドレスはどれですか。',
  ),
  'ttl-on-link': L(
    "On that cable, what is the packet's TTL?",
    'その回線で、パケットの TTL はいくつですか。',
  ),
};

/** The right one first, then the others, each with the mistake it is; the order comes from the seed. */
export function question(
  draw: Draw,
  id: string,
  ask: QuestionAsk,
  answer: string,
  candidates: readonly Candidate[],
): ReadQuestion {
  return { id, ask, prompt: PROMPTS[ask], candidates: shuffled(draw, candidates), answer };
}

export const device = (names: Names, id: string, why: string): Candidate => ({
  value: id,
  label: labelOf(names[id] ?? L(id, id)),
  why,
});

export const NOWHERE = L('Nowhere: it is thrown away', 'どこにも届かない（途中で捨てられる）');

export const fieldCandidate = (id: FieldId, why: string): Candidate => ({
  value: id,
  label: FIELD_LABELS[id],
  why,
});

export type Captured = PacketGiven & { readonly dstIp: string; readonly ttl: number };
