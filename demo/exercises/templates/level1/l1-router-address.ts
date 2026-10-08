/**
 * l1-router-address — the router has a wrong address on one of its two sides,
 * so nothing crosses it. The learner finds which side and fixes it.
 *
 * The far side carries the fault only where a switch sits there: on a direct
 * cable a router that takes the server's address answers in its place.
 */

import { buildLan, LAN_SHAPES } from '../shared/build';
import { defineTemplate, formNames, goals } from '../shared/exercise';
import { addressOf, broken, everyoneReaches, starts, startsJa } from '../shared/lan';
import { drawPlace, scene } from '../shared/places';
import { drawPlan, net24 } from '../shared/plans';
import { L, PRESS_CHECK, say, the, The } from '../shared/text';
import type { SettingChange } from '../../model/types';

export const l1RouterAddress = defineTemplate(
  {
    id: 'l1-router-address',
    level: 1,
    kind: 'configure',
    title: L('Fix the address of the router', 'ルータのアドレスを直す'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(LAN_SHAPES);
    const lan = buildLan(place, plan, shape);
    const side = shape === 'server-switch' ? draw.pick(['lan', 'far']) : 'lan';
    const fault = draw.pick(['stranger', 'near-miss']);

    // --- The fault ---
    const net = side === 'lan' ? plan.near : plan.far;
    const [first, second, third] = net.starts.split('.');
    const wrongNet =
      fault === 'stranger'
        ? plan.stranger
        : // One number off: 192.168.1. becomes 192.168.2.
          net24(`${first}.${second}.${Number(third) + 1}`);
    const address = (ipAddress: string): SettingChange => ({
      kind: 'iface-address',
      nodeId: 'r1',
      ifaceId: side,
      ipAddress,
      prefixLength: 24,
    });
    const topology = broken(lan.topology, address(wrongNet.at(plan.gateway)));

    // --- The brief ---
    const { router, server } = place;
    const sideWords =
      side === 'lan'
        ? L('the side the PCs are on', 'パソコンのある側')
        : L(`the side ${the(server)} is on`, `${server.ja}のある側`);
    const opening = scene(place, {
      home: L(
        `The old ${router.en} broke, and a new one was set up by hand.`,
        `古い${router.ja}がこわれたので、新しいものを手で設定しました。`,
      ),
      shop: L(
        `${The(router)} was replaced before opening time, and its settings were typed in by hand.`,
        `開店前に${router.ja}を取り替えて、設定を手で入れ直しました。`,
      ),
      clinic: L(
        `${The(router)} was swapped during the lunch break, and its settings were typed in again.`,
        `昼休みに${router.ja}を取り替えて、設定を入れ直しました。`,
      ),
      school: L(
        `${The(router)} was replaced during the holidays, and someone typed its settings in again.`,
        `休みのあいだに${router.ja}を取り替えて、設定を入れ直しました。`,
      ),
      office: L(
        `${The(router)} was replaced last night, and its settings were copied in by hand.`,
        `きのうの夜、${router.ja}を取り替えて、設定を手で写しました。`,
      ),
    });
    const brief = say(
      opening,
      L(
        `Since then nothing reaches ${the(server)}. The PCs and ${the(server)} were not touched.`,
        `それから、どの機器からも${server.ja}につながりません。パソコンと${server.ja}は、さわっていません。`,
      ),
      L(
        `A router joins two networks, and has one address on each side; each must start like the devices on that side. Fix the address of ${the(router)} that is wrong.`,
        `ルータは 2 つのネットワークをつなぐ機械で、それぞれの側に 1 つずつアドレスを持ちます。どちらも、その側の機器と同じ始まりでなければなりません。${router.ja}の、まちがっているほうのアドレスを直してください。`,
      ),
      PRESS_CHECK,
    );

    // --- What may be changed, the goals, the answers ---
    const { reach } = goals(lan.names);
    const right = net.at(plan.gateway);
    const neighbour = side === 'lan' ? 'pc1' : 'srv';
    const sideForm = formNames(topology, lan.names).side('r1', side);
    return {
      title: L(`Nothing gets past ${the(router)}`, `${router.ja}の先へ届かない`),
      brief,
      topology,
      names: lan.names,
      allowed: [
        { kind: 'iface-address', nodeId: 'r1', ifaceId: 'lan' },
        { kind: 'iface-address', nodeId: 'r1', ifaceId: 'far' },
      ],
      checks: [
        ...everyoneReaches(lan, lan.names),
        // The other direction too: a router that takes a server's address is caught here.
        ...(side === 'far' ? [reach('srv', 'pc1')] : []),
      ],
      hints: [
        L(
          `${The(router)} has two addresses. Compare each with the addresses of the devices on that side.`,
          `${router.ja}にはアドレスが 2 つあります。それぞれを、その側にある機器のアドレスと見比べてください。`,
        ),
        L(
          `On ${sideWords.en}, addresses start with ${starts(net)}. The router's address on that side must start the same way, and must not be one a device already uses.`,
          `${sideWords.ja}のアドレスは、${startsJa(net)}で始まります。ルータのその側のアドレスも同じ始まりにして、ほかの機器が使っているものは避けます。`,
        ),
        L(
          `Change the address of ${the(router)} on ${sideForm.en}, which is ${sideWords.en}, to ${right}.`,
          `${sideWords.ja}にあたる、${router.ja}の「${sideForm.ja}」のアドレスを「${right}」に変えます。`,
        ),
      ],
      lessons: ['/routing/client-server', '/course'],
      reference: [address(right)],
      wrongAnswers: [
        // The right network, but the address of a device that is already there.
        [address(addressOf(lan, neighbour))],
        // Another address on the same wrong network.
        [address(wrongNet.at(plan.free))],
      ],
      fingerprint: [place.id, shape, side, fault],
    };
  },
);
