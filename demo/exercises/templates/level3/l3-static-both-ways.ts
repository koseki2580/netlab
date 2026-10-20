/**
 * l3-static-both-ways — three routers in a row, and two routes missing: one on
 * the way there and one on the way back. Nothing arrives, and fixing only the
 * way there is not enough: the answer needs its own way back.
 */

import { buildRouted, withNodeData } from '../shared/build';
import { defineTemplate } from '../shared/exercise';
import { drawPlace } from '../shared/places';
import { drawPlan } from '../shared/plans';
import {
  farSideOf,
  fullRoutes,
  ROUTE_GLOSS,
  routedGoals,
  routes,
  sitesOpening,
} from '../shared/routed';
import { L, say, the, The } from '../shared/text';
import { WHY_FACING } from '../shared/why';
import { WATCH_WORDS } from '../../ui/words';

const FAULTS = [
  { there: 'r1', back: 'r2' },
  { there: 'rm', back: 'r2' },
  { there: 'r1', back: 'rm' },
] as const;

export const l3StaticBothWays = defineTemplate(
  {
    id: 'l3-static-both-ways',
    level: 3,
    kind: 'diagnose-repair',
    title: L('Two routes missing, there and back', '行きと帰り、2 つの経路が足りない'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const net = buildRouted(place, plan, 'chain3');
    const fault = draw.pick(FAULTS);

    // --- The faults: one router lacks the way there, another the way back ---
    const without = (nodeId: string, destination: string) =>
      fullRoutes(net, nodeId).filter((route) => route.destination !== destination);
    const thereLeft = without(fault.there, net.srvNet.cidr);
    const backLeft = without(fault.back, net.pcNet.cidr);
    const topology = withNodeData(
      withNodeData(net.topology, fault.there, { staticRoutes: [...thereLeft] }),
      fault.back,
      { staticRoutes: [...backLeft] },
    );

    // --- The brief ---
    const name = (id: string) => net.names[id] ?? place.router;
    const { near, far } = place.sites;
    const brief = say(
      sitesOpening(place),
      L(
        `A new router was put in the middle, and its routes and those of its neighbours were typed in again. Now nothing gets through.`,
        `あいだに新しいルータを入れて、そのルータととなりのルータの経路を入れ直しました。それから、何も届きません。`,
      ),
      ROUTE_GLOSS,
      L(
        `Two routes are missing: one on the way to ${the(far.device)}'s network (${net.srvNet.cidr}), and one on the way back to ${the(near.device)}'s (${net.pcNet.cidr}). An answer needs its own way back.`,
        `足りない経路が 2 つあります。${far.device.ja}のネットワーク（${net.srvNet.cidr}）へ行く道に 1 つ、${near.device.ja}のネットワーク（${net.pcNet.cidr}）へ帰る道に 1 つです。返事にも、帰り道がいります。`,
      ),
      WHY_FACING,
    );

    // --- What may be changed, the goals, the answers ---
    const healthyThere = fullRoutes(net, fault.there);
    const healthyBack = fullRoutes(net, fault.back);
    const reference = [routes(fault.there, healthyThere), routes(fault.back, healthyBack)];
    return {
      title: L('Nothing gets through the three routers', '3 台のルータの先へ届かない'),
      task: L(
        'Find the two missing routes, one there and one back, and add them.',
        '行きと帰りで足りない経路を 1 つずつ見つけて、足してください。',
      ),
      rule: L(
        'Rule: every router on the way there needs a route to the far network, and every router on the way back one to the sender’s network.',
        'ルール：行きの道のルータには行き先への経路、帰りの道のルータには送り主への経路が、1 台ずつにいる。',
      ),
      brief,
      topology,
      names: net.names,
      allowed: net.path.map((nodeId) => ({ kind: 'static-routes', nodeId }) as const),
      checks: routedGoals(net),
      hints: [
        L(
          `Under the result, press "${WATCH_WORDS.en}" and see at which router it stops. Then read the routes of each router, for both networks.`,
          `結果の下にある「${WATCH_WORDS.ja}」を押して、どのルータで止まるかを見てください。そのあと、ルータごとに、両方のネットワークへの経路を読んでください。`,
        ),
        L(
          `${The(name(fault.there))} has no route for ${net.srvNet.cidr}, and ${the(name(fault.back))} none for ${net.pcNet.cidr}.`,
          `${name(fault.there).ja}には ${net.srvNet.cidr} あての経路が、${name(fault.back).ja}には ${net.pcNet.cidr} あての経路がありません。`,
        ),
        L(
          `On ${the(name(fault.there))}: ${net.srvNet.cidr} to ${net.towardsSrv[fault.there] ?? ''}. On ${the(name(fault.back))}: ${net.pcNet.cidr} to ${net.towardsPc[fault.back] ?? ''}.`,
          `${name(fault.there).ja}に「${net.srvNet.cidr} は ${net.towardsSrv[fault.there] ?? ''} へ」、${name(fault.back).ja}に「${net.pcNet.cidr} は ${net.towardsPc[fault.back] ?? ''} へ」を足します。`,
        ),
      ],
      lessons: ['/routing/multi-hop'],
      reference,
      wrongAnswers: [
        // Only the way there.
        [routes(fault.there, healthyThere)],
        // Only the way back.
        [routes(fault.back, healthyBack)],
        // Both, the way back naming the router's own address.
        [
          routes(fault.there, healthyThere),
          routes(fault.back, [
            ...backLeft,
            { destination: net.pcNet.cidr, nextHop: net.ownAddressOn[fault.back] ?? '' },
          ]),
        ],
        // The neighbour's address on its far side: no router takes it as a next router.
        [
          routes(fault.there, healthyThere),
          routes(fault.back, [
            ...backLeft,
            {
              destination: net.pcNet.cidr,
              nextHop: farSideOf(net.topology, fault.back, net.towardsPc[fault.back] ?? '') ?? '',
            },
          ]),
        ],
      ],
      fingerprint: [place.id, `${fault.there}-${fault.back}`],
    };
  },
);
