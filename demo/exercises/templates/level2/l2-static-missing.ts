/**
 * l2-static-missing — a router on the way has no route to the far network, so
 * the request stops there. The learner finds the router and adds the route.
 */

import { buildRouted, ROUTED_SHAPES, withNodeData } from '../shared/build';
import { defineTemplate } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import {
  fullRoutes,
  ROUTE_GLOSS,
  ROUTE_RULE,
  routeIsThereNow,
  routedGoals,
  routes,
  WATCH_WHERE_IT_STOPS,
  RULE_ROUTE,
} from '../shared/routed';
import { L, say, the, The } from '../shared/text';

export const l2StaticMissing = defineTemplate(
  {
    id: 'l2-static-missing',
    level: 2,
    kind: 'configure',
    title: L('Add a missing route', '足りない経路を足す'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(ROUTED_SHAPES);
    const net = buildRouted(place, plan, shape);
    // A router that forwards towards the far device: the first, or (chain3) the middle one.
    const faulty = shape === 'chain3' ? draw.pick(['r1', 'rm']) : 'r1';

    // --- The fault: that router has no route to the far network ---
    const healthy = fullRoutes(net, faulty);
    const remaining = healthy.filter((route) => route.destination !== net.srvNet.cidr);
    const topology = withNodeData(net.topology, faulty, { staticRoutes: [...remaining] });

    // --- The brief ---
    const name = (id: string) => net.names[id] ?? place.router;
    const { near, far } = place.sites;
    const opening = scene(place, {
      home: L(
        `${The(far.device)} was moved out to ${the(far.name)}, behind a router of its own.`,
        `${far.device.ja}を${far.name.ja}に移して、専用のルータの先につなぎました。`,
      ),
      shop: L(
        `${The(far.name)} got a network of its own, with ${the(far.device)} on it.`,
        `${far.name.ja}に新しくネットワークを作り、${far.device.ja}を置きました。`,
      ),
      clinic: L(
        `${The(far.device)} now sits on a network of its own at ${the(far.name)}.`,
        `${far.device.ja}を、${far.name.ja}の専用のネットワークに置きました。`,
      ),
      school: L(
        `${The(far.device)} was put on a new network in ${the(far.name)}.`,
        `${far.device.ja}を、${far.name.ja}の新しいネットワークに置きました。`,
      ),
      office: L(
        `${The(far.device)} was moved to a new network at ${the(far.name)}.`,
        `${far.device.ja}を、${far.name.ja}の新しいネットワークに移しました。`,
      ),
    });
    const brief = say(
      opening,
      L(
        `${The(near.device)} cannot reach it: what it sends stops at a router on the way.`,
        `ところが、${near.device.ja}から届きません。送ったものは、途中のルータで止まります。`,
      ),
      ROUTE_GLOSS,
      L(
        `Find the router that has no route to the network of ${the(far.device)} (${net.srvNet.cidr}) and add one.`,
        `${far.device.ja}のネットワーク（${net.srvNet.cidr}）への経路を持っていないルータを見つけて、経路を足してください。`,
      ),
    );

    // --- What may be changed, the goals, the answers ---
    const nextHop = net.towardsSrv[faulty] ?? '';
    const nextRouter = name(net.path[net.path.indexOf(faulty) + 1] ?? 'r2');
    return {
      title: L(`No way to ${the(far.name)}`, `${far.name.ja}への道がない`),
      task: L(
        `Find the router that has no route to the network of ${the(far.device)} (${net.srvNet.cidr}), and add one.`,
        `${far.device.ja}のネットワーク（${net.srvNet.cidr}）への経路がないルータを見つけて、経路を足してください。`,
      ),
      rule: RULE_ROUTE,
      brief,
      topology,
      names: net.names,
      allowed: net.path.map((nodeId) => ({ kind: 'static-routes', nodeId })),
      checks: routedGoals(net),
      hints: [
        WATCH_WHERE_IT_STOPS,
        {
          text: say(
            ROUTE_RULE,
            L(
              `${The(name(faulty))} has no route for ${net.srvNet.cidr}.`,
              `${name(faulty).ja}には、${net.srvNet.cidr} あての経路がありません。`,
            ),
          ),
          holdsWhile: { kind: 'no-route', nodeId: faulty, destination: net.srvNet.cidr },
          instead: routeIsThereNow(L(the(name(faulty)), name(faulty).ja), net.srvNet.cidr),
        },
        L(
          `On ${the(name(faulty))}, add a route: destination ${net.srvNet.cidr}, handed to ${nextHop}, the address of ${the(nextRouter)}. Keep the lines that are already there.`,
          `${name(faulty).ja}に、行き先「${net.srvNet.cidr}」を、${nextRouter.ja}のアドレス「${nextHop}」に渡す経路を足します。すでにある行は残します。`,
        ),
      ],
      lessons: ['/routing/multi-hop', '/routing/client-server'],
      reference: [routes(faulty, healthy)],
      wrongAnswers: [
        // The router's own address as the next router.
        [
          routes(faulty, [
            ...remaining,
            { destination: net.srvNet.cidr, nextHop: net.ownAddressOn[faulty] ?? '' },
          ]),
        ],
        // The far device itself as the next router: it is not a neighbour.
        [
          routes(faulty, [
            ...remaining,
            { destination: net.srvNet.cidr, nextHop: plan.far.at(plan.servers[0]) },
          ]),
        ],
      ],
      fingerprint: [place.id, shape, faulty],
    };
  },
);
