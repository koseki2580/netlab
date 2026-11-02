/**
 * l3-bgp-exit — a site with two providers; its traffic leaves by the one with
 * the shorter AS_PATH, and the story wants the other. Four designs, each one
 * LOCAL_PREF on one of r1's two BGP sessions: raise the wanted provider's, or
 * lower the other's, both work; the same moves on the wrong session do not.
 *
 * Truth (RFC 4271 §9.1): LOCAL_PREF is compared first and the higher wins; only
 * between equal LOCAL_PREFs does the shorter AS_PATH decide. A session with no
 * LOCAL_PREF of its own gives what it learns 100 (the usual default). MED is
 * left out here; `l3-bgp-med` teaches it.
 *
 * Fair to a learner who does not read: which provider is wanted varies, so
 * every design is right half the time it is offered, which is also chance.
 */

import type { DesignOption, SettingChange } from '../../model/types';
import { bgpExits, PROVIDER_NAMES, type Provider } from '../shared/bgp';
import { evenPlace, placedEvenly } from '../shared/draw';
import { defineTemplate, goals, type LabelledCheck } from '../shared/exercise';
import { drawPlace } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, the, The } from '../shared/text';

const WANT_SALT = 59;
const HIGH = 200;
const LOW = 50;

type OptionId = 'raise-wanted' | 'lower-other' | 'raise-other' | 'lower-wanted';

const firstThree = (cidr: string) => cidr.split('.').slice(0, 3).join('.');

export const l3BgpExit = defineTemplate(
  {
    id: 'l3-bgp-exit',
    level: 3,
    kind: 'choose-design',
    title: L('Choose the way out with BGP LOCAL_PREF', 'BGP の LOCAL_PREF で出口を選ぶ'),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    // The wanted provider is the one whose way to the server is one AS longer.
    const wanted: Provider = evenPlace(seed, 2, WANT_SALT) === 0 ? 'A' : 'B';
    const other: Provider = wanted === 'A' ? 'B' : 'A';
    const { sites } = place;
    const net = bgpExits(
      {
        near: firstThree(plan.near.cidr),
        far: firstThree(plan.far.cidr),
        linkBlock: firstThree(plan.links[0].cidr),
      },
      wanted,
      {
        pc: sites.near.device,
        r1: sites.near.router,
        rc: sites.far.router,
        rx: sites.mid.router,
        srv: sites.far.device,
      },
    );
    const r1 = sites.near.router;
    const srv = sites.far.device;
    const pc = sites.near.device;
    const name = (provider: Provider) => PROVIDER_NAMES[provider];
    const set = (provider: Provider, localPref: number): SettingChange => ({
      kind: 'bgp-local-pref',
      nodeId: 'r1',
      neighbor: net.neighbour[provider],
      localPref,
    });
    const option = (
      id: OptionId,
      provider: Provider,
      localPref: number,
      explain: ReturnType<typeof L>,
    ): DesignOption => ({
      id,
      label: L(
        `Give routes from ${name(provider).en} LOCAL_PREF ${localPref}`,
        `${name(provider).ja}から受け取る経路の LOCAL_PREF を ${localPref} にする`,
      ),
      changes: [set(provider, localPref)],
      explain,
    });
    const optionOf: Record<OptionId, DesignOption> = {
      'raise-wanted': option(
        'raise-wanted',
        wanted,
        HIGH,
        L(
          `Routes from ${name(wanted).en} now carry ${HIGH}, more than the default 100 from ${name(other).en}. LOCAL_PREF is compared before the AS_PATH, so they win though their AS_PATH is one AS longer.`,
          `${name(wanted).ja}からの経路は ${HIGH}、${name(other).ja}からは決まりどおり 100 です。LOCAL_PREF は AS_PATH より先に比べられるので、AS_PATH が 1 つ長くても${name(wanted).ja}の経路が勝ちます。`,
        ),
      ),
      'lower-other': option(
        'lower-other',
        other,
        LOW,
        L(
          `Routes from ${name(other).en} now carry ${LOW}, less than the default 100 from ${name(wanted).en}. The higher LOCAL_PREF wins first, whatever the AS_PATHs, so traffic leaves by ${name(wanted).en}.`,
          `${name(other).ja}からの経路は ${LOW} になり、${name(wanted).ja}からの 100 より小さくなります。AS_PATH がどうであれ、LOCAL_PREF の大きいほうが先に勝つので、${name(wanted).ja}から出ます。`,
        ),
      ),
      'raise-other': option(
        'raise-other',
        other,
        HIGH,
        L(
          `${The(name(other))} was already chosen, for its shorter AS_PATH; with LOCAL_PREF ${HIGH} it is chosen all the more.`,
          `${name(other).ja}は、AS_PATH が短いので、もともと選ばれていました。LOCAL_PREF ${HIGH} で、ますます選ばれます。`,
        ),
      ),
      'lower-wanted': option(
        'lower-wanted',
        wanted,
        LOW,
        L(
          `The higher LOCAL_PREF wins, not the lower: routes from ${name(wanted).en}, already second, fall further behind.`,
          `勝つのは LOCAL_PREF の大きいほうで、小さいほうではありません。もともと 2 番手だった${name(wanted).ja}の経路は、さらに不利になります。`,
        ),
      ),
    };
    const best = optionOf['raise-wanted'];
    const options = placedEvenly(draw, seed, 1, best, [
      optionOf['lower-other'],
      optionOf['raise-other'],
      optionOf['lower-wanted'],
    ]);

    const { reach } = goals(net.names);
    const leaves: LabelledCheck = {
      id: `exit-${wanted.toLowerCase()}`,
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
        'Rule: of two BGP routes, the higher LOCAL_PREF wins first; only on equal LOCAL_PREF does the shorter AS_PATH.',
        'ルール：BGP の経路は、まず LOCAL_PREF の大きいほうが勝つ。同じときだけ AS_PATH の短いほうが勝つ。',
      ),
      brief: L(
        `${The(r1)} is connected to two providers and learns the way to ${the(srv)} from both (BGP). Right now its traffic leaves by ${name(other).en}, whose AS_PATH (the list of networks on the way) is one shorter. The site has a cheaper contract with ${name(wanted).en} and wants the traffic to leave there. LOCAL_PREF is a number ${the(r1)} gives the routes it learns from each provider, 100 unless it says otherwise; it is compared before the AS_PATH.`,
        `${r1.ja}は 2 つのプロバイダにつながっていて、${srv.ja}への道をどちらからも BGP で教わっています。いまは、AS_PATH（途中のネットワークの並び）が 1 つ短い${name(other).ja}から出ています。この拠点は${name(wanted).ja}との契約のほうが安いので、そちらから出したいと考えています。LOCAL_PREF は、${r1.ja}が各プロバイダから教わった経路に付ける数で、決めていなければ 100 です。AS_PATH より先に比べられます。`,
      ),
      topology: net.topology,
      names: net.names,
      allowed: [
        { kind: 'bgp-local-pref', nodeId: 'r1', neighbor: net.neighbour.A },
        { kind: 'bgp-local-pref', nodeId: 'r1', neighbor: net.neighbour.B },
      ],
      options,
      checks: [reach('pc', 'srv'), leaves],
      hints: [
        L(
          `Find the route ${the(r1)} uses now, and the reason: both routes have LOCAL_PREF 100, so the shorter AS_PATH decides.`,
          `${r1.ja}がいま使っている経路と、その理由を見てください。どちらの LOCAL_PREF も 100 なので、AS_PATH の短いほうで決まっています。`,
        ),
        L(
          'LOCAL_PREF is compared before the AS_PATH, and the higher wins: a route with more LOCAL_PREF wins however long its AS_PATH.',
          'LOCAL_PREF は AS_PATH より先に比べられ、大きいほうが勝ちます。LOCAL_PREF が大きければ、AS_PATH が長くても勝ちます。',
        ),
        L(
          `Make the routes from ${name(wanted).en} carry more LOCAL_PREF than those from ${name(other).en}: raise one, or lower the other.`,
          `${name(wanted).ja}からの経路の LOCAL_PREF を、${name(other).ja}からの経路より大きくします。片方を上げても、もう片方を下げてもかまいません。`,
        ),
      ],
      lessons: ['/routing/dynamic'],
      reference: best.changes,
      fingerprint: [place.id, wanted],
    };
  },
);
