/**
 * p2-dns-step — a resolver looks up www.example.com. Two questions: which
 * server answers its n-th query, given what an earlier lookup left in its
 * cache; and the TTL left on an answer the cache gives.
 *
 * Truth (RFC 1034 §5.3.3, RFC 1035 §7.3): a resolver starts from the closest
 * delegation it has cached (the root when it has none) and follows referrals
 * down; an answer still within its TTL is given from the cache, with the
 * seconds kept taken off. The judge runs the engine's own resolver.
 *
 * Fair to a learner who does not read: the right server (root, com,
 * example.com, or none) is each the answer a quarter of the time, and the
 * TTL is drawn with three others from the same range, so no value or rank wins.
 */

import type { NetworkTopology } from '../../../../src/types/topology';
import { dnsLabTopology } from '../../../../src/services/dnsFixture';
import { evenPlace } from '../../../exercises/templates/shared/draw';
import { L } from '../../../exercises/templates/shared/text';
import type { Candidate, ReadQuestion } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { packetFrom, type PacketNet } from '../shared/nets';
import { device, question, type Captured } from '../shared/read';

const ANSWER_SALT = 79;
const NAME = 'www.example.com';
const TTL = 300;

type Server = 'root' | 'com' | 'example' | 'cache';
const ORDER: readonly Server[] = ['root', 'com', 'example', 'cache'];

/** What earlier lookup, then which query, makes each server the answer. */
const SCENARIOS: Readonly<Record<Server, readonly { earlier: string | null; step: number }[]>> = {
  root: [{ earlier: null, step: 1 }],
  com: [
    { earlier: null, step: 2 },
    { earlier: 'nothing.com', step: 1 },
  ],
  example: [
    { earlier: null, step: 3 },
    { earlier: 'nothing.com', step: 2 },
    { earlier: 'mail.example.com', step: 1 },
  ],
  cache: [{ earlier: NAME, step: 1 }],
};

function dnsNet(): PacketNet {
  const topology = dnsLabTopology();
  const names = Object.fromEntries(
    topology.nodes.map((node) => [
      node.id,
      node.id === 'resolver'
        ? L('Resolver', 'リゾルバ')
        : node.id === 'root'
          ? L('Root server', 'ルートサーバー')
          : node.id === 'com'
            ? L('com server', 'com サーバー')
            : node.id === 'example'
              ? L('example.com server', 'example.com サーバー')
              : L(node.data.label, node.data.label),
    ]),
  );
  const ip = Object.fromEntries(
    topology.nodes.flatMap((node) =>
      typeof node.data.ip === 'string' ? [[node.id, node.data.ip] as const] : [],
    ),
  );
  const mac = Object.fromEntries(
    topology.nodes.flatMap((node) =>
      typeof node.data.mac === 'string' ? [[node.id, node.data.mac] as const] : [],
    ),
  );
  const { routeTables: _tables, ...snapshot } = topology as NetworkTopology;
  return { topology: snapshot, names, ip, mac, routers: [], edgeAfter: {}, inSide: {} };
}

const when = (earlier: string | null, seconds: number) =>
  earlier === null
    ? L('The resolver’s cache is empty.', 'リゾルバのキャッシュは空です。')
    : L(
        `${seconds} seconds ago the resolver looked up ${earlier}, and still holds everything it learned then.`,
        `${seconds} 秒前に、リゾルバは ${earlier} を引き、そのとき知ったことをまだ覚えています。`,
      );

export const p2DnsStep = definePacketTemplate(
  {
    id: 'p2-dns-step',
    level: 2,
    kind: 'read-packet',
    title: L('Who does the resolver ask?', 'リゾルバはだれに聞く？'),
  },
  (draw, seed) => {
    const net = dnsNet();
    const answer = ORDER[evenPlace(seed, ORDER.length, ANSWER_SALT)] ?? 'root';
    const options = SCENARIOS[answer];
    const scenario = options[draw.int(options.length)] ?? { earlier: null, step: 1 };
    const seconds = 20 + 20 * draw.int(13);
    const nth = ['first', 'second', 'third'][scenario.step - 1] ?? 'first';
    const nthJa = ['1 回目', '2 回目', '3 回目'][scenario.step - 1] ?? '1 回目';

    const index = ORDER.indexOf(answer);
    const whyOf = (candidate: Server) =>
      candidate === answer
        ? 'right'
        : answer === 'cache'
          ? 'dns-cached-answer'
          : candidate === 'cache'
            ? 'dns-not-cached'
            : ORDER.indexOf(candidate) < index
              ? 'dns-cached-already'
              : 'dns-not-yet';
    const asked: ReadQuestion = {
      ...question(
        draw,
        'a',
        'dns-asked',
        answer,
        ORDER.map((candidate) =>
          candidate === 'cache'
            ? {
                value: 'cache',
                label: L('Nobody: the cache answers', 'だれにも聞かない（キャッシュが答える）'),
                why: whyOf(candidate),
              }
            : device(net.names, candidate, whyOf(candidate)),
        ),
      ),
      prompt: L(
        `${when(scenario.earlier, seconds).en} PC now asks for ${NAME}. Which server answers the resolver's ${nth} query?`,
        `${when(scenario.earlier, seconds).ja}いま PC が ${NAME} を問い合わせます。リゾルバの${nthJa}の問い合わせに答えるのは、どのサーバーですか。`,
      ),
      dns: { name: NAME, earlier: scenario.earlier, seconds, step: scenario.step },
    };

    // The TTL left, one of eight between 80 and 220; the three others offered are
    // drawn from the same eight, so no value and no rank is right more often.
    const kept = 80 + 20 * draw.int(8);
    const left = TTL - kept;
    const pool = Array.from({ length: 8 }, (_, i) => 80 + 20 * i).filter((value) => value !== left);
    const others: number[] = [];
    while (others.length < 3) {
      const [picked] = pool.splice(draw.int(pool.length), 1);
      if (picked !== undefined) others.push(picked);
    }
    const ttls: Candidate[] = [left, ...others].map((value) => ({
      value: String(value),
      why: value === left ? 'right' : 'dns-ttl-wrong',
    }));
    const ttl: ReadQuestion = {
      ...question(draw, 'b', 'dns-ttl-left', String(left), ttls),
      prompt: L(
        `${kept} seconds ago PC-B looked up ${NAME}; its address came with TTL ${TTL}. PC now asks for it. What TTL does the address record in the resolver's answer carry?`,
        `${kept} 秒前に PC-B が ${NAME} を引き、アドレスは TTL ${TTL} で返りました。いま PC が問い合わせます。リゾルバの答えに入るアドレスのレコードの TTL はいくつですか。`,
      ),
      dns: { name: NAME, earlier: NAME, seconds: kept, step: 1 },
    };

    const query = packetFrom(net, 'client', {
      dstIp: net.ip['resolver'] ?? '',
      carries: 'udp',
      dstPort: 53,
      ttl: 64,
    }) as Captured;
    return {
      kind: 'read-packet',
      title: L(`Looking up ${NAME}`, `${NAME} を引く`),
      task: L(
        'Read what the resolver already knows, and choose who it asks and what it answers.',
        'リゾルバがすでに知っていることを読んで、だれに聞き、何と答えるかを選んでください。',
      ),
      rule: L(
        'Rule: a resolver starts from the closest delegation it has cached (else the root) and follows referrals down; a cached answer is given at once, its TTL less the seconds kept.',
        'ルール：リゾルバは、覚えている最も近い委任（なければルート）から始めて委任をたどる。キャッシュにある答えはすぐ返し、TTL は覚えていた秒数を引いた値になる。',
      ),
      brief: L(
        'PC sends its question to the resolver. The resolver finds the answer for it: the root server knows who runs com, the com server knows who runs example.com, and the example.com server knows the name. Each answer is kept for its TTL: the referral to com for two days, the one to example.com for an hour here, the address of www.example.com for 300 seconds.',
        'PC は質問をリゾルバに送ります。リゾルバが代わりに答えを探します。ルートサーバーは com の担当を、com サーバーは example.com の担当を知っていて、example.com サーバーが名前の答えを知っています。答えはそれぞれ TTL のあいだ覚えておかれます。com への委任は 2 日、example.com への委任はここでは 1 時間、www.example.com のアドレスは 300 秒です。',
      ),
      topology: net.topology,
      names: net.names,
      packets: [query],
      outcome: { deliveredTo: 'resolver', dropAt: null, reason: null },
      questions: [asked, ttl],
      hints: [
        L(
          'First, what does the resolver still hold from the earlier lookup? A referral it learned lets it skip the servers above.',
          'まず、前の問い合わせで覚えたことのうち、何がまだ残っていますか。覚えている委任があれば、その上のサーバーは飛ばせます。',
        ),
        L(
          'With nothing cached it asks the root, then com, then example.com, one query each.',
          '何も覚えていなければ、ルート、com、example.com の順に 1 回ずつ聞きます。',
        ),
        L(
          `A cached answer is still good while it is younger than its TTL, and it is passed on with the seconds kept taken off: ${TTL} minus the age.`,
          `覚えている答えは、TTL より新しいあいだ有効です。渡すときは、覚えていた秒数を引きます。${TTL} から経った秒数を引いた値です。`,
        ),
      ],
      lessons: ['/services/dns-resolution'],
      fingerprint: [answer, scenario.earlier ?? '-', scenario.step, kept],
    };
  },
);
