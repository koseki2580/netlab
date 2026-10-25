/**
 * l2-choose-static-default — a site with one way out, and four networks behind
 * the next router. Four ways to write its routes are offered: everything
 * (0.0.0.0/0), three networks, two, or one, all to the neighbour. Which is
 * right depends on which networks the site must reach and which it must not:
 * all of them, with more to come (the default route), or only some (exactly
 * those lines). Each way is the right one in a quarter of the instances, so no
 * way of writing it is right by itself; reading the goals is.
 */

import { host, iface, link, router, snapshot, withNodeData } from '../shared/build';
import { evenPlace, placedEvenly } from '../shared/draw';
import { defineTemplate, goals } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { routes, RULE_ROUTE } from '../shared/routed';
import { L, listOf, say, the, The, type Named } from '../shared/text';
import { WHY_DEFAULT } from '../shared/why';
import type { DesignOption } from '../../model/types';

/** How many of the networks behind the next router the site must reach: all (and more to come), 3, 2 or 1. */
type Want = 'all' | 3 | 2 | 1;
type OptionId = 'default' | 'three' | 'two' | 'one';
const RIGHT: Record<Want, OptionId> = { all: 'default', 3: 'three', 2: 'two', 1: 'one' };
const WANT_SALT = 23;

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
    // Which networks the site must reach: each of the four answers equally often.
    const want = (['all', 3, 2, 1] as const)[evenPlace(seed, 4, WANT_SALT)] ?? 'all';
    const right = RIGHT[want];
    // The line that works stands in each of the four places equally often.
    const order = placedEvenly(
      draw,
      seed,
      6,
      right,
      (['default', 'three', 'two', 'one'] as const).filter((id) => id !== right),
    );

    // --- The network: r1 has no routes at all; everything behind it knows the way back ---
    //   star:      pc — r1 — r2 — srv, srv2, srv3
    //   two-deep:  pc — r1 — r2 — srv,  r2 — r3 — srv2, srv3
    const { near, far, far2, far3, stranger: far4, gateway, pcs, servers, links } = plan;
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
      srv4: place.newPc,
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
                  lan('lan4', far4),
                ],
                { staticRoutes: [back] },
                at(2, 1),
              ),
              server('srv', far, 0, 3, 0),
              server('srv2', far2, 1, 3, 1),
              server('srv3', far3, 2, 3, 2),
              server('srv4', far4, 0, 2, 2.2),
            ],
            [
              link('e-pc', 'pc', 'r1:lan'),
              link('e-out', 'r1:out', 'r2:to-r1'),
              link('e-srv', 'r2:lan1', 'srv'),
              link('e-srv2', 'r2:lan2', 'srv2'),
              link('e-srv3', 'r2:lan3', 'srv3'),
              link('e-srv4', 'r2:lan4', 'srv4'),
            ],
          )
        : snapshot(
            [
              pc,
              r1,
              router(
                'r2',
                [
                  iface('to-r1', `${l1.b}/30`),
                  lan('lan1', far),
                  iface('to-r3', `${l2.a}/30`),
                  lan('lan4', far4),
                ],
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
              server('srv4', far4, 0, 2, 2.2),
            ],
            [
              link('e-pc', 'pc', 'r1:lan'),
              link('e-out', 'r1:out', 'r2:to-r1'),
              link('e-srv', 'r2:lan1', 'srv'),
              link('e-23', 'r2:to-r3', 'r3:to-r2'),
              link('e-srv2', 'r3:lan2', 'srv2'),
              link('e-srv3', 'r3:lan3', 'srv3'),
              link('e-srv4', 'r2:lan4', 'srv4'),
            ],
          );
    const topology = withNodeData(wired, 'r1', { staticRoutes: [] });

    // --- Who must be reached, and who must not ---
    const sitesBehind = [
      { id: 'srv', net: far, name: sites.far.device },
      { id: 'srv2', net: far2, name: sites.far2.device },
      { id: 'srv3', net: far3, name: sites.far3.device },
      { id: 'srv4', net: far4, name: place.newPc },
    ] as const;
    // The three named networks, in the order every list option writes them.
    const listed = sitesBehind.slice(0, 3);
    const reachCount = want === 'all' ? 4 : want;
    const wanted = sitesBehind.slice(0, reachCount);
    const barred = sitesBehind.slice(reachCount);

    // --- The brief ---
    const r1Name = sites.near.router;
    const r2Name = sites.far.router;
    const opening = scene(place, {
      home: L(
        `${The(sites.near.name)} has one cable to the rest of the property, and it ends at ${the(r2Name)}.`,
        `${sites.near.name.ja}から外へ出るケーブルは 1 本だけで、その先は${r2Name.ja}です。`,
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
        `${sites.near.name.ja}から外へ出るケーブルは 1 本だけで、その先は${r2Name.ja}です。`,
      ),
      office: L(
        `${The(sites.near.name)} has one line out, and it ends at ${the(r2Name)}.`,
        `${sites.near.name.ja}から外へ出る回線は 1 本だけで、その先は${r2Name.ja}です。`,
      ),
    });
    const behind = L(
      `Behind it are ${listOf(sitesBehind.map((site) => site.name)).en}, each on a network of its own.`,
      `${r2Name.ja}の向こうには${listOf(sitesBehind.map((site) => site.name)).ja}があり、それぞれ別のネットワークにあります。`,
    );
    const who =
      want === 'all'
        ? L(
            `${The(place.newPc)} has just been given its network, and more networks will be added. ${The(sites.near.device)} must reach all of them.`,
            `${place.newPc.ja}のネットワークはできたばかりで、これからもふえる予定です。${sites.near.device.ja}から、その全部に届かなければなりません。`,
          )
        : L(
            `${The(sites.near.device)} must reach ${listOf(wanted.map((site) => site.name)).en}. ${listOf(barred.map((site) => site.name)).en.replace(/^./, (first) => first.toUpperCase())} ${barred.length === 1 ? 'is' : 'are'} not for this site: nothing may be sent there.`,
            `${sites.near.device.ja}から届かなければならないのは${listOf(wanted.map((site) => site.name)).ja}です。${listOf(barred.map((site) => site.name)).ja}は、この拠点からは使いません。そちらへは何も送ってはいけません。`,
          );
    const brief = say(
      opening,
      behind,
      who,
      L(
        `A router needs a route (a line saying "for that network, hand it to this neighbouring router", the next router) for every network that is not plugged into it. ${The(r1Name)} has none yet. How should its routes be written?`,
        `ルータは、自分に直接つながっていないネットワークへは、経路（「このネットワークあては、となりのこのルータに渡す」という行。そのとなりのルータを「次のルータ」といいます）がなければ送れません。${r1Name.ja}には、まだ経路が 1 つもありません。どう書きますか。`,
      ),
    );

    // --- The options: everything, or the first three, two or one network, all to the neighbour ---
    const listOption = (id: 'three' | 'two' | 'one', count: 3 | 2 | 1) => {
      const covered = listed.slice(0, count);
      const nets = covered.map((site) => site.net.cidr);
      return {
        covered,
        option: {
          id,
          label: L(
            `${count} line${count === 1 ? '' : 's'}: ${nets.join(', ')} go${count === 1 ? 'es' : ''} to ${l1.b}`,
            `${count} 行：${nets.map((cidr) => `${cidr} あて`).join('、')}は ${l1.b} へ渡す`,
          ),
          changes: [
            routes(
              'r1',
              nets.map((destination) => ({ destination, nextHop: l1.b })),
            ),
          ],
        },
      };
    };
    /** What a way of writing the routes does, against who must and must not be reached. */
    const verdict = (covered: readonly (typeof sitesBehind)[number][]): ReturnType<typeof L> => {
      const missed = wanted.filter((site) => !covered.includes(site));
      const leaked = barred.filter((site) => covered.includes(site));
      if (missed.length === 0 && leaked.length === 0) {
        return L(
          `These lines cover exactly the networks ${the(sites.near.device)} must reach, and no other.`,
          `${sites.near.device.ja}が届かなければならないネットワークだけに、ちょうど当てはまる行です。`,
        );
      }
      if (leaked.length > 0) {
        return L(
          `This also sends to ${listOf(leaked.map((site) => site.name)).en}, which must not be reached from this site.`,
          `これでは、この拠点から送ってはいけない${listOf(leaked.map((site) => site.name)).ja}にも送ってしまいます。`,
        );
      }
      return L(
        `There is no line for ${listOf(missed.map((site) => site.name)).en}: the router drops what is sent there.`,
        `${listOf(missed.map((site) => site.name)).ja}あての行がないので、そちらに送ったものはルータが捨てます。`,
      );
    };
    const lists = {
      three: listOption('three', 3),
      two: listOption('two', 2),
      one: listOption('one', 1),
    };
    const everything = verdict(sitesBehind);
    const optionOf: Record<OptionId, DesignOption> = {
      default: {
        id: 'default',
        label: L(
          `1 line: everything (0.0.0.0/0) goes to ${l1.b}`,
          `1 行：「0.0.0.0/0（全部）」は ${l1.b} へ渡す`,
        ),
        changes: [routes('r1', [{ destination: '0.0.0.0/0', nextHop: l1.b }])],
        explain:
          want === 'all'
            ? L(
                `With one exit, every destination lies the same way. 0.0.0.0/0 matches every address, so this one line (a default route) covers all four networks and any added later.`,
                `出口が 1 つなら、行き先はどれも同じ方向にあります。0.0.0.0/0 はどのアドレスにも当てはまるので、この 1 行（デフォルトルート）で 4 つのネットワークにも、あとからふえる分にも届きます。`,
              )
            : L(
                `0.0.0.0/0 matches every address. ${everything.en}`,
                `0.0.0.0/0 は、どのアドレスにも当てはまります。${everything.ja}`,
              ),
      },
      three: { ...lists.three.option, explain: verdict(lists.three.covered) },
      two: { ...lists.two.option, explain: verdict(lists.two.covered) },
      one: { ...lists.one.option, explain: verdict(lists.one.covered) },
    };

    // --- The goals ---
    const { reach, apart } = goals(names);
    const answer = optionOf[right];
    return {
      title: L(`One way out of ${the(sites.near.name)}`, `${sites.near.name.ja}の出口は 1 つ`),
      task: L(
        `Choose how to write the routes of ${the(r1Name)}, so that ${the(sites.near.device)} reaches what it must and nothing else.`,
        `届くべきところにだけ届くように、${r1Name.ja}の経路の書き方を 1 つ選んでください。`,
      ),
      rule: RULE_ROUTE,
      brief: say(brief, WHY_DEFAULT),
      topology,
      names,
      allowed: [{ kind: 'static-routes', nodeId: 'r1' }],
      options: order.map((id) => optionOf[id]),
      checks: [
        ...wanted.map((site) => reach('pc', site.id)),
        ...barred.map((site) => apart('pc', site.id, 'any')),
      ],
      hints: [
        L(
          `List the devices ${the(sites.near.device)} must reach and those it must not, and find the network each one is on in the diagram.`,
          `${sites.near.device.ja}が届かなければならない機器と、届いてはいけない機器を書き出し、図でそれぞれのネットワークを確かめてください。`,
        ),
        L(
          `A route to 0.0.0.0/0 matches every destination, the ones that must not be reached too. A line for one network matches that network only.`,
          `行き先 0.0.0.0/0 の経路は、届いてはいけない行き先も含めて、すべてに当てはまります。1 つのネットワークあての行は、そのネットワークにだけ当てはまります。`,
        ),
        want === 'all'
          ? L(
              `Choose the single line that sends 0.0.0.0/0 to ${l1.b}, the address of ${the(r2Name)}.`,
              `0.0.0.0/0 を、${r2Name.ja}のアドレスである ${l1.b} へ渡す 1 行を選びます。`,
            )
          : L(
              `Choose the lines for ${wanted.map((site) => site.net.cidr).join(', ')}, and for nothing else.`,
              `${wanted.map((site) => site.net.cidr).join('、')} あての行だけを選びます。`,
            ),
      ],
      lessons: ['/routing/multi-hop', '/routing/dynamic'],
      reference: answer.changes,
      fingerprint: [place.id, shape, String(want)],
    };
  },
);
