/**
 * The SCTP lesson's challenges (REQ-449): failover goals reached with the
 * lesson's own Path.Max.Retrans and RTO.Min sliders. Every `reached` and every
 * number in `why` comes from the failover model in sctp.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { RFC_DEFAULTS, defaultFailoverParams, failover } from './sctp';

export interface SctpTuning {
  readonly pathMaxRetrans: number;
  readonly rtoMinMs: number;
}

/** The failover time limits the challenges ask for, ms. */
const FAST_MS = 10_000;
const SUB_SECOND_MS = 1000;
/** The fewest consecutive timeouts the sub-second challenge must still survive. */
const MIN_RETRANS = 2;

const secs = (ms: number) => Number((ms / 1000).toFixed(1));
const tuned = (tuning: SctpTuning) => failover({ ...defaultFailoverParams(), ...tuning });

export function sctpChallenges(tuning: SctpTuning): Challenge[] {
  const mine = tuned(tuning);
  const sum = mine.timeouts.map((x) => secs(x.rtoMs)).join(' + ');
  const more = tuned({ ...tuning, pathMaxRetrans: tuning.pathMaxRetrans + 1 });
  const lowerRto = tuned({ ...tuning, rtoMinMs: tuning.rtoMinMs + 100 });

  // 1. Keep Path.Max.Retrans at the default; fail over within 10 s with RTO.Min alone.
  const rtoOnly =
    tuning.pathMaxRetrans === RFC_DEFAULTS.pathMaxRetrans && mine.failoverMs <= FAST_MS;

  // 2. Keep RTO.Min at 1 s; the largest Path.Max.Retrans that still fails over within 10 s.
  const mostPatient =
    tuning.rtoMinMs === RFC_DEFAULTS.rtoMinMs &&
    mine.failoverMs <= FAST_MS &&
    more.failoverMs > FAST_MS;

  // 3. Under 1 s while still tolerating two consecutive timeouts.
  const subSecond = tuning.pathMaxRetrans >= MIN_RETRANS && mine.failoverMs < SUB_SECOND_MS;

  return [
    {
      id: 'rto-min-only',
      goal: {
        en: `Make A move to the secondary within ${secs(FAST_MS)} s by changing only RTO.Min (keep Path.Max.Retrans at ${RFC_DEFAULTS.pathMaxRetrans}).`,
        ja: `RTO.Min だけを変えて（Path.Max.Retrans は ${RFC_DEFAULTS.pathMaxRetrans} のまま）、A が ${secs(FAST_MS)} 秒以内にセカンダリへ移るようにしてください。`,
      },
      hint: {
        en: 'The number of timeouts stays the same, and each one doubles the last. What sets the length of the first?',
        ja: 'タイムアウトの回数は変わらず、1 回ごとに前の 2 倍になります。最初の 1 回の長さを決めているのは何でしょう。',
      },
      reached: rtoOnly,
      why: {
        en: `With RTO.Min at ${tuning.rtoMinMs} ms the first RTO is ${mine.startRtoMs} ms, and the ${mine.timeouts.length} doubling timeouts add up to ${sum} = ${secs(mine.failoverMs)} s. Every timeout scales with the first, so RTO.Min ${tuning.rtoMinMs + 100} ms would take ${secs(lowerRto.failoverMs)} s.`,
        ja: `RTO.Min が ${tuning.rtoMinMs} ms なら最初の RTO は ${mine.startRtoMs} ms で、2 倍ずつ伸びる ${mine.timeouts.length} 回のタイムアウトの合計は ${sum} = ${secs(mine.failoverMs)} 秒です。どのタイムアウトも最初の 1 回に比例するので、RTO.Min を ${tuning.rtoMinMs + 100} ms にすると ${secs(lowerRto.failoverMs)} 秒かかります。`,
      },
    },
    {
      id: 'most-patient',
      goal: {
        en: `Keep RTO.Min at ${secs(RFC_DEFAULTS.rtoMinMs)} s and find the largest Path.Max.Retrans with which A still moves to the secondary within ${secs(FAST_MS)} s.`,
        ja: `RTO.Min を ${secs(RFC_DEFAULTS.rtoMinMs)} 秒のままにして、A が ${secs(FAST_MS)} 秒以内にセカンダリへ移れる最大の Path.Max.Retrans を見つけてください。`,
      },
      hint: {
        en: 'Path.Max.Retrans = n means n + 1 timeouts. How does the total grow when each timeout is twice the last?',
        ja: 'Path.Max.Retrans = n ならタイムアウトは n + 1 回です。1 回ごとに 2 倍になるとき、合計はどう増えるでしょう。',
      },
      reached: mostPatient,
      why: {
        en: `Path.Max.Retrans ${tuning.pathMaxRetrans} gives ${mine.timeouts.length} timeouts: ${sum} = ${secs(mine.failoverMs)} s. One more allowed error adds a timeout as long as all the others together plus one, and takes ${secs(more.failoverMs)} s.`,
        ja: `Path.Max.Retrans ${tuning.pathMaxRetrans} ではタイムアウトは ${mine.timeouts.length} 回で、${sum} = ${secs(mine.failoverMs)} 秒です。エラーをもう 1 つ許すと、それまでの合計より長いタイムアウトが 1 回増え、${secs(more.failoverMs)} 秒かかります。`,
      },
    },
    {
      id: 'sub-second',
      goal: {
        en: `Make A move to the secondary in under ${secs(SUB_SECOND_MS)} s while still giving the primary at least ${MIN_RETRANS} errors before it is marked inactive (Path.Max.Retrans ≥ ${MIN_RETRANS}).`,
        ja: `プライマリを使用不可とみなす前に少なくとも ${MIN_RETRANS} 回のエラーを許したまま（Path.Max.Retrans ≥ ${MIN_RETRANS}）、A が ${secs(SUB_SECOND_MS)} 秒未満でセカンダリへ移るようにしてください。`,
      },
      hint: {
        en: 'Count the timeouts the smallest allowed Path.Max.Retrans needs, then ask how short the first one can be.',
        ja: '許される最小の Path.Max.Retrans で何回タイムアウトするかを数え、最初の 1 回をどこまで短くできるか考えてみてください。',
      },
      reached: subSecond,
      why: {
        en: `RTO.Min ${tuning.rtoMinMs} ms and Path.Max.Retrans ${tuning.pathMaxRetrans}: ${mine.timeouts.length} timeouts of ${mine.timeouts.map((x) => `${x.rtoMs} ms`).join(' + ')} = ${mine.failoverMs} ms. One more allowed error would take ${more.failoverMs} ms. A threshold this low also marks a healthy path inactive after a short burst of loss.`,
        ja: `RTO.Min ${tuning.rtoMinMs} ms、Path.Max.Retrans ${tuning.pathMaxRetrans} では、タイムアウトは ${mine.timeouts.length} 回で ${mine.timeouts.map((x) => `${x.rtoMs} ms`).join(' + ')} = ${mine.failoverMs} ms です。エラーをもう 1 つ許すと ${more.failoverMs} ms かかります。ここまで低いしきい値だと、短いロスだけで正常な経路も使用不可とみなされます。`,
      },
    },
  ];
}
