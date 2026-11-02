/**
 * l3-ospf-dr — three routers on one LAN, and the wrong one is the DR. The
 * learner sets OSPF priorities so that the wanted router is elected.
 *
 * Truth (RFC 2328 §9.4): the highest priority wins, then the highest router id;
 * priority 0 never stands. The exercise's answer is judged with the routers
 * starting together: on a live network a router that holds the role keeps it,
 * and the brief says so. The wanted router always has the lowest router id, so
 * a tie never gives it the role: its priority must be the highest outright.
 *
 * A learner fresh from spanning tree reaches for the lowest number, which here
 * takes the router out of the election.
 */

import type { SettingChange } from '../../model/types';
import { iface, link, router, snapshot, switchNode } from '../shared/build';
import { evenPlace } from '../shared/draw';
import { defineTemplate } from '../shared/exercise';
import { drawPlace } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, the, The, type Named } from '../shared/text';

const FAULT_SALT = 67;
const WANTED_SALT = 71;

type Fault = 'rival-high' | 'wanted-zero' | 'tie';
const FAULTS: readonly Fault[] = ['rival-high', 'wanted-zero', 'tie'];

/** Priorities at the start, and the one that makes the wanted router win. */
const START: Readonly<
  Record<Fault, { wanted: number; rival: number; other: number; fix: number }>
> = {
  'rival-high': { wanted: 1, rival: 100, other: 50, fix: 200 },
  'wanted-zero': { wanted: 0, rival: 10, other: 1, fix: 100 },
  tie: { wanted: 10, rival: 10, other: 10, fix: 50 },
};

const IDS = ['ra', 'rb', 'rc'] as const;

export const l3OspfDr = defineTemplate(
  {
    id: 'l3-ospf-dr',
    level: 3,
    kind: 'configure',
    title: L('Choose the DR with OSPF priorities', 'OSPF のプライオリティで DR を選ぶ'),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const fault = FAULTS[evenPlace(seed, FAULTS.length, FAULT_SALT)] ?? 'tie';
    const wantedIndex = evenPlace(seed, IDS.length, WANTED_SALT);
    const wanted = IDS[wantedIndex] ?? 'ra';
    const rival = IDS[(wantedIndex + 1) % IDS.length] ?? 'rb';
    const other = IDS[(wantedIndex + 2) % IDS.length] ?? 'rc';
    const start = START[fault];
    const base = plan.near.cidr.split('.').slice(0, 3).join('.');
    const network = `${base}.0/24`;
    const { sites } = place;

    const names: Record<string, Named> = {
      [wanted]: sites.near.router,
      [rival]: sites.mid.router,
      [other]: sites.far.router,
      sw: place.switches[0],
    };
    const member = (id: string, host: number, routerId: string, priority: number) =>
      router(id, [iface('lan', `${base}.${host}/24`, { ospfPriority: priority })], {
        ospfConfig: { routerId, areas: [{ areaId: '0.0.0.0', networks: [network] }] },
      });
    const topology = snapshot(
      [
        ...IDS.map((id, index) => {
          const [host, routerId, value] =
            id === wanted
              ? ([1, '1.1.1.1', start.wanted] as const)
              : id === other
                ? ([2, '2.2.2.2', start.other] as const)
                : ([3, '3.3.3.3', start.rival] as const);
          return {
            ...member(id, host, routerId, value),
            position: { x: index * 200, y: index === 1 ? 240 : 0 },
          };
        }),
        switchNode(
          'sw',
          ['p1', 'p2', 'p3'].map((id) => ({ id, name: id, macAddress: '' })),
          {},
          { x: 200, y: 120 },
        ),
      ],
      [
        link('e-1', `${wanted}:lan`, 'sw:p1'),
        link('e-2', `${rival}:lan`, 'sw:p2'),
        link('e-3', `${other}:lan`, 'sw:p3'),
      ],
    );

    const priority = (nodeId: string, value: number): SettingChange => ({
      kind: 'ospf-priority',
      nodeId,
      ifaceId: 'lan',
      priority: value,
    });
    const main = names[wanted] ?? sites.near.router;
    const reference = [priority(wanted, start.fix)];
    const wrongAnswers: (readonly SettingChange[])[] = [
      // Spanning tree's habit: the lowest number wins.
      ...(start.wanted === 0 ? [] : [[priority(wanted, 0)]]),
      // Level with the rival: the router id decides, and the wanted one's is the lowest.
      ...(start.wanted === start.rival ? [] : [[priority(wanted, start.rival)]]),
      // Taking the rival out leaves the third router ahead.
      [priority(rival, 0)],
    ];

    return {
      title: L(`${The(main)} should be the DR`, `${main.ja}を DR にする`),
      task: L(
        `Set the OSPF priorities so that ${the(main)} is elected DR on the LAN.`,
        `OSPF のプライオリティを変えて、${main.ja}が LAN の DR に選ばれるようにしてください。`,
      ),
      rule: L(
        'Rule: the highest priority becomes DR; equal priorities go to the highest router id; priority 0 never stands.',
        'ルール：プライオリティがいちばん大きいルータが DR になる。同じならルータ ID がいちばん大きいルータ。0 は立候補しない。',
      ),
      brief: L(
        `Three routers share one LAN. On a LAN they elect a DR, which every other router exchanges its map with. ${The(main)} has the most memory, so it should be the DR; right now it is not. Router ids: ${the(main)} 1.1.1.1, ${the(names[other] ?? main)} 2.2.2.2, ${the(names[rival] ?? main)} 3.3.3.3. On a running network a router that holds the role keeps it until it stops; here, assume the routers restart together after your change.`,
        `3 台のルータが 1 つの LAN を共有しています。LAN では DR を 1 台選び、ほかのルータは DR と地図を交換します。${main.ja}はメモリがいちばん多いので DR にしたいのですが、いまはちがいます。ルータ ID は、${main.ja}が 1.1.1.1、${names[other]?.ja ?? ''}が 2.2.2.2、${names[rival]?.ja ?? ''}が 3.3.3.3 です。動いているネットワークでは、役についたルータは止まるまで譲りません。ここでは、変更のあと全台が同時に再起動するものとします。`,
      ),
      topology,
      names,
      allowed: IDS.map((nodeId) => ({ kind: 'ospf-priority', nodeId, ifaceId: 'lan' })),
      checks: [
        {
          id: 'dr',
          kind: 'ospf-dr',
          nodeId: wanted,
          network,
          label: L(`${The(main)} is the DR`, `${main.ja}が DR になる`),
        },
      ],
      hints: [
        L(
          'Compare the priorities of the three routers. Which is highest now, and is it the router the story wants?',
          '3 台のプライオリティを見くらべてください。いま最も大きいのはどれで、それは求められているルータでしょうか。',
        ),
        L(
          'Here the HIGHEST number wins, unlike a spanning-tree priority, and 0 never stands. A tie goes to the highest router id.',
          'スパニングツリーの優先度とちがい、ここでは「大きい」数字が勝ちます。0 は立候補しません。同じならルータ ID の大きいルータが勝ちます。',
        ),
        L(
          `${The(main)} has the lowest router id, so its priority must be higher than both others.`,
          `${main.ja}のルータ ID はいちばん小さいので、プライオリティを 2 台のどちらよりも大きくします。`,
        ),
      ],
      lessons: ['/routing/ospf-areas'],
      reference,
      wrongAnswers,
      fingerprint: [place.id, fault, wanted],
    };
  },
);
