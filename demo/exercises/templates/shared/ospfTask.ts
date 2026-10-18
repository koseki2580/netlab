/**
 * The two OSPF cost templates: traffic must take one named way of the diamond
 * (and, in `both-ways`, the answer too). Every cost is drawn so that no two
 * ways ever tie, and a tie is never an answer: on equal totals which way is
 * taken is the engine's business, not a rule a learner can apply.
 */

import type { SettingChange } from '../../model/types';
import { evenPlace } from './draw';
import {
  buildDiamond,
  cost,
  costRef,
  COST_GLOSS,
  withCosts,
  withOspf,
  WHY_OUTBOUND,
  type DiamondNet,
  type Way,
} from './diamond';
import { goals, type Draft, type LabelledCheck } from './exercise';
import type { Draw } from './draw';
import { drawPlace, scene } from './places';
import { drawPlan } from './plans';
import { L, say, the } from './text';

const WAY_SALT = 31;

interface Costs {
  /** r1 out to r2 and to r3, r2 and r3 out to r4, r4 out to r2 and r3, r2 and r3 out to r1. */
  readonly r1top: number;
  readonly r1bottom: number;
  readonly r2out: number;
  readonly r3out: number;
  readonly r4top: number;
  readonly r4bottom: number;
  readonly r2back: number;
  readonly r3back: number;
}

function costList(net: DiamondNet, c: Costs) {
  const { links, near } = net;
  void near;
  return [
    { nodeId: 'r1', network: links.r12.cidr, cost: c.r1top },
    { nodeId: 'r1', network: links.r13.cidr, cost: c.r1bottom },
    { nodeId: 'r2', network: links.r24.cidr, cost: c.r2out },
    { nodeId: 'r3', network: links.r34.cidr, cost: c.r3out },
    { nodeId: 'r4', network: links.r24.cidr, cost: c.r4top },
    { nodeId: 'r4', network: links.r34.cidr, cost: c.r4bottom },
    { nodeId: 'r2', network: links.r12.cidr, cost: c.r2back },
    { nodeId: 'r3', network: links.r13.cidr, cost: c.r3back },
  ];
}

export function ospfDraft(draw: Draw, seed: number, bothWays: boolean): Draft {
  const place = drawPlace(draw);
  const plan = drawPlan(draw);
  const net = buildDiamond(place, plan, evenPlace(seed, 2, WAY_SALT + 7) === 0);
  const wanted: Way = evenPlace(seed, 2, WAY_SALT + (bothWays ? 1 : 0)) === 0 ? 'top' : 'bottom';
  const other: Way = wanted === 'top' ? 'bottom' : 'top';
  // The wanted way starts dearer on its first link; its second link costs 2, the other's 1.
  const high = draw.pick([5, 10, 20] as const);
  const c: Costs = {
    r1top: wanted === 'top' ? high : 1,
    r1bottom: wanted === 'bottom' ? high : 1,
    r2out: wanted === 'top' ? 2 : 1,
    r3out: wanted === 'bottom' ? 2 : 1,
    r4top: wanted === 'top' ? high : 1,
    r4bottom: wanted === 'bottom' ? high : 1,
    r2back: wanted === 'top' ? 2 : 1,
    r3back: wanted === 'bottom' ? 2 : 1,
  };
  const topology = withCosts(withOspf(net), costList(net, c));
  const name = (id: string) => net.names[id] ?? place.router;
  const via = net.via[wanted];
  const avoid = net.via[other];
  const { links } = net;
  const r1Net = (way: Way) => (way === 'top' ? links.r12.cidr : links.r13.cidr);
  const r4Net = (way: Way) => (way === 'top' ? links.r24.cidr : links.r34.cidr);

  // The answer: the other way made dearer than the wanted one, by a margin.
  const wantedTotal = high + 2;
  const raised = wantedTotal + 10;
  const reference: SettingChange[] = [
    cost('r1', r1Net(other), raised),
    ...(bothWays ? [cost('r4', r4Net(other), raised)] : []),
  ];

  const { reach } = goals(net.names);
  const pathCheck = (from: string, to: string): LabelledCheck => ({
    id: `via-${from}-${to}`,
    kind: 'path-via',
    probe: { via: 'ping', from, to },
    nodeId: via,
    label: L(
      `What ${the(name(from))} sends to the ${name(to).en} goes through the ${name(via).en}`,
      `${name(from).ja}から${name(to).ja}へ送るものが、${name(via).ja}を通る`,
    ),
  });
  const costsLine = L(
    `The costs now, on the way out of each router: ${name('r1').en} to ${the(name('r2'))} ${c.r1top}, to ${the(name('r3'))} ${c.r1bottom}; ${name('r2').en} onward ${c.r2out}; ${name('r3').en} onward ${c.r3out}` +
      (bothWays
        ? `; on the way back, ${name('r4').en} to ${the(name('r2'))} ${c.r4top}, to ${the(name('r3'))} ${c.r4bottom}; ${name('r2').en} onward ${c.r2back}; ${name('r3').en} onward ${c.r3back}.`
        : '.'),
    `いまのコスト（各ルータから出ていく側）：${name('r1').ja}から${name('r2').ja}へ ${c.r1top}、${name('r3').ja}へ ${c.r1bottom}。${name('r2').ja}から先へ ${c.r2out}。${name('r3').ja}から先へ ${c.r3out}。` +
      (bothWays
        ? `帰り道は、${name('r4').ja}から${name('r2').ja}へ ${c.r4top}、${name('r3').ja}へ ${c.r4bottom}。${name('r2').ja}から先へ ${c.r2back}。${name('r3').ja}から先へ ${c.r3back}。`
        : ''),
  );
  const opening = scene(place, {
    home: L(
      `The line through ${the(name(avoid))} is the slow one; ${the(name(via))} has the fast one.`,
      `${name(avoid).ja}を通る回線はおそく、${name(via).ja}を通る回線が速い回線です。`,
    ),
    shop: L(
      `The line through ${the(name(avoid))} is shared with the warehouse and often full; the one through ${the(name(via))} is for the till traffic.`,
      `${name(avoid).ja}を通る回線は倉庫と共用で、よく混みます。${name(via).ja}を通る回線を使いたいところです。`,
    ),
    clinic: L(
      `The records should travel over the private line through ${the(name(via))}, not through ${the(name(avoid))}.`,
      `カルテは、${name(avoid).ja}ではなく、${name(via).ja}を通る専用の回線で運びたいところです。`,
    ),
    school: L(
      `The line through ${the(name(avoid))} is the old one; the new fast line goes through ${the(name(via))}.`,
      `${name(avoid).ja}を通る回線は古く、新しい速い回線は${name(via).ja}を通ります。`,
    ),
    office: L(
      `The contract says the data line is the one through ${the(name(via))}; the one through ${the(name(avoid))} is the backup.`,
      `契約では、データ用の回線は${name(via).ja}を通るほうで、${name(avoid).ja}を通るほうは予備です。`,
    ),
  });
  const brief = say(
    opening,
    COST_GLOSS,
    costsLine,
    bothWays
      ? L(
          `Make both what ${the(name('pc'))} sends and the answers of ${the(name('srv'))} go through ${the(name(via))}.`,
          `${name('pc').ja}が送るものも、${name('srv').ja}の返事も、${name(via).ja}を通るようにしてください。`,
        )
      : L(
          `Make what ${the(name('pc'))} sends to ${the(name('srv'))} go through ${the(name(via))}.`,
          `${name('pc').ja}から${name('srv').ja}へ送るものが、${name(via).ja}を通るようにしてください。`,
        ),
    WHY_OUTBOUND,
  );

  const sumWanted = `${high} + 2 = ${wantedTotal}`;
  return {
    title: bothWays
      ? L(`Both ways through ${the(name(via))}`, `行きも帰りも${name(via).ja}を通す`)
      : L(`Send it through ${the(name(via))}`, `${name(via).ja}を通す`),
    task: bothWays
      ? L(
          `Change costs so that traffic goes through ${the(name(via))} both ways.`,
          `コストを変えて、行きも帰りも${name(via).ja}を通るようにしてください。`,
        )
      : L(
          `Change a cost so that traffic goes through ${the(name(via))}.`,
          `コストを変えて、${name(via).ja}を通るようにしてください。`,
        ),
    rule: L(
      'Rule: the way with the lowest total of costs going OUT is taken. A cost counts only on the way out of its router.',
      'ルール：出ていく側のコストの合計が、いちばん小さい道が選ばれる。コストは、設定したルータから出る通信にだけ効く。',
    ),
    brief,
    topology,
    names: net.names,
    allowed: [
      costRef('r1', links.r12.cidr),
      costRef('r1', links.r13.cidr),
      costRef('r4', links.r24.cidr),
      costRef('r4', links.r34.cidr),
    ],
    checks: [
      reach('pc', 'srv'),
      pathCheck('pc', 'srv'),
      ...(bothWays ? [pathCheck('srv', 'pc')] : []),
    ],
    hints: [
      L(
        `Add up the costs of each way from ${the(name('r1'))}, as the story lists them. Which total is lower now?`,
        `${name('r1').ja}から先の道ごとに、話にあるコストを足してください。いまは、どちらの合計が小さいですか。`,
      ),
      L(
        `The way through ${the(name(via))} totals ${sumWanted}. Lowering its first cost to 1 still leaves 3, more than the other way's 2: make the other way dearer instead.` +
          (bothWays ? ` The answers are decided by ${the(name('r4'))}'s costs.` : ''),
        `${name(via).ja}を通る道の合計は ${sumWanted} です。最初のコストを 1 にしても 3 で、もう一方の 2 より大きいままです。もう一方の道を高くします。` +
          (bothWays ? `返事の道は、${name('r4').ja}のコストで決まります。` : ''),
      ),
      L(
        `Set the cost from ${the(name('r1'))} towards ${the(name(avoid))} to ${raised}` +
          (bothWays
            ? `, and the cost from ${the(name('r4'))} towards ${the(name(avoid))} to ${raised}.`
            : '.'),
        `${name('r1').ja}から${name(avoid).ja}へのコストを ${raised} にします。` +
          (bothWays
            ? `${name('r4').ja}から${name(avoid).ja}へのコストも ${raised} にします。`
            : ''),
      ),
    ],
    lessons: ['/routing/dynamic', '/routing/ospf-convergence'],
    reference,
    wrongAnswers: [
      // The wanted way made as cheap as can be: 3 is still more than 2.
      [cost('r1', r1Net(wanted), 1)],
      // The other way raised to just under the wanted total.
      [cost('r1', r1Net(other), high)],
      // The cost set on the far router: it steers only what leaves that router.
      [cost('r4', r4Net(other), raised)],
      ...(bothWays ? [[cost('r1', r1Net(other), raised)]] : []),
    ],
    fingerprint: [place.id, wanted, `cost${high}`],
  };
}
