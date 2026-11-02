/**
 * l3-bgp-med — two links into one provider, and a second provider beside them.
 * Everything ties, so traffic leaves by the link with the lower BGP Identifier;
 * the story wants the other link of that provider. Five designs, each a MED on
 * one of r1's sessions.
 *
 * Truth (RFC 4271 §9.1.2.2(c)): the lower MED wins, but only between routes from
 * the same neighbouring AS. A MED on the session to the other provider is never
 * compared with these two, so that design changes nothing.
 *
 * Fair to a learner who does not read: which link is wanted varies, so each
 * design on a link is right half the time it is offered.
 */

import type { DesignOption, SettingChange } from '../../model/types';
import { bgpMedExits, MED_START, type Link } from '../shared/bgp';
import { evenPlace, placedEvenly } from '../shared/draw';
import { defineTemplate, goals, type LabelledCheck } from '../shared/exercise';
import { drawPlace } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, the, The } from '../shared/text';

const WANT_SALT = 61;
const LOW = 50;
const HIGH = 200;
const LOWEST = 10;

const firstThree = (cidr: string) => cidr.split('.').slice(0, 3).join('.');

export const l3BgpMed = defineTemplate(
  {
    id: 'l3-bgp-med',
    level: 3,
    kind: 'choose-design',
    title: L(
      'Choose the link into a provider with BGP MED',
      'BGP の MED でプロバイダへの回線を選ぶ',
    ),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const wanted: Link = evenPlace(seed, 2, WANT_SALT) === 0 ? 'east' : 'west';
    const other: Link = wanted === 'east' ? 'west' : 'east';
    const { sites } = place;
    const net = bgpMedExits(
      {
        near: firstThree(plan.near.cidr),
        far: firstThree(plan.far.cidr),
        linkBlock: firstThree(plan.links[0].cidr),
      },
      wanted,
      {
        pc: sites.near.device,
        r1: sites.near.router,
        rs: sites.far.router,
        srv: sites.far.device,
      },
    );
    const r1 = sites.near.router;
    const pc = sites.near.device;
    const srv = sites.far.device;
    const name = (id: string) => net.names[id] ?? r1;
    const set = (side: Link | 'other', med: number): SettingChange => ({
      kind: 'bgp-med',
      nodeId: 'r1',
      neighbor: net.neighbour[side],
      med,
    });
    const option = (
      id: string,
      side: Link | 'other',
      med: number,
      explain: ReturnType<typeof L>,
    ): DesignOption => ({
      id,
      label: L(
        `Give routes from ${name(side).en} MED ${med}`,
        `${name(side).ja}から受け取る経路の MED を ${med} にする`,
      ),
      changes: [set(side, med)],
      explain,
    });
    const best = option(
      'lower-wanted',
      wanted,
      LOW,
      L(
        `Both links come from the same neighbouring AS, so their MEDs are compared and the lower wins: ${LOW} beats ${MED_START}.`,
        `2 本は同じ隣の AS から来るので MED が比べられ、小さいほうが勝ちます。${LOW} は ${MED_START} に勝ちます。`,
      ),
    );
    const options = placedEvenly(draw, seed, 1, best, [
      option(
        'raise-other',
        other,
        HIGH,
        L(
          `The two links of one provider are compared, and the lower MED wins: ${MED_START} now beats ${HIGH}, so the other link drops out.`,
          `同じプロバイダの 2 本が比べられ、小さい MED が勝ちます。${MED_START} が ${HIGH} に勝つので、もう 1 本が外れます。`,
        ),
      ),
      option(
        'raise-wanted',
        wanted,
        HIGH,
        L(
          `The lower MED wins, not the higher: this makes the link you want lose.`,
          `勝つのは小さい MED で、大きい MED ではありません。これでは、選びたい回線が負けます。`,
        ),
      ),
      option(
        'lower-other',
        other,
        LOW,
        L(
          `The lower MED wins, and this link already carried traffic: it only wins by more.`,
          `小さい MED が勝ちます。この回線はもともと使われていたので、さらに有利になるだけです。`,
        ),
      ),
      option(
        'lower-b',
        'other',
        LOWEST,
        L(
          `MED is compared only between routes from the same neighbouring AS. ${The(name('other'))} is another AS, so its MED is not compared with theirs and nothing changes.`,
          `MED が比べられるのは、同じ隣の AS から来た経路どうしだけです。${name('other').ja}は別の AS なので、比べられず、何も変わりません。`,
        ),
      ),
    ]);

    const { reach } = goals(net.names);
    const leaves: LabelledCheck = {
      id: `exit-${wanted}`,
      kind: 'path-via',
      probe: { via: 'ping', from: 'pc', to: 'srv' },
      edgeId: net.edgeOf[wanted],
      label: L(
        `Traffic from ${the(pc)} leaves by ${name(wanted).en}`,
        `${pc.ja}からの通信が、${name(wanted).ja}から出ていく`,
      ),
    };
    return {
      title: L(`Leaving by ${name(wanted).en}`, `${name(wanted).ja}から出す`),
      task: L(
        `Choose the setting that sends ${the(srv)}’s traffic out by ${name(wanted).en}.`,
        `${srv.ja}あての通信が${name(wanted).ja}から出ていく設定を 1 つ選んでください。`,
      ),
      rule: L(
        'Rule: the lower MED wins, but MED is compared only between routes from the same neighbouring AS.',
        'ルール：MED は小さいほうが勝つ。ただし、比べるのは同じ隣の AS から来た経路どうしだけ。',
      ),
      brief: L(
        `${The(r1)} has two links into provider A and one into provider B, and learns the way to ${the(srv)} from all three with the same LOCAL_PREF and the same AS_PATH length. ${The(r1)} records MED ${MED_START} on each session. Everything ties, so the lowest BGP Identifier decides, and traffic leaves by ${name(other).en}. The site wants it to leave by ${name(wanted).en}, which has the wider link. MED is the next thing compared.`,
        `${r1.ja}はプロバイダ A に 2 本、プロバイダ B に 1 本の回線を持ち、${srv.ja}への道を 3 つとも、同じ LOCAL_PREF、同じ長さの AS_PATH で教わっています。${r1.ja}はどのセッションでも MED を ${MED_START} と記録しています。すべて同じなので BGP Identifier の最も小さいものが選ばれ、いまは${name(other).ja}から出ています。この拠点は、回線の太い${name(wanted).ja}から出したいと考えています。次に比べられるのは MED です。`,
      ),
      topology: net.topology,
      names: net.names,
      allowed: (['east', 'west', 'other'] as const).map((side) => ({
        kind: 'bgp-med',
        nodeId: 'r1',
        neighbor: net.neighbour[side],
      })),
      options,
      checks: [reach('pc', 'srv'), leaves],
      hints: [
        L(
          'Which of the three sessions can be compared by MED at all? Look at which AS each one leads to.',
          '3 つのセッションのうち、MED で比べられるのはどれでしょうか。それぞれがどの AS につながっているかを見てください。',
        ),
        L(
          'The two links into provider A are the same neighbouring AS, so their MEDs are compared, and the lower wins.',
          'プロバイダ A への 2 本は同じ隣の AS なので MED が比べられ、小さいほうが勝ちます。',
        ),
        L(
          `Make ${name(wanted).en}’s MED lower than ${name(other).en}’s: lower one, or raise the other.`,
          `${name(wanted).ja}の MED を${name(other).ja}より小さくします。片方を下げても、もう片方を上げてもかまいません。`,
        ),
      ],
      lessons: ['/routing/dynamic'],
      reference: best.changes,
      fingerprint: [place.id, wanted],
    };
  },
);
