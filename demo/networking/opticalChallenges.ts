/**
 * The optical lesson's challenges (REQ-449): goals reached with the lesson's
 * own link controls (fibre, length, connectors). Every `reached` and every
 * number in `why` comes from the budget model in optical.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { ASKED_LINK, FIBRES, THIN_MARGIN_DB, budget, type Link } from './optical';

/** The length slider's step, km. */
const KM_STEP = 0.1;
const nextKm = (km: number) => Math.round((km + KM_STEP) * 10) / 10;
const distance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`);

export function opticalChallenges(link: Link): Challenge[] {
  const fibre = FIBRES[link.fibre];
  const mine = budget(link);
  const asked = budget(ASKED_LINK);

  // 1. Same length and connectors, another fibre, 3 dB of margin or more.
  const onlyFibre =
    link.km === ASKED_LINK.km &&
    link.connectors === ASKED_LINK.connectors &&
    link.fibre !== ASKED_LINK.fibre &&
    mine.verdict === 'comfortable';

  // 2. The longest 1310 nm link, 2 connectors, that keeps 3 dB of margin, to 0.1 km.
  const next = budget({ ...link, km: nextKm(link.km) });
  const longestComfortable =
    link.fibre === ASKED_LINK.fibre &&
    link.connectors === ASKED_LINK.connectors &&
    mine.verdict === 'comfortable' &&
    next.verdict !== 'comfortable';

  // 3. Enough light, and still down.
  const downWithLight = mine.limit === 'reach';

  return [
    {
      id: 'fibre-only',
      goal: {
        en: `Bring the ${ASKED_LINK.km} km link to ${THIN_MARGIN_DB} dB of margin or more by changing only the fibre (keep ${ASKED_LINK.km} km and ${ASKED_LINK.connectors} connectors).`,
        ja: `ファイバだけを変えて（${ASKED_LINK.km} km・コネクタ ${ASKED_LINK.connectors} 個のまま）、${ASKED_LINK.km} km のリンクの余裕を ${THIN_MARGIN_DB} dB 以上に戻してください。`,
      },
      hint: {
        en: 'Which line of the budget grows with every kilometre, and what sets how much it grows?',
        ja: 'バジェットのどの行が 1 km ごとに増えますか。その増え方を決めているのは何でしょう。',
      },
      reached: onlyFibre,
      why: {
        en: `At ${fibre.wavelengthNm} nm the glass loses ${fibre.dbPerKm} dB/km, so ${ASKED_LINK.km} km costs ${mine.fibreLossDb} dB instead of ${asked.fibreLossDb} dB. The splices and connectors are unchanged, and the margin is ${mine.marginDb} dB.`,
        ja: `${fibre.wavelengthNm} nm ではガラスの損失が ${fibre.dbPerKm} dB/km なので、${ASKED_LINK.km} km の損失は ${asked.fibreLossDb} dB ではなく ${mine.fibreLossDb} dB です。融着とコネクタは同じままで、余裕は ${mine.marginDb} dB になります。`,
      },
    },
    {
      id: 'longest-comfortable',
      goal: {
        en: `On single-mode fibre at ${FIBRES[ASKED_LINK.fibre].wavelengthNm} nm with ${ASKED_LINK.connectors} connectors, find the longest link, to ${KM_STEP} km, that still keeps ${THIN_MARGIN_DB} dB of margin.`,
        ja: `${FIBRES[ASKED_LINK.fibre].wavelengthNm} nm のシングルモードファイバ・コネクタ ${ASKED_LINK.connectors} 個で、${THIN_MARGIN_DB} dB の余裕を保てる最長のリンクを ${KM_STEP} km 単位で見つけてください。`,
      },
      hint: {
        en: `Start from what the optics allow (transmit power minus sensitivity), set aside ${THIN_MARGIN_DB} dB and the connectors; what is left pays for the fibre and its splices.`,
        ja: `光モジュールが許す損失（送信パワー − 受信感度）から ${THIN_MARGIN_DB} dB とコネクタの分を引くと、残りがファイバと融着に使える分です。`,
      },
      reached: longestComfortable,
      why: {
        en: `At ${distance(link.km)}: fibre ${mine.fibreLossDb} dB + ${mine.splices} splices ${mine.spliceLossDb} dB + connectors ${mine.connectorLossDb} dB = ${mine.totalLossDb} dB, leaving ${mine.marginDb} dB. At ${distance(nextKm(link.km))} the margin is ${next.marginDb} dB, under ${THIN_MARGIN_DB} dB.`,
        ja: `${distance(link.km)} では、ファイバ ${mine.fibreLossDb} dB + 融着 ${mine.splices} か所 ${mine.spliceLossDb} dB + コネクタ ${mine.connectorLossDb} dB = ${mine.totalLossDb} dB で、余裕は ${mine.marginDb} dB です。${distance(nextKm(link.km))} にすると余裕は ${next.marginDb} dB で、${THIN_MARGIN_DB} dB を下回ります。`,
      },
    },
    {
      id: 'down-with-light',
      goal: {
        en: 'Make a link that stays down even though enough light arrives (a margin of 0 dB or more).',
        ja: '光は十分に届いている（余裕 0 dB 以上）のに、リンクが上がらない状態を作ってください。',
      },
      hint: {
        en: 'Is loss the only thing that limits a fibre? Think of a fibre whose light takes many paths.',
        ja: 'ファイバの限界を決めるのは損失だけでしょうか。光が多くの経路を通るファイバを考えてみてください。',
      },
      reached: downWithLight,
      why: {
        en: `${distance(link.km)} of multimode fibre leaves ${mine.marginDb} dB of margin, but it is longer than the optic’s ${distance(fibre.reachKm ?? 0)} reach: modal dispersion smears the pulses before the light runs out.`,
        ja: `マルチモードファイバ ${distance(link.km)} でも余裕は ${mine.marginDb} dB ありますが、モジュールの到達距離 ${distance(fibre.reachKm ?? 0)} を超えています。光が足りなくなる前に、モード分散でパルスがにじむからです。`,
      },
    },
  ];
}
