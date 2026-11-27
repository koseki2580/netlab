/**
 * The PON lesson's challenges (REQ-449): goals reached with the optical
 * budget's controls (split, fibre length, connectors, optical class). Every
 * `reached` and every number in `why` comes from the budget model in pon.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { CLASSES, CONNECTOR_DB, FIBRE_DB_PER_KM, budget, type Plant } from './pon';

/** The budget card's controls. */
export interface PonChallengeState {
  readonly plant: Plant;
  readonly classId: string;
}

/** The plant and class the budget card starts from. */
export const ASKED_STATE: PonChallengeState = {
  plant: { split: 32, km: 20, connectors: 4 },
  classId: 'N1',
};
/** The split the first challenge asks for. */
export const BIG_SPLIT = 64;

const classOf = (id: string) => CLASSES.find((c) => c.id === id)!;
const result = (state: PonChallengeState) => budget(state.plant, classOf(state.classId));
const db = (value: number) => `${value.toFixed(2)} dB`;

/** Settings that reach each challenge, used to explain one that is remembered but no longer set. */
const REACHING = {
  split: { plant: { split: BIG_SPLIT, km: 20, connectors: 2 }, classId: 'N1' },
  longest: { plant: { split: 32, km: 27, connectors: 4 }, classId: 'N1' },
  strong: { plant: { split: 8, km: 0, connectors: 2 }, classId: 'N1' },
} as const satisfies Record<string, PonChallengeState>;

export function ponChallenges(state: PonChallengeState): Challenge[] {
  const { plant } = state;
  const asked = ASKED_STATE.plant;
  const mine = result(state);

  // 1. 1:64 over the same 20 km, still in class N1.
  const splitReached =
    plant.split === BIG_SPLIT &&
    plant.km === asked.km &&
    state.classId === ASKED_STATE.classId &&
    mine.verdict === 'ok';
  const s = REACHING.split;
  const sBudget = result(s);
  const sOneMore = result({ ...s, plant: { ...s.plant, connectors: s.plant.connectors + 1 } });

  // 2. The longest fibre, in whole km, that stays in class N1 with the asked splitter and connectors.
  const longerKm = (km: number) => result({ ...state, plant: { ...plant, km } });
  const longestReached =
    plant.split === asked.split &&
    plant.connectors === asked.connectors &&
    state.classId === ASKED_STATE.classId &&
    mine.verdict === 'ok' &&
    longerKm(plant.km + 1).verdict === 'over';
  const l = REACHING.longest;
  const lBudget = result(l);
  const lNext = result({ ...l, plant: { ...l.plant, km: l.plant.km + 1 } });

  // 3. Too little loss: under the class's minimum.
  const strongReached = mine.verdict === 'under';
  const strong = strongReached ? state : REACHING.strong;
  const stBudget = result(strong);
  const stClass = classOf(strong.classId);

  const n1 = classOf(ASKED_STATE.classId);
  return [
    {
      id: 'split-64',
      goal: {
        en: `Serve ${BIG_SPLIT} homes from one OLT port over the same ${asked.km} km of fibre, and stay within class ${n1.id} (${n1.minDb}–${n1.maxDb} dB).`,
        ja: `ファイバは同じ ${asked.km} km のまま、1 つの OLT ポートで ${BIG_SPLIT} 軒をまかない、クラス ${n1.id}（${n1.minDb}〜${n1.maxDb} dB）に収めてください。`,
      },
      hint: {
        en: 'Doubling the split adds one more 1:2 stage. Which other line of the budget can you still make smaller?',
        ja: '分岐数を 2 倍にすると 1:2 の段が 1 つ増えます。バジェットのほかの行で、まだ減らせるのはどれでしょう。',
      },
      reached: splitReached,
      why: {
        en: `1:${s.plant.split} costs ${db(sBudget.splitterDb)} and ${s.plant.km} km ${db(sBudget.fibreDb)}, so only ${s.plant.connectors} connectors (${db(sBudget.connectorDb)}) fit: ${db(sBudget.totalDb)}, just inside the ${n1.maxDb} dB maximum. One more connector adds ${CONNECTOR_DB} dB and makes ${db(sOneMore.totalDb)}, over it.`,
        ja: `1:${s.plant.split} の損失は ${db(sBudget.splitterDb)}、${s.plant.km} km のファイバで ${db(sBudget.fibreDb)} なので、入るのはコネクタ ${s.plant.connectors} 個（${db(sBudget.connectorDb)}）までです。合計 ${db(sBudget.totalDb)} で、上限 ${n1.maxDb} dB にちょうど収まります。コネクタを 1 個増やすと ${CONNECTOR_DB} dB 増えて ${db(sOneMore.totalDb)} になり、上限を超えます。`,
      },
    },
    {
      id: 'longest-n1',
      goal: {
        en: `With the 1:${asked.split} splitter, ${asked.connectors} connectors and class ${n1.id}, find the longest fibre, in whole km, that stays within the class.`,
        ja: `1:${asked.split} のスプリッタ、コネクタ ${asked.connectors} 個、クラス ${n1.id} のまま、クラスに収まる最長のファイバを 1 km 単位で見つけてください。`,
      },
      hint: {
        en: `Subtract the splitter and the connectors from the class’s maximum; the fibre may spend what is left at ${FIBRE_DB_PER_KM} dB/km.`,
        ja: `クラスの上限からスプリッタとコネクタの分を引くと、残りをファイバが ${FIBRE_DB_PER_KM} dB/km で使えます。`,
      },
      reached: longestReached,
      why: {
        en: `At ${l.plant.km} km: splitter ${db(lBudget.splitterDb)} + fibre ${db(lBudget.fibreDb)} + connectors ${db(lBudget.connectorDb)} = ${db(lBudget.totalDb)}, ${db(lBudget.marginDb)} under the ${n1.maxDb} dB maximum. At ${l.plant.km + 1} km the total is ${db(lNext.totalDb)}, over it.`,
        ja: `${l.plant.km} km では、スプリッタ ${db(lBudget.splitterDb)} + ファイバ ${db(lBudget.fibreDb)} + コネクタ ${db(lBudget.connectorDb)} = ${db(lBudget.totalDb)} で、上限 ${n1.maxDb} dB まで ${db(lBudget.marginDb)} あります。${l.plant.km + 1} km にすると合計 ${db(lNext.totalDb)} で、上限を超えます。`,
      },
    },
    {
      id: 'too-strong',
      goal: {
        en: 'Make the light arrive too strong for the receiver.',
        ja: '受信器にとって強すぎる光が届く状態を作ってください。',
      },
      hint: {
        en: 'A class has a minimum loss as well as a maximum. What would make the plant lose very little?',
        ja: 'クラスには損失の上限だけでなく下限もあります。設備の損失をとても小さくするには、どうすればよいでしょう。',
      },
      reached: strongReached,
      why: {
        en: `1:${strong.plant.split}, ${strong.plant.km} km and ${strong.plant.connectors} connectors lose only ${db(stBudget.totalDb)}, below class ${stClass.id}’s minimum of ${stClass.minDb} dB. Optics built to reach across ${stClass.maxDb} dB of loss would overload this receiver, so the installer adds an attenuator.`,
        ja: `1:${strong.plant.split}、${strong.plant.km} km、コネクタ ${strong.plant.connectors} 個では損失は ${db(stBudget.totalDb)} しかなく、クラス ${stClass.id} の下限 ${stClass.minDb} dB を下回ります。${stClass.maxDb} dB の損失を越えて届くように作られた光モジュールでは、この受信器が飽和してしまうので、施工時に減衰器を入れます。`,
      },
    },
  ];
}
