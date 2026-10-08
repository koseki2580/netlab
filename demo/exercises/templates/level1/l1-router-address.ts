/**
 * l1-router-address — the router has a wrong address on one of its two sides,
 * so nothing crosses it. The learner finds which side and fixes it.
 *
 * The far side carries the fault only where a switch sits there: on a direct
 * cable a router that takes the server's address answers in its place.
 *
 * The two sides are named by what is plugged into them, as the settings form
 * names them (`model/names.ts`), never `lan` or `far`. The "/number" is not
 * the fault here (l1-prefix-fit is the exercise about it), so both settings
 * are `addressOnly`: the form shows the address alone.
 */

import { buildLan, LAN_SHAPES } from '../shared/build';
import { defineTemplate, formNames, goals } from '../shared/exercise';
import { addressOf, broken, everyoneReaches, freeAddressOn, starts, startsJa } from '../shared/lan';
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
    const sides = formNames(topology, lan.names);
    const [lanSide, farSide] = [sides.side('r1', 'lan'), sides.side('r1', 'far')];
    const sideForm = side === 'lan' ? lanSide : farSide;
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
        `A router joins two networks, and has one address on each side: here the ${lanSide.en} and the ${farSide.en}. Each must have the same first three numbers as the devices on that side. Fix the one that is wrong.`,
        `ルータは 2 つのネットワークをつなぐ機械で、それぞれの側に 1 つずつアドレスを持ちます。ここでは「${lanSide.ja}」と「${farSide.ja}」です。どちらのアドレスも、その側にある機器と、はじめの 3 つの数字が同じでなければなりません。まちがっているほうを直してください。`,
      ),
      PRESS_CHECK,
    );

    // --- What may be changed, the goals, the answers ---
    const { reach } = goals(lan.names);
    const right = net.at(plan.gateway);
    const neighbour = side === 'lan' ? 'pc1' : 'srv';
    return {
      title: L(`Nothing gets past ${the(router)}`, `${router.ja}の先へ届かない`),
      brief,
      topology,
      names: lan.names,
      allowed: [
        { kind: 'iface-address', nodeId: 'r1', ifaceId: 'lan', addressOnly: true },
        { kind: 'iface-address', nodeId: 'r1', ifaceId: 'far', addressOnly: true },
      ],
      checks: [
        ...everyoneReaches(lan, lan.names),
        // The other direction too: a router that takes a server's address is caught here.
        ...(side === 'far' ? [reach('srv', 'pc1')] : []),
      ],
      hints: [
        L(
          `${The(router)} has two addresses. Compare each with the addresses of the devices on that side.`,
          `${router.ja}にはアドレスが 2 つあります。それぞれを、その側にある機器のアドレスと見くらべてください。`,
        ),
        L(
          `The devices on the ${sideForm.en} have addresses that start with ${starts(net)}. The router's address on that side starts differently.`,
          `「${sideForm.ja}」にある機器のアドレスは、${startsJa(net)}で始まります。ルータのその側のアドレスだけ、始まりがちがいます。`,
        ),
        L(
          `Change the address of ${the(router)} on the ${sideForm.en} to ${freeAddressOn(net).en}.`,
          `${router.ja}の「${sideForm.ja}」のアドレスを、${freeAddressOn(net).ja}に変えます。`,
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
