/**
 * l3-choose-longest — two lines in a router's table both cover the server;
 * the one with the longer "/number" wins, whatever their order. One way is
 * closed (its router knows no way on yet), so the learner must pick the pair
 * of lines that sends the server's traffic the other way: predict, then run.
 */

import type { StaticRouteConfig } from '../../../../src/types/routing';
import type { DesignOption } from '../../model/types';
import { withNodeData } from '../shared/build';
import { buildDiamond, withStatic, type Way } from '../shared/diamond';
import { evenPlace, placedEvenly } from '../shared/draw';
import { defineTemplate, goals } from '../shared/exercise';
import { drawPlace } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { routes } from '../shared/routed';
import { L, say, the, The } from '../shared/text';

const WAY_SALT = 41;

type OptionId = 'longest' | 'longest-other' | 'default-first' | 'order';

export const l3ChooseLongest = defineTemplate(
  {
    id: 'l3-choose-longest',
    level: 3,
    kind: 'choose-design',
    title: L('Which line wins: the longest "/number"', 'どの行が勝つか：「/数字」が長いほう'),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const net = buildDiamond(place, plan);
    const open: Way = evenPlace(seed, 2, WAY_SALT) === 0 ? 'top' : 'bottom';
    const shut: Way = open === 'top' ? 'bottom' : 'top';
    const order = placedEvenly(
      draw,
      seed,
      9,
      'longest' as OptionId,
      ['longest-other', 'default-first', 'order'] as const,
    );
    // The wide line: the first two numbers of the server's network.
    const wideLength = draw.pick([16, 8] as const);
    const [a = '10', b = '0'] = net.far.cidr.split('.');
    const wide = wideLength === 16 ? `${a}.${b}.0.0/16` : `${a}.0.0.0/8`;

    // r1 starts with no route to the server; the closed way's router knows none onward.
    const { links, far } = net;
    const hop = (way: Way) => (way === 'top' ? links.r12.b : links.r13.b);
    const shutRouter = net.via[shut];
    const base = withStatic(net, open, []);
    const topology = withNodeData(base, shutRouter, {
      staticRoutes: (
        base.nodes.find((node) => node.id === shutRouter)?.data.staticRoutes ?? []
      ).filter((route) => route.destination !== far.cidr),
    });
    const name = (id: string) => net.names[id] ?? place.router;
    const openName = name(net.via[open]);
    const shutName = name(shutRouter);
    const line = (destination: string, way: Way): StaticRouteConfig => ({
      destination,
      nextHop: hop(way),
    });
    const said = (route: StaticRouteConfig, way: Way) =>
      L(
        `${route.destination} to ${route.nextHop} (${name(net.via[way]).en})`,
        `${route.destination} は ${route.nextHop}（${name(net.via[way]).ja}）へ`,
      );
    const option = (
      id: OptionId,
      lines: readonly [StaticRouteConfig, Way][],
      explain: ReturnType<typeof L>,
    ): DesignOption => ({
      id,
      label: L(
        `Two lines: ${lines.map(([route, way]) => said(route, way).en).join('; ')}`,
        `2 行：${lines.map(([route, way]) => `「${said(route, way).ja}」`).join('')}`,
      ),
      changes: [
        routes(
          'r1',
          lines.map(([route]) => route),
        ),
      ],
      explain,
    });
    const optionOf: Record<OptionId, DesignOption> = {
      longest: option(
        'longest',
        [
          [line(wide, shut), shut],
          [line(far.cidr, open), open],
        ],
        L(
          `Both lines cover ${far.cidr}; the /24 is the longer "/number", so it wins and the traffic goes through ${the(openName)}.`,
          `2 行とも ${far.cidr} に当てはまります。/24 のほうが「/数字」が長いので勝ち、${openName.ja}を通ります。`,
        ),
      ),
      'longest-other': option(
        'longest-other',
        [
          [line(wide, open), open],
          [line(far.cidr, shut), shut],
        ],
        L(
          `The /24 wins, and it sends the traffic to ${the(shutName)}, which knows no way on.`,
          `/24 の行が勝ち、その行は${shutName.ja}へ送ります。${shutName.ja}は、その先の道を知りません。`,
        ),
      ),
      'default-first': option(
        'default-first',
        [
          [line('0.0.0.0/0', open), open],
          [line(wide, shut), shut],
        ],
        L(
          `0.0.0.0/0 fits everything, but ${wide} is longer and fits too: it wins, and sends the traffic to ${the(shutName)}.`,
          `0.0.0.0/0 は何にでも当てはまりますが、${wide} も当てはまり、そちらが長いので勝ちます。送り先は${shutName.ja}です。`,
        ),
      ),
      order: option(
        'order',
        [
          [line(far.cidr, shut), shut],
          [line('0.0.0.0/0', open), open],
        ],
        L(
          `Which line comes first does not matter: the /24 is the longer one, and it sends the traffic to ${the(shutName)}.`,
          `行の順番は関係ありません。長いのは /24 で、その送り先は${shutName.ja}です。`,
        ),
      ),
    };
    const { reach } = goals(net.names);
    const brief = say(
      L(
        `${The(name('r1'))} can send to ${the(name('srv'))} through ${the(name('r2'))} or through ${the(name('r3'))}. ${The(shutName)} is being moved and knows no way on to ${the(name('srv'))} yet. ${The(name('r1'))} has no route to it at all.`,
        `${name('r1').ja}から${name('srv').ja}へは、${name('r2').ja}を通る道と、${name('r3').ja}を通る道があります。${shutName.ja}は移設中で、${name('srv').ja}への先の道を、まだ知りません。${name('r1').ja}には、${name('srv').ja}への経路がまだ 1 つもありません。`,
      ),
      L(
        'When several lines of a table fit where something is going, the line with the longest "/number" (the one that names the destination most exactly) wins. The order of the lines does not matter, and 0.0.0.0/0 fits everything, so it wins only when nothing else fits.',
        '経路の表で、行き先に当てはまる行がいくつもあるときは、「/数字」がいちばん長い行（行き先をいちばんくわしく書いた行）が勝ちます。行の順番は関係ありません。0.0.0.0/0 は何にでも当てはまるので、ほかに当てはまる行がないときだけ使われます。',
      ),
      L(
        `Which pair of lines for ${the(name('r1'))} gets what ${the(name('pc'))} sends to ${the(name('srv'))}?`,
        `${name('r1').ja}にどの 2 行を入れると、${name('pc').ja}から${name('srv').ja}に届きますか。`,
      ),
    );
    return {
      title: L(`Two lines that both fit`, `どちらの行も当てはまる`),
      task: L(
        `Pick the two lines for ${the(name('r1'))} that get the traffic to ${the(name('srv'))}, say what you expect, and run it.`,
        `${name('r1').ja}に入れる 2 行を選び、どうなるか予想してから動かしてください。`,
      ),
      rule: L(
        'Rule: of the lines that fit, the one with the longest "/number" wins. Order does not count; 0.0.0.0/0 fits everything.',
        'ルール：当てはまる行のうち、「/数字」がいちばん長い行が勝つ。順番は関係ない。0.0.0.0/0 は何にでも当てはまる。',
      ),
      brief,
      topology,
      names: net.names,
      allowed: [{ kind: 'static-routes', nodeId: 'r1' }],
      options: order.map((id) => optionOf[id]),
      checks: [reach('pc', 'srv')],
      hints: [
        L(
          `For each choice, find the line that wins for ${far.cidr}: the one with the longest "/number" among those that fit.`,
          `選べるものごとに、${far.cidr} あてで勝つ行をさがしてください。当てはまる行のうち、「/数字」がいちばん長い行です。`,
        ),
        L(
          `${The(shutName)} knows no way on: the winning line must send the traffic to ${the(openName)}.`,
          `${shutName.ja}は先の道を知りません。勝つ行の送り先が${openName.ja}でなければなりません。`,
        ),
        L(
          `Pick the choice whose /24 line goes to ${hop(open)}.`,
          `/24 の行の送り先が ${hop(open)} になっているものを選びます。`,
        ),
      ],
      lessons: ['/learning/routing-decision', '/routing/multi-hop'],
      reference: optionOf.longest.changes,
      fingerprint: [place.id, open, `/${wideLength}`],
    };
  },
);
