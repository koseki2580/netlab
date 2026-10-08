/**
 * l2-choose-static-default — a site with one way out, and several networks
 * (more to come) behind the next router. Four ways to write its routes are
 * offered; only "everything else goes to the neighbour" reaches them all.
 */

import { host, iface, link, router, snapshot, withNodeData } from '../shared/build';
import { placedEvenly } from '../shared/draw';
import { defineTemplate, goals } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { routes } from '../shared/routed';
import { L, listOf, PRESS_CHECK_CHOICE, say, the, The, type Named } from '../shared/text';
import type { DesignOption } from '../../model/types';

export const l2ChooseStaticDefault = defineTemplate(
  {
    id: 'l2-choose-static-default',
    level: 2,
    kind: 'choose-design',
    title: L('Choose the routes for a site with one exit', '出口が 1 つの拠点の経路を選ぶ'),
  },
  (draw, seed) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    // Three networks on the next router itself, or two of them one router further on.
    const shape = draw.pick(['star', 'two-deep']);
    // The line that works stands in each of the four places equally often.
    const order = placedEvenly(draw, seed, 6, 'default', [
      'one-net',
      'two-nets',
      'default-self',
    ] as const);

    // --- The network: r1 has no routes at all; everything behind it knows the way back ---
    //   star:      pc — r1 — r2 — srv, srv2, srv3
    //   two-deep:  pc — r1 — r2 — srv,  r2 — r3 — srv2, srv3
    const { near, far, far2, far3, gateway, pcs, servers, links } = plan;
    const [l1, l2] = links;
    const { sites } = place;
    const at = (col: number, row: number) => ({ x: col * 210, y: row * 110 });
    const lan = (id: string, net: typeof near) => iface(id, `${net.at(gateway)}/24`);
    const names: Record<string, Named> = {
      pc: sites.near.device,
      r1: sites.near.router,
      r2: sites.far.router,
      srv: sites.far.device,
      srv2: sites.far2.device,
      srv3: sites.far3.device,
      ...(shape === 'two-deep' ? { r3: sites.far2.router } : {}),
    };
    const pc = host('pc', near.at(pcs[0]), at(0, 1));
    const r1 = router('r1', [lan('lan', near), iface('out', `${l1.a}/30`)], {}, at(1, 1));
    const server = (id: string, net: typeof near, n: number, col: number, row: number) =>
      host(id, net.at(servers[n] ?? 9), { role: 'server', ...at(col, row) });
    const back = { destination: near.cidr, nextHop: l1.a };
    const wired =
      shape === 'star'
        ? snapshot(
            [
              pc,
              r1,
              router(
                'r2',
                [
                  iface('to-r1', `${l1.b}/30`),
                  lan('lan1', far),
                  lan('lan2', far2),
                  lan('lan3', far3),
                ],
                { staticRoutes: [back] },
                at(2, 1),
              ),
              server('srv', far, 0, 3, 0),
              server('srv2', far2, 1, 3, 1),
              server('srv3', far3, 2, 3, 2),
            ],
            [
              link('e-pc', 'pc', 'r1:lan'),
              link('e-out', 'r1:out', 'r2:to-r1'),
              link('e-srv', 'r2:lan1', 'srv'),
              link('e-srv2', 'r2:lan2', 'srv2'),
              link('e-srv3', 'r2:lan3', 'srv3'),
            ],
          )
        : snapshot(
            [
              pc,
              r1,
              router(
                'r2',
                [iface('to-r1', `${l1.b}/30`), lan('lan1', far), iface('to-r3', `${l2.a}/30`)],
                {
                  staticRoutes: [
                    back,
                    { destination: far2.cidr, nextHop: l2.b },
                    { destination: far3.cidr, nextHop: l2.b },
                  ],
                },
                at(2, 1),
              ),
              router(
                'r3',
                [iface('to-r2', `${l2.b}/30`), lan('lan2', far2), lan('lan3', far3)],
                {
                  staticRoutes: [
                    { destination: near.cidr, nextHop: l2.a },
                    { destination: far.cidr, nextHop: l2.a },
                  ],
                },
                at(3, 1.6),
              ),
              server('srv', far, 0, 3, 0),
              server('srv2', far2, 1, 4, 1),
              server('srv3', far3, 2, 4, 2.2),
            ],
            [
              link('e-pc', 'pc', 'r1:lan'),
              link('e-out', 'r1:out', 'r2:to-r1'),
              link('e-srv', 'r2:lan1', 'srv'),
              link('e-23', 'r2:to-r3', 'r3:to-r2'),
              link('e-srv2', 'r3:lan2', 'srv2'),
              link('e-srv3', 'r3:lan3', 'srv3'),
            ],
          );
    const topology = withNodeData(wired, 'r1', { staticRoutes: [] });

    // --- The brief ---
    const r1Name = sites.near.router;
    const r2Name = sites.far.router;
    const targets = [sites.far.device, sites.far2.device, sites.far3.device];
    const opening = scene(place, {
      home: L(
        `${The(sites.near.name)} has one cable to the rest of the property, and it ends at ${the(r2Name)}.`,
        `${sites.near.name.ja}から外へ出る線は 1 本だけで、その先は${r2Name.ja}です。`,
      ),
      shop: L(
        `${The(sites.near.name)} has one line out, and it ends at ${the(r2Name)}.`,
        `${sites.near.name.ja}から外へ出る回線は 1 本だけで、その先は${r2Name.ja}です。`,
      ),
      clinic: L(
        `${The(sites.near.name)} has one line out, and it ends at ${the(r2Name)}.`,
        `${sites.near.name.ja}から外へ出る回線は 1 本だけで、その先は${r2Name.ja}です。`,
      ),
      school: L(
        `${The(sites.near.name)} has one cable out, and it ends at ${the(r2Name)}.`,
        `${sites.near.name.ja}から外へ出る線は 1 本だけで、その先は${r2Name.ja}です。`,
      ),
      office: L(
        `${The(sites.near.name)} has one line out, and it ends at ${the(r2Name)}.`,
        `${sites.near.name.ja}から外へ出る回線は 1 本だけで、その先は${r2Name.ja}です。`,
      ),
    });
    const brief = say(
      opening,
      L(
        `Behind it are ${listOf(targets).en}, each on a network of its own, and more networks will be added. ${The(sites.near.device)} must reach all of them.`,
        `${r2Name.ja}の向こうには${listOf(targets).ja}があり、それぞれ別のネットワークにあります。ネットワークは、これからもふえる予定です。${sites.near.device.ja}から、その全部に届かなければなりません。`,
      ),
      L(
        `A router needs a route (a line saying "for that network, hand it to this neighbouring router", the next router) for every network that is not plugged into it. ${The(r1Name)} has none yet. How should its routes be written?`,
        `ルータは、自分に直接つながっていないネットワークへは、経路（「このネットワークあては、となりのこのルータに渡す」という行。渡す相手を「次のルータ」といいます）がなければ送れません。${r1Name.ja}には、まだ経路が 1 つもありません。どう書きますか。`,
      ),
      PRESS_CHECK_CHOICE,
    );

    // --- The options ---
    const optionOf: Record<'default' | 'one-net' | 'two-nets' | 'default-self', DesignOption> = {
      default: {
        id: 'default',
        label: L(
          `One line: everything else (0.0.0.0/0) goes to ${l1.b}`,
          `1 行だけ：「そのほか全部（0.0.0.0/0）」は ${l1.b} へ渡す`,
        ),
        changes: [routes('r1', [{ destination: '0.0.0.0/0', nextHop: l1.b }])],
        explain: L(
          `With one exit, every unknown destination lies the same way. 0.0.0.0/0 matches every address, so this one line (a default route) covers the three networks and any added later.`,
          `出口が 1 つなら、知らない行き先はどれも同じ方向にあります。0.0.0.0/0 はどのアドレスにも当てはまるので、この 1 行（デフォルトルート）で 3 つのネットワークにも、あとからふえる分にも届きます。`,
        ),
      },
      'one-net': {
        id: 'one-net',
        label: L(
          `One line: ${far.cidr} goes to ${l1.b}`,
          `1 行だけ：${far.cidr} あては ${l1.b} へ渡す`,
        ),
        changes: [routes('r1', [{ destination: far.cidr, nextHop: l1.b }])],
        explain: L(
          `This reaches ${the(sites.far.device)} only. For the other two networks the router has no line, and drops what is sent to them.`,
          `届くのは${sites.far.device.ja}だけです。残りの 2 つのネットワークあての行がないので、そちらに送ったものはルータが捨てます。`,
        ),
      },
      'two-nets': {
        id: 'two-nets',
        label: L(
          `Two lines: ${far.cidr} and ${far2.cidr} go to ${l1.b}`,
          `2 行：${far.cidr} あてと ${far2.cidr} あては ${l1.b} へ渡す`,
        ),
        changes: [
          routes('r1', [
            { destination: far.cidr, nextHop: l1.b },
            { destination: far2.cidr, nextHop: l1.b },
          ]),
        ],
        explain: L(
          `One network was forgotten (${far3.cidr}), and every network added later would need another line here. With a single exit there is a shorter way to say it.`,
          `ネットワークが 1 つ抜けています（${far3.cidr}）。この書き方では、ネットワークがふえるたびに行を足さなければなりません。出口が 1 つなら、もっと短い書き方があります。`,
        ),
      },
      'default-self': {
        id: 'default-self',
        label: L(
          `One line: everything else (0.0.0.0/0) goes to ${l1.a}`,
          `1 行だけ：「そのほか全部（0.0.0.0/0）」は ${l1.a} へ渡す`,
        ),
        changes: [routes('r1', [{ destination: '0.0.0.0/0', nextHop: l1.a }])],
        explain: L(
          `${l1.a} is the address of ${the(r1Name)} itself on the line out. The next router of a route must be the router at the OTHER end of the cable.`,
          `${l1.a} は、${r1Name.ja}自身の、外へ出る線の側のアドレスです。経路の「次のルータ」には、ケーブルの「向こう側」のルータのアドレスを書きます。`,
        ),
      },
    };

    // --- The goals ---
    const { reach } = goals(names);
    return {
      title: L(`One way out of ${the(sites.near.name)}`, `${sites.near.name.ja}の出口は 1 つ`),
      brief,
      topology,
      names,
      allowed: [{ kind: 'static-routes', nodeId: 'r1' }],
      options: order.map((id) => optionOf[id]),
      checks: [reach('pc', 'srv'), reach('pc', 'srv2'), reach('pc', 'srv3')],
      hints: [
        L(
          `Count the networks behind ${the(r2Name)}, and look at how many cables leave ${the(r1Name)} towards them.`,
          `${r2Name.ja}の先にあるネットワークを数えてください。そして、${r1Name.ja}からそちらへ出る線が何本あるかを見てください。`,
        ),
        L(
          `A route to 0.0.0.0/0 matches every destination no other line matches. Its next router must still be the neighbour at the other end of the cable, not the router's own address.`,
          `行き先 0.0.0.0/0 の経路は、ほかの行に当てはまらない行き先すべてに当てはまります。ただし「次のルータ」は、自分のアドレスではなく、ケーブルの向こう側のルータにします。`,
        ),
        L(
          `Choose the single line that sends 0.0.0.0/0 to ${l1.b}, the address of ${the(r2Name)}.`,
          `0.0.0.0/0 を、${r2Name.ja}のアドレスである ${l1.b} へ渡す 1 行を選びます。`,
        ),
      ],
      lessons: ['/routing/multi-hop', '/routing/dynamic'],
      reference: optionOf.default.changes,
      fingerprint: [place.id, shape],
    };
  },
);
