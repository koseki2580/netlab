/**
 * The streaming-telemetry lesson's challenges (REQ-449): goals reached with the
 * SAMPLE interval control. Every `reached` and every number in `why` comes from
 * the counter model in telemetry.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import { BURST, OUTAGE, peak, readings } from './telemetry';

/** The SAMPLE intervals the lesson offers, s; each divides the ten minutes. */
export const SAMPLE_CHOICES = [5, 10, 20, 30, 60, 120, 300] as const;

const lowest = (interval: number) => Math.min(...readings(interval).map((r) => r.utilPct));
const clock = (at: number) => `${Math.floor(at / 60)}:${String(at % 60).padStart(2, '0')}`;

/** The longest offered interval for which `holds` is true. */
function longest(holds: (interval: number) => boolean): number {
  return [...SAMPLE_CHOICES].reverse().find(holds) ?? SAMPLE_CHOICES[0];
}

/** The next longer offered interval, or the same at the end. */
function nextLonger(interval: number): number {
  return SAMPLE_CHOICES.find((choice) => choice > interval) ?? interval;
}

export function telemetryChallenges(sampleS: number): Challenge[] {
  const series = readings(sampleS);
  const next = nextLonger(sampleS);

  // 1. The longest interval whose graph still shows the burst above half the link.
  const burstSeen = (interval: number) => peak(readings(interval)) >= 50;
  const peakReading = series.find((r) => r.utilPct === peak(series));

  // 2. The longest interval at which some reading still shows the outage as 0 %.
  const outageSeen = (interval: number) => lowest(interval) === 0;
  const zeroReading = series.find((r) => r.utilPct === 0);

  return [
    {
      id: 'burst-over-half',
      goal: {
        en: 'Find the longest SAMPLE interval whose graph still shows the burst above 50 %.',
        ja: 'バーストが 50 % を超えて見える、いちばん長い SAMPLE の間隔を見つけてください。',
      },
      hint: {
        en: `A reading is the average over its interval. How much of the interval is the ${BURST.to - BURST.from}-second burst, and where does the interval start?`,
        ja: `1 つの値はその間隔の平均です。${BURST.to - BURST.from} 秒のバーストが間隔のどれだけを占めるか、そして間隔がどこから始まるかを考えてみてください。`,
      },
      reached: burstSeen(sampleS) && sampleS === longest(burstSeen),
      why: {
        en: `Every ${sampleS} seconds, the reading ending ${clock(peakReading?.at ?? 0)} covers ${clock((peakReading?.at ?? 0) - sampleS)}–${clock(peakReading?.at ?? 0)}, which holds the burst at 100 % for most of it: ${peak(series)} %. Every ${next} seconds the burst is diluted to ${peak(readings(next))} %. Note that alignment matters too: every 20 seconds the burst straddles two readings, so it peaks lower, at ${peak(readings(20))} %.`,
        ja: `${sampleS} 秒ごとだと、${clock(peakReading?.at ?? 0)} の値は ${clock((peakReading?.at ?? 0) - sampleS)}〜${clock(peakReading?.at ?? 0)} の平均で、その大半が 100 % のバーストなので ${peak(series)} % になります。${next} 秒ごとにすると、バーストは薄まって ${peak(readings(next))} % です。区切りの位置も効きます。20 秒ごとだとバーストが 2 つの値にまたがるので、最高値は ${peak(readings(20))} % にとどまります。`,
      },
    },
    {
      id: 'outage-at-zero',
      goal: {
        en: `Find the longest SAMPLE interval at which a reading still drops to 0 % during the ${OUTAGE.to - OUTAGE.from}-second outage.`,
        ja: `${OUTAGE.to - OUTAGE.from} 秒間の障害のあいだ、値が 0 % まで落ちて見える、いちばん長い SAMPLE の間隔を見つけてください。`,
      },
      hint: {
        en: `The outage runs from ${clock(OUTAGE.from)} to ${clock(OUTAGE.to)}. For a reading to be 0 %, its whole interval must fall inside it.`,
        ja: `障害は ${clock(OUTAGE.from)} から ${clock(OUTAGE.to)} までです。値が 0 % になるには、その間隔がまるごと障害の中に入っていなければなりません。`,
      },
      reached: outageSeen(sampleS) && sampleS === longest(outageSeen),
      why: {
        en: `Every ${sampleS} seconds, the reading for ${clock((zeroReading?.at ?? 0) - sampleS)}–${clock(zeroReading?.at ?? 0)} lies wholly inside the outage, so the counter did not move: 0 %. Every ${next} seconds each reading straddles an edge of the outage, and the lowest one is ${lowest(next)} %.`,
        ja: `${sampleS} 秒ごとだと、${clock((zeroReading?.at ?? 0) - sampleS)}〜${clock(zeroReading?.at ?? 0)} の値はまるごと障害の中にあり、カウンタが進まないので 0 % です。${next} 秒ごとにすると、どの値も障害の端をまたぎ、最低でも ${lowest(next)} % になります。`,
      },
    },
  ];
}
