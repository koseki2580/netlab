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
import { L, PRESS_CHECK, say, the } from '../shared/text';

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
      PRESS_CHECK,
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
      brief,
      topology,
      names: net.names,
      allowed: net.path.map((nodeId) => ({ kind: 'static-routes', nodeId })),
      checks: routedGoals(net),
      hints: [
        L(
          'Press Check, then watch it on the diagram: at which router does it stop or turn back?',
          '「たしかめる」を押してから、図で通り道を見てください。どのルータで止まりますか。または、引き返しますか。',
        ),
        say(
          ROUTE_RULE,
          L(
            `It must be the neighbour towards the destination. On ${the(name(faulty))} the route is handed to ${wrongHop}: ${why.en}.`,
            `渡す相手は、行き先に近いほうのとなりのルータです。${name(faulty).ja}の経路は「${wrongHop}」に渡していて、これは${why.ja}。`,
          ),
        ),
        L(
          `On ${the(name(faulty))}, in the route for ${net.srvNet.cidr}, change who it is handed to: ${rightHop}, the address of ${the(nextRouter)}.`,
          `${name(faulty).ja}の、行き先「${net.srvNet.cidr}」の経路の渡し先を、${nextRouter.ja}のアドレス「${rightHop}」に変えます。`,
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
