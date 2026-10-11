/**
 * l2-static-nexthop — the route is there, but its next router is wrong: the
 * router's own address, a device that is not a neighbour, or a neighbour that
 * leads the other way. The learner corrects the next router.
 */

import { buildRouted, ROUTED_SHAPES, withNodeData } from '../shared/build';
import { defineTemplate } from '../shared/exercise';
import { drawPlace } from '../shared/places';
import { drawPlan } from '../shared/plans';
import {
  fullRoutes,
  ROUTE_GLOSS,
  ROUTE_RULE,
  routedGoals,
  routes,
  sitesOpening,
} from '../shared/routed';
import { WATCH_WORDS } from '../../ui/words';
import { L, say, the } from '../shared/text';

export const l2StaticNexthop = defineTemplate(
  {
    id: 'l2-static-nexthop',
    level: 2,
    kind: 'diagnose-repair',
    title: L('Fix the next router of a route', '経路の「次のルータ」を直す'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(ROUTED_SHAPES);
    const net = buildRouted(place, plan, shape);
    const faulty = shape === 'chain3' ? draw.pick(['r1', 'rm']) : 'r1';
    // "The other way" exists only where the router has a second neighbour.
    const away = net.awayFromSrv[faulty];
    const fault = draw.pick(
      away !== undefined ? ['own', 'not-a-neighbour', 'other-way'] : ['own', 'not-a-neighbour'],
    );

    // --- The fault: the route to the far network names the wrong next router ---
    const farDevice = plan.far.at(plan.servers[0]);
    const wrongHop =
      fault === 'own'
        ? (net.ownAddressOn[faulty] ?? '')
        : fault === 'other-way'
          ? (away ?? '')
          : farDevice;
    const healthy = fullRoutes(net, faulty);
    const withHop = (nextHop: string) =>
      healthy.map((route) =>
        route.destination === net.srvNet.cidr ? { ...route, nextHop } : route,
      );
    const topology = withNodeData(net.topology, faulty, { staticRoutes: withHop(wrongHop) });

    // --- The brief ---
    const name = (id: string) => net.names[id] ?? place.router;
    const { far } = place.sites;
    const brief = say(
      sitesOpening(place),
      L(
        `Someone has already typed in the routes, and still nothing arrives.`,
        `経路はだれかが入れてくれたのですが、それでも届きません。`,
      ),
      ROUTE_GLOSS,
      L(
        `One route to the network of ${the(far.device)} (${net.srvNet.cidr}) names the wrong next router. Find it and correct it.`,
        `${far.device.ja}のネットワーク（${net.srvNet.cidr}）への経路のうち 1 つは、「次のルータ」がまちがっています。見つけて直してください。`,
      ),
    );

    // --- What may be changed, the goals, the answers ---
    const rightHop = net.towardsSrv[faulty] ?? '';
    const nextRouter = name(net.path[net.path.indexOf(faulty) + 1] ?? 'r2');
    const why =
      fault === 'own'
        ? L(
            `it is an address of ${the(name(faulty))} itself`,
            `${name(faulty).ja}自身のアドレスです`,
          )
        : fault === 'other-way'
          ? L(
              `it is a neighbour, but one that leads away from ${the(far.name)}`,
              `となりのルータですが、${far.name.ja}とは別の方向にあります`,
            )
          : L(
              `it is the address of ${the(far.device)}, which is not cabled to this router`,
              `${far.device.ja}のアドレスで、このルータと直接はつながっていません`,
            );
    return {
      title: L('A route that points the wrong way', '行き先のおかしい経路'),
      task: L(
        `One route to the network of ${the(far.device)} (${net.srvNet.cidr}) names the wrong next router. Find it and correct it.`,
        `${far.device.ja}のネットワーク（${net.srvNet.cidr}）への経路のうち、「次のルータ」がまちがっている 1 行を直してください。`,
      ),
      rule: L(
        'Rule: the next router is a neighbour, cabled directly to this router, on the side towards the destination.',
        'ルール：「次のルータ」は、ケーブルでじかにつながった、行き先に近いほうのとなりのルータ。',
      ),
      brief,
      topology,
      names: net.names,
      allowed: net.path.map((nodeId) => ({ kind: 'static-routes', nodeId })),
      checks: routedGoals(net),
      hints: [
        L(
          `Under the result, press "${WATCH_WORDS.en}" and follow it: at which router does it stop or turn back?`,
          `結果の下にある「${WATCH_WORDS.ja}」を押して、通り道を見てください。どのルータで止まりますか。または、引き返しますか。`,
        ),
        {
          holdsWhile: {
            kind: 'route-via',
            nodeId: faulty,
            destination: net.srvNet.cidr,
            nextHop: wrongHop,
          },
          instead: L(
            `The route on ${the(name(faulty))} no longer names ${wrongHop}. If it still does not arrive, check what it names now: the next router must be the address of the neighbouring router towards the destination, on the side facing this one.`,
            `${name(faulty).ja}の経路の「次のルータ」は、もう「${wrongHop}」ではありません。それでも届かないなら、いまの「次のルータ」を図と見くらべてください。行き先に近いほうのとなりのルータの、こちらを向いた側のアドレスになっていますか。`,
          ),
          text: say(
            ROUTE_RULE,
            L(
              `It must be the neighbour towards the destination. On ${the(name(faulty))} the route is handed to ${wrongHop}: ${why.en}.`,
              `「次のルータ」は、行き先に近いほうのとなりのルータです。${name(faulty).ja}の経路は、次のルータが「${wrongHop}」になっていて、これは${why.ja}。`,
            ),
          ),
        },
        L(
          `On ${the(name(faulty))}, in the route for ${net.srvNet.cidr}, change the next router to ${rightHop}, the address of ${the(nextRouter)}.`,
          `${name(faulty).ja}の、行き先「${net.srvNet.cidr}」の経路の「次のルータ」を、${nextRouter.ja}のアドレス「${rightHop}」に変えます。`,
        ),
      ],
      lessons: ['/routing/multi-hop'],
      reference: [routes(faulty, healthy)],
      wrongAnswers: [
        // One wrong next router swapped for another.
        [routes(faulty, withHop(fault === 'own' ? farDevice : (net.ownAddressOn[faulty] ?? '')))],
        // Deleting the bad route instead of correcting it.
        [
          routes(
            faulty,
            healthy.filter((route) => route.destination !== net.srvNet.cidr),
          ),
        ],
      ],
      fingerprint: [place.id, shape, faulty, fault],
    };
  },
);
