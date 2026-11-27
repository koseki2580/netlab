/**
 * Challenges for the real-time web lesson (REQ-449): goals reached with the
 * lesson's own controls, each checked by the websocket model.
 */
import type { Challenge } from '../components/LessonChallenges';
import { cost, frameHeaderBytes } from './websocket';

/** The lesson's controls after the reveal. */
export interface WebSocketChallengeState {
  readonly everyS: number;
  readonly pollS: number;
  readonly frameSize: number;
  readonly fromClient: boolean;
}

/** The poll interval the first challenge keeps fixed (the one the lesson asked about). */
export const KEPT_POLL_S = 5;
/** The second challenge's delay limit, ms. */
export const DELAY_LIMIT_MS = 2_000;
/** The largest frame header RFC 6455 allows: 2 + 8 length bytes + 4 masking-key bytes. */
export const LARGEST_HEADER_BYTES = 14;
/** A message interval that reaches the first challenge (the slider's minimum). */
const REACHING_EVERY_S = 1;
/** The poll slider's range, seconds. */
export const POLL_RANGE_S = { min: 1, max: 30 } as const;
/** The payload sizes the lesson offers, bytes. */
export const FRAME_SIZES: readonly number[] = [100, 1_000, 70_000];

/** The slowest poll interval on the slider whose average delay stays under the limit. */
function slowestPollUnderLimit(everyS: number): number {
  let slowest: number = POLL_RANGE_S.min;
  for (let p = POLL_RANGE_S.min; p <= POLL_RANGE_S.max; p += 1) {
    if (cost('short', everyS, p).averageDelayMs < DELAY_LIMIT_MS) slowest = p;
  }
  return slowest;
}

export function websocketChallenges(state: WebSocketChallengeState): Challenge[] {
  const { everyS, pollS, frameSize, fromClient } = state;

  const short = cost('short', everyS, pollS);
  const long = cost('long', everyS, pollS);
  const longCostsMore = pollS === KEPT_POLL_S && long.requests > short.requests;
  // A remembered challenge still explains itself with a setting that reaches it.
  const shownEveryS = longCostsMore ? everyS : REACHING_EVERY_S;
  const shownShort = cost('short', shownEveryS, KEPT_POLL_S);
  const shownLong = cost('long', shownEveryS, KEPT_POLL_S);

  const slowestPollS = slowestPollUnderLimit(everyS);
  const atSlowest = cost('short', everyS, slowestPollS);
  const slower = cost('short', everyS, slowestPollS + 1);

  const header = frameHeaderBytes(frameSize, fromClient);
  const largestSize = FRAME_SIZES.find(
    (size) => frameHeaderBytes(size, true) === LARGEST_HEADER_BYTES,
  )!;

  return [
    {
      id: 'long-costs-more',
      goal: {
        en: `Make long polling send more requests than short polling, keeping short polling at every ${KEPT_POLL_S} s.`,
        ja: `ショートポーリングを ${KEPT_POLL_S} 秒ごとのままにして、ロングポーリングのほうがリクエストが多くなるようにしてください。`,
      },
      hint: {
        en: 'What does a long-poll request wait for before it ends, and how often does that happen?',
        ja: 'ロングポーリングのリクエストは何を待って終わるのでしょうか。それはどれくらいの頻度で起きますか？',
      },
      reached: longCostsMore,
      why: {
        en: `With a message every ${shownEveryS} s there are ${shownLong.events} messages in the minute, and each one ends a long-poll request, so long polling sends ${shownLong.requests} requests against short polling’s ${shownShort.requests}. Long polling saves requests only when news is rarer than the polls.`,
        ja: `${shownEveryS} 秒ごとにメッセージが来ると 1 分で ${shownLong.events} 件になり、その 1 件ごとにロングポーリングのリクエストが 1 回終わります。そのためロングポーリングは ${shownLong.requests} 回、ショートポーリングは ${shownShort.requests} 回です。ロングポーリングでリクエストが減るのは、知らせがポーリングより少ないときだけです。`,
      },
    },
    {
      id: 'slowest-poll',
      goal: {
        en: `Find the slowest short-polling interval whose average delay is still under ${DELAY_LIMIT_MS / 1000} s.`,
        ja: `平均の遅れが ${DELAY_LIMIT_MS / 1000} 秒未満に収まる、いちばん長いショートポーリングの間隔を見つけてください。`,
      },
      hint: {
        en: 'A message arrives at a random moment between two polls. On average, how long does it wait?',
        ja: 'メッセージは 2 回のポーリングの間のでたらめな瞬間に届きます。平均するとどれくらい待つでしょうか？',
      },
      reached: pollS === slowestPollS,
      why: {
        en: `A message waits half the interval on average, then travels: polling every ${slowestPollS} s gives ${atSlowest.averageDelayMs} ms, and every ${slowestPollS + 1} s would give ${slower.averageDelayMs} ms. Halving the delay doubles the requests: ${atSlowest.requests} a minute here.`,
        ja: `メッセージは平均して間隔の半分待ってから届きます。${slowestPollS} 秒ごとなら ${atSlowest.averageDelayMs} ms、${slowestPollS + 1} 秒ごとなら ${slower.averageDelayMs} ms です。遅れを半分にするとリクエストは 2 倍になり、ここでは 1 分に ${atSlowest.requests} 回です。`,
      },
    },
    {
      id: 'largest-header',
      goal: {
        en: `Make a frame header as large as RFC 6455 allows: ${LARGEST_HEADER_BYTES} bytes.`,
        ja: `フレームのヘッダーを RFC 6455 で可能な最大の ${LARGEST_HEADER_BYTES} バイトにしてください。`,
      },
      hint: {
        en: 'Two separate things add bytes to the 2-byte header. Which ones?',
        ja: '2 バイトのヘッダーにバイトを足すものは 2 つあります。何と何でしょうか？',
      },
      reached: header === LARGEST_HEADER_BYTES,
      why: {
        en: `${largestSize.toLocaleString('en')} bytes do not fit the 16-bit length, so the header carries the 64-bit one (2 + 8 bytes), and a frame from the client adds the 4-byte masking key: ${frameHeaderBytes(largestSize, true)} bytes.`,
        ja: `${largestSize.toLocaleString('ja')} バイトは 16 ビットの長さに収まらないので、ヘッダーは 64 ビットの長さを持ちます（2 + 8 バイト）。さらにクライアントからのフレームには 4 バイトのマスク鍵が付き、${frameHeaderBytes(largestSize, true)} バイトになります。`,
      },
    },
  ];
}
