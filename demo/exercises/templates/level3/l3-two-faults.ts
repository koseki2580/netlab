/**
 * l3-two-faults — find and repair two faults at once, among an unplugged
 * cable, a PC on the wrong network and a router side on the wrong network.
 * Repairing one is not enough, and changing what was fine is not a repair.
 * Find-the-fault rules apply: no message names the faulty device.
 */

import type { SettingChange, SettingRef } from '../../model/types';
import { buildLan, LAN_SHAPES, withLinkState } from '../shared/build';
import { defineTemplate, type LabelledCheck } from '../shared/exercise';
import { broken, everyoneReaches, setIp } from '../shared/lan';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, say, the } from '../shared/text';
import { WATCH_WORDS } from '../../ui/words';

type Fault = 'cable' | 'host' | 'router';

const PAIRS: readonly [readonly [Fault, Fault], readonly [Fault, Fault], readonly [Fault, Fault]] =
  [
    ['cable', 'host'],
    ['cable', 'router'],
    ['host', 'router'],
  ];

export const l3TwoFaults = defineTemplate(
  {
    id: 'l3-two-faults',
    level: 3,
    kind: 'diagnose-repair',
    title: L('Two faults at once', '故障が 2 つ'),
  },
  (draw) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(LAN_SHAPES);
    const lan = buildLan(place, plan, shape);
    const pair = draw.pick(PAIRS);
    // Two different PCs: one may lose its cable, the other its address.
    const [cablePc = 'pc1', hostPc = 'pc2'] = draw.pick([
      [lan.faultable[0], lan.faultable[1]],
      [lan.faultable[1], lan.faultable[0]],
    ] as const);
    const has = (fault: Fault) => pair.includes(fault);

    // --- The faults ---
    const cable = lan.cableOf[cablePc] ?? `e-${cablePc}`;
    const hostWas = `${lan.topology.nodes.find((node) => node.id === hostPc)?.data.ip ?? ''}`;
    const routerWas = plan.near.at(plan.gateway);
    const routerSide = (ipAddress: string): SettingChange => ({
      kind: 'iface-address',
      nodeId: 'r1',
      ifaceId: 'lan',
      ipAddress,
      prefixLength: 24,
    });
    let topology = lan.topology;
    if (has('cable')) topology = withLinkState(topology, cable, 'down');
    if (has('host')) topology = broken(topology, setIp(hostPc, plan.stranger.at(plan.pcs[1])));
    if (has('router')) topology = broken(topology, routerSide(plan.stranger.at(plan.gateway)));

    const fixes: SettingChange[] = [
      ...(has('cable') ? [{ kind: 'link-state', edgeId: cable, state: 'up' } as const] : []),
      ...(has('host') ? [setIp(hostPc, hostWas)] : []),
      ...(has('router') ? [routerSide(routerWas)] : []),
    ];
    const faultRefs: SettingRef[] = [
      ...(has('cable') ? [{ kind: 'link-state', edgeId: cable } as const] : []),
      ...(has('host') ? [{ kind: 'host-ip', nodeId: hostPc } as const] : []),
      ...(has('router')
        ? [{ kind: 'iface-address', nodeId: 'r1', ifaceId: 'lan', addressOnly: true } as const]
        : []),
    ];
    const onlyThere: LabelledCheck = {
      id: 'fixed-there',
      kind: 'changed-only',
      refs: faultRefs,
      label: L('Only what was wrong is changed', '変えたのは、おかしかったところだけ'),
    };

    const brief = say(
      scene(place, {
        home: L(
          'After a weekend of moving furniture and a new router setting, nothing works.',
          '家具の移動とルータの設定変更をした週末のあと、何もつながりません。',
        ),
        shop: L(
          'After the night of cleaning and maintenance, nothing reaches the server.',
          '夜のそうじと保守作業のあと、サーバーに何も届きません。',
        ),
        clinic: L(
          'After the weekend works, nothing reaches the server.',
          '週末の工事のあと、サーバーに何も届きません。',
        ),
        school: L(
          'After the holiday works, nothing reaches the server.',
          '休み中の工事のあと、サーバーに何も届きません。',
        ),
        office: L(
          'After the move to the new floor, nothing reaches the server.',
          '新しい階への引っ越しのあと、サーバーに何も届きません。',
        ),
      }),
      L(
        `No PC reaches ${the(place.server)}.`,
        `どのパソコンからも、${place.server.ja}に届きません。`,
      ),
      L(
        'Two things are wrong at once: two of an unplugged cable, a device on the wrong network, and a router side on the wrong network. Find both, and repair only those.',
        'おかしいところが 2 つあります。ぬけたケーブル、ネットワークのちがう機器、ネットワークのちがうルータの側、のうちの 2 つです。両方を見つけて、そこだけを直してください。',
      ),
    );
    return {
      title: L('Nothing works after the works', '工事のあと、何もつながらない'),
      task: L(
        'Find the two faults and repair both, and nothing else.',
        'おかしいところを 2 つ見つけて、その 2 つだけを直してください。',
      ),
      rule: L(
        'Rule: a cable that is out is a red dotted line; each address shares the first three numbers of its side and is nobody else’s.',
        'ルール：ぬけたケーブルは赤い点線。アドレスは、その側と、はじめの 3 つの数字が同じで、だれともかぶらない。',
      ),
      brief,
      topology,
      names: lan.names,
      allowed: [
        ...lan.cables.map((edgeId) => ({ kind: 'link-state', edgeId }) as const),
        ...lan.pcs.map((nodeId) => ({ kind: 'host-ip', nodeId }) as const),
        { kind: 'iface-address', nodeId: 'r1', ifaceId: 'lan', addressOnly: true },
      ],
      checks: [...everyoneReaches(lan, lan.names), onlyThere],
      hints: [
        L(
          `Look for a red dotted line first. Then put the addresses of each side next to each other, the router's included. Under the result, "${WATCH_WORDS.en}" shows where it stops.`,
          `まず赤い点線をさがしてください。そのあと、それぞれの側のアドレスを、ルータもふくめて並べて見くらべてください。結果の下の「${WATCH_WORDS.ja}」で、どこで止まるかも見られます。`,
        ),
        L(
          'Repairing one of the two is not enough: everything works only when both are right.',
          '2 つのうち 1 つを直しただけでは、まだ届きません。両方そろって、はじめて届きます。',
        ),
        L(
          `What was done: ${pair.map((fault) => (fault === 'cable' ? 'a cable pulled out' : fault === 'host' ? 'a PC given an address of another network' : "the router's side towards the PCs given an address of another network")).join(', and ')}.`,
          `起きたこと：${pair.map((fault) => (fault === 'cable' ? 'ケーブルが 1 本ぬけた' : fault === 'host' ? 'パソコン 1 台に、ほかのネットワークのアドレスが入った' : 'ルータのパソコン側に、ほかのネットワークのアドレスが入った')).join('、')}。`,
        ),
      ],
      lessons: ['/course', '/routing/client-server'],
      reference: fixes,
      wrongAnswers: fixes.map((fix) => [fix]),
      fingerprint: [place.id, shape, pair.join('+'), cablePc],
    };
  },
);
