/** REQ-449 — the carrier-grade NAT lesson's challenges, checked by its model (TC-2636). */
import type { Challenge } from '../components/LessonChallenges';
import { heavySubscriber, mapPortSet } from './cgnat';

export interface CgnatChallengeState {
  readonly blockSize: number;
  readonly maxBlocks: number;
  readonly flows: number;
  readonly psidBits: number;
}

/** The household's flows in the lesson's question. */
const BUSY_FLOWS = 1200;
const MANY_SUBSCRIBERS = 100;
const BIG_FLOWS = 3000;
const MAP_PORTS = 2000;
const MAP_SHARING = 32;

const n = (value: number) => value.toLocaleString('en');

export function cgnatChallenges(state: CgnatChallengeState): Challenge[] {
  const heavy = heavySubscriber(state.blockSize, state.maxBlocks, state.flows);
  const map = mapPortSet(state.psidBits, 1);

  return [
    {
      id: 'many-subscribers',
      goal: {
        en: `With the household at ${n(BUSY_FLOWS)} flows or more, let every flow through while the address still serves at least ${MANY_SUBSCRIBERS} subscribers.`,
        ja: `世帯の接続数を ${n(BUSY_FLOWS)} 本以上にしたまま、すべての接続を通し、しかもこのアドレスで ${MANY_SUBSCRIBERS} 人以上を収容してください。`,
      },
      hint: {
        en: 'A big block costs everyone else ports. What if the blocks were smaller, and the household could hold more of them?',
        ja: '大きなブロックは、ほかの加入者の分のポートを使ってしまいます。ブロックを小さくして、その世帯だけが何個も持てるようにしたら？',
      },
      reached:
        state.flows >= BUSY_FLOWS &&
        heavy.firstRefusedFlow === null &&
        heavy.subscribersServed >= MANY_SUBSCRIBERS,
      why: {
        en: `Blocks of ${n(state.blockSize)} with up to ${state.maxBlocks} per subscriber: the household takes ${heavy.blocks} blocks = ${n(heavy.ports)} ports for its ${n(state.flows)} flows, and everyone else keeps a small block of their own, so the address serves ${heavy.subscribersServed}. Small blocks plus a per-subscriber limit give ports to whoever needs them, without fixing a big share for everyone.`,
        ja: `${n(state.blockSize)} ポートのブロックを 1 人 ${state.maxBlocks} 個まで渡すと、この世帯は ${heavy.blocks} ブロック = ${n(heavy.ports)} ポートを得て ${n(state.flows)} 本を通します。ほかの加入者は小さなブロックを 1 つずつ持つので、収容できるのは ${heavy.subscribersServed} 人です。小さなブロックと加入者ごとの上限を組み合わせると、全員に大きな取り分を固定せずに、必要な人にだけポートを渡せます。`,
      },
    },
    {
      id: 'one-record',
      goal: {
        en: `With the household at ${n(BIG_FLOWS)} flows or more, let every flow through with a single log record for it.`,
        ja: `世帯の接続数を ${n(BIG_FLOWS)} 本以上にして、すべての接続を通し、しかもこの世帯のログを 1 件だけにしてください。`,
      },
      hint: {
        en: 'The CGN writes one record per block it hands out. How many flows must one block hold?',
        ja: 'CGN は渡したブロックごとに 1 件記録します。1 つのブロックに何本分のポートが要りますか？',
      },
      reached:
        state.flows >= BIG_FLOWS && heavy.firstRefusedFlow === null && heavy.blockLogRecords === 1,
      why: {
        en: `One block of ${n(state.blockSize)} ports holds all ${n(state.flows)} flows, so the CGN logs ${heavy.blockLogRecords} record where per-flow logging would need ${n(heavy.flowLogRecords)}. The price: the address now serves only ${heavy.subscribersServed} subscribers.`,
        ja: `${n(state.blockSize)} ポートの 1 ブロックに ${n(state.flows)} 本すべてが収まるので、CGN の記録は ${heavy.blockLogRecords} 件です。通信ごとに記録すれば ${n(heavy.flowLogRecords)} 件になります。その代わり、このアドレスで収容できるのは ${heavy.subscribersServed} 人だけになります。`,
      },
    },
    {
      id: 'map-ports',
      goal: {
        en: `In the MAP-E view, give each subscriber at least ${n(MAP_PORTS)} ports while the address is still shared by at least ${MAP_SHARING} subscribers.`,
        ja: `MAP-E の表示で、1 人あたり ${n(MAP_PORTS)} ポート以上を渡しつつ、1 アドレスを ${MAP_SHARING} 人以上で共有してください。`,
      },
      hint: {
        en: 'Each bit of the PSID doubles the number of subscribers. What does it do to each one’s ports?',
        ja: 'PSID が 1 ビット増えるごとに、共有する人数は 2 倍になります。1 人あたりのポートはどうなりますか？',
      },
      reached: map.portsPerSubscriber >= MAP_PORTS && map.sharing >= MAP_SHARING,
      why: {
        en: `A ${state.psidBits}-bit PSID shares the address among 2^${state.psidBits} = ${map.sharing} subscribers, each with ${n(map.portsPerSubscriber)} ports in ${map.ranges.length} runs. One bit more would halve that to ${n(map.portsPerSubscriber / 2)}; one bit less would serve only ${map.sharing / 2}. The set is fixed by the prefix, so no subscriber can borrow more.`,
        ja: `PSID が ${state.psidBits} ビットなら、1 アドレスを 2^${state.psidBits} = ${map.sharing} 人で共有し、1 人 ${n(map.portsPerSubscriber)} ポート（${map.ranges.length} 個の範囲）です。1 ビット増やせば ${n(map.portsPerSubscriber / 2)} ポートに半減し、1 ビット減らせば ${map.sharing / 2} 人しか収容できません。セットはプレフィックスで決まるので、加入者がポートを追加で借りることはできません。`,
      },
    },
  ];
}
