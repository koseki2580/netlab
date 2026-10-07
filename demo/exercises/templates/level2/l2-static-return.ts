/**
 * l2-static-return — the request arrives, the answer does not come back: a
 * router on the far side has no route to the sender's network. The learner
 * reads the symptom (which leg fails) and adds the return route.
 */

import { buildRouted, ROUTED_SHAPES, withNodeData } from '../shared/build';
import { defineTemplate } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { fullRoutes, ROUTE_GLOSS, routedGoals, routes, sitesOpening } from '../shared/routed';
import { L, PRESS_CHECK, say, the, The } from '../shared/text';

export const l2StaticReturn = defineTemplate(
  {
    id: 'l2-static-return',
    level: 2,
    kind: 'diagnose-repair',
    title: L('Fix the way back', '帰り道を直す'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(ROUTED_SHAPES);
    const net = buildRouted(place, plan, shape);
    // A router that carries the answer back: the last, or (chain3) the middle one.
    const faulty = shape === 'chain3' ? draw.pick(['r2', 'rm']) : 'r2';

    // --- The fault: that router has no route to the sender's network ---
    const healthy = fullRoutes(net, faulty);
    const remaining = healthy.filter((route) => route.destination !== net.pcNet.cidr);
    const topology = withNodeData(net.topology, faulty, { staticRoutes: [...remaining] });

    // --- The brief ---
    const name = (id: string) => net.names[id] ?? place.router;
    const { near, far } = place.sites;
    const symptom = scene(place, {
      home: L(
        `The photos never open. Yet ${the(far.device)} does receive what ${the(near.device)} sends.`,
        `写真がいつまでも開きません。でも、${near.device.ja}が送ったものは、${far.device.ja}に届いています。`,
      ),
      shop: L(
        `The stock list never appears. Yet ${the(far.device)} does receive what ${the(near.device)} sends.`,
        `在庫の一覧がいつまでも出てきません。でも、${near.device.ja}が送ったものは、${far.device.ja}に届いています。`,
      ),
      clinic: L(
        `The records never open. Yet ${the(far.device)} does receive what ${the(near.device)} sends.`,
        `カルテがいつまでも開きません。でも、${near.device.ja}が送ったものは、${far.device.ja}に届いています。`,
      ),
      school: L(
        `The files never open. Yet ${the(far.device)} does receive what ${the(near.device)} sends.`,
        `教材がいつまでも開きません。でも、${near.device.ja}が送ったものは、${far.device.ja}に届いています。`,
      ),
      office: L(
        `The folders never open. Yet ${the(far.device)} does receive what ${the(near.device)} sends.`,
        `フォルダがいつまでも開きません。でも、${near.device.ja}が送ったものは、${far.device.ja}に届いています。`,
      ),
    });
    const brief = say(
      sitesOpening(place),
      symptom,
      L(
        'It is the answer that gets lost on the way back.',
        '返事のほうが、帰り道でなくなっています。',
      ),
      ROUTE_GLOSS,
      L(
        `Find the router that does not know the way back to the network of ${the(near.device)} (${net.pcNet.cidr}) and add the route.`,
        `${near.device.ja}のネットワーク（${net.pcNet.cidr}）への帰り道を知らないルータを見つけて、経路を足してください。`,
      ),
      PRESS_CHECK,
    );

    // --- What may be changed, the goals, the answers ---
    const nextHop = net.towardsPc[faulty] ?? '';
    return {
      title: L('It arrives, but no answer comes back', '届くのに、返事が戻らない'),
      brief,
      topology,
      names: net.names,
      allowed: net.path.map((nodeId) => ({ kind: 'static-routes', nodeId })),
      checks: routedGoals(net),
      hints: [
        L(
          `Send from ${the(near.device)} and follow the answer: where does it stop on the way back?`,
          `${near.device.ja}から送って、返事のほうを追ってください。帰り道のどこで止まりますか。`,
        ),
        L(
          `Every router on the way back needs a route to the sender's network, just as every router on the way out needs one to the destination. ${The(name(faulty))} has none for ${net.pcNet.cidr}.`,
          `行きのルータにあて先への経路がいるのと同じように、帰りのルータには送り元のネットワークへの経路がいります。${name(faulty).ja}には、${net.pcNet.cidr} あての経路がありません。`,
        ),
        L(
          `On ${the(name(faulty))}, add a route: destination ${net.pcNet.cidr}, next router ${nextHop}. Keep the lines that are already there.`,
          `${name(faulty).ja}に、あて先「${net.pcNet.cidr}」、次のルータ「${nextHop}」の経路を足します。すでにある行は残します。`,
        ),
      ],
      lessons: ['/routing/multi-hop'],
      reference: [routes(faulty, healthy)],
      wrongAnswers: [
        // "It does not arrive, so add the outward route again" on the first router.
        [
          routes('r1', [
            ...fullRoutes(net, 'r1'),
            { destination: net.srvNet.cidr, nextHop: net.ownAddressOn.r1 ?? '' },
          ]),
        ],
        // The return route, but pointing at the router's own address.
        [
          routes(faulty, [
            ...remaining,
            { destination: net.pcNet.cidr, nextHop: net.ownAddressOn[faulty] ?? '' },
          ]),
        ],
      ],
      fingerprint: [place.id, shape, faulty],
    };
  },
);
