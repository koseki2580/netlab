/**
 * The Q-in-Q lesson's challenges (REQ-449): goals reached with the lesson's
 * own controls (payload, core frame limit, how the provider carries VLANs and
 * which customer sends). Every `reached` and every number in `why` comes from
 * the frame and forwarding model in qinq.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import {
  CUSTOMER_VLAN,
  ETH_HEADER_BYTES,
  FCS_BYTES,
  TAG_BYTES,
  journey,
  type CustomerId,
  type Mode,
} from './qinq';

/** The lesson's controls after both reveals. */
export interface QinqChallengeState {
  readonly payload: number;
  readonly coreLimit: number;
  readonly customer: CustomerId;
  readonly mode: Mode;
}

/** The smaller core limit the lesson offers, bytes. */
export const TIGHT_CORE = 1522;
/** The payload slider's step, bytes. */
export const PAYLOAD_STEP = 4;

/** The core frame (PE1 → P) of customer A's frame under Q-in-Q. */
const coreFrame = (payload: number) => journey('A', 'qinq', payload).hops[1]!;

/** Settings that reach each challenge, used to explain one that is remembered but no longer set. */
const REACHING = {
  fill: { payload: 1496, coreLimit: TIGHT_CORE },
  leak: { customer: 'B', mode: 'shared-vlan' },
} as const;

export function qinqChallenges(state: QinqChallengeState): Challenge[] {
  // 1. The largest payload whose double-tagged core frame still fits a 1522-byte core.
  const fits = (payload: number) => coreFrame(payload).bytes <= state.coreLimit;
  const fillsCore =
    state.coreLimit === TIGHT_CORE && fits(state.payload) && !fits(state.payload + PAYLOAD_STEP);
  const fill = REACHING.fill;
  const filled = coreFrame(fill.payload);
  const over = coreFrame(fill.payload + PAYLOAD_STEP);

  // 2. B1's frame reaches A2 as well.
  const mine = journey(state.customer, state.mode);
  const leaks = state.customer === 'B' && mine.deliveredTo.includes('A2');
  const leak = journey(REACHING.leak.customer, REACHING.leak.mode);
  const isolated = journey(REACHING.leak.customer, 'qinq');
  const coreTags = leak.hops[1]!.tags.map((tag) => `${tag.kind}-VLAN ${tag.vid}`).join(' + ');

  return [
    {
      id: 'fill-core',
      goal: {
        en: `The provider’s core takes frames of at most ${TIGHT_CORE} bytes. Find the largest payload A1 can send that still crosses the core with both tags.`,
        ja: `事業者のコアが受け付けるフレームは最大 ${TIGHT_CORE} バイトです。2 つのタグを付けたままコアを通れる、A1 の最大のペイロードを見つけてください。`,
      },
      hint: {
        en: 'In the hop table, how many bytes does the frame gain at PE1? If the core cannot grow, what has to shrink?',
        ja: '1 ホップずつの表で、PE1 を通るとフレームは何バイト増えますか。コアの上限が変えられないなら、どこを小さくすればよいでしょう。',
      },
      reached: fillsCore,
      why: {
        en: `With ${fill.payload} bytes of payload the core frame is ${ETH_HEADER_BYTES} (header) + ${filled.tags.length} × ${TAG_BYTES} (S-tag and C-tag) + ${fill.payload} + ${FCS_BYTES} (FCS) = ${filled.bytes} bytes, exactly the core’s limit. ${fill.payload + PAYLOAD_STEP} bytes would make ${over.bytes} bytes, ${over.bytes - TIGHT_CORE} too many: the S-tag’s ${TAG_BYTES} bytes come out of the customer’s payload.`,
        ja: `ペイロードが ${fill.payload} バイトなら、コアでのフレームは ${ETH_HEADER_BYTES}（ヘッダ）+ ${filled.tags.length} × ${TAG_BYTES}（S タグと C タグ）+ ${fill.payload} + ${FCS_BYTES}（FCS）= ${filled.bytes} バイトで、ちょうどコアの上限です。${fill.payload + PAYLOAD_STEP} バイトにすると ${over.bytes} バイトになり、${over.bytes - TIGHT_CORE} バイト多すぎます。S タグの ${TAG_BYTES} バイトは顧客のペイロードから削られるのです。`,
      },
    },
    {
      id: 'leak',
      goal: {
        en: `Make a broadcast from B1 reach customer A’s site A2 as well.`,
        ja: `B1 からのブロードキャストを、A 社の拠点 A2 にも届かせてください。`,
      },
      hint: {
        en: 'The provider’s switches forward by the outermost tag. What is the outermost tag if the provider adds none of its own?',
        ja: '事業者のスイッチは一番外側のタグを見て転送します。事業者が自分のタグを付けなければ、一番外側のタグは何になるでしょう。',
      },
      reached: leaks,
      why: {
        en: `On one shared VLAN the core sees only ${coreTags}, and both A and B use VLAN ${CUSTOMER_VLAN}, so PE2 delivers B1’s broadcast to ${leak.deliveredTo.join(' and ')}. With Q-in-Q the core sees B’s own S-VLAN outside it, and the broadcast reaches only ${isolated.deliveredTo.join(', ')}.`,
        ja: `共通の VLAN 1 つでは、コアに見えるのは ${coreTags} だけで、A 社も B 社も VLAN ${CUSTOMER_VLAN} を使っているので、PE2 は B1 のブロードキャストを ${leak.deliveredTo.join(' と ')} に届けます。Q-in-Q なら B 社専用の S-VLAN がその外側に付くので、ブロードキャストは ${isolated.deliveredTo.join('、')} にしか届きません。`,
      },
    },
  ];
}
