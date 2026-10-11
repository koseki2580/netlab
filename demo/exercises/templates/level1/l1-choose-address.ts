/**
 * l1-choose-address — a shared device was brought from somewhere else and still
 * has the address it had there. Six addresses are offered; the
 * learner chooses one, says what they expect, and the simulator runs it.
 *
 * Replaces the plan's l1-choose-cable. That needed candidate cables, and in
 * this simulator (a) a PC with more than one cable breaks traffic between
 * OTHER devices even when the extra cables are unplugged, and (b) an unplugged
 * cable between two switches still carries frames one way (engine fact 4).
 */

import { buildLan, withNodeData } from '../shared/build';
import { defineTemplate, goals } from '../shared/exercise';
import { addressOf, setIp, starts, startsJa } from '../shared/lan';
import { placedEvenly } from '../shared/draw';
import { drawPlace, scene } from '../shared/places';
import { drawPlan, net24 } from '../shared/plans';
import { L, say, the, The } from '../shared/text';
import type { DesignOption } from '../../model/types';

export const l1ChooseAddress = defineTemplate(
  {
    id: 'l1-choose-address',
    level: 1,
    kind: 'choose-design',
    title: L('Choose an address for a device', '機器のアドレスを選ぶ'),
  },
  (draw, seed) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(['one-switch', 'two-switches']);
    const lan = buildLan(place, plan, shape);
    // The moved device takes the seat of one of the PCs.
    const moved = draw.pick(lan.faultable);
    // The address that works stands in each of the six places equally often.
    const order = placedEvenly(draw, seed, 2, 'fits', [
      'last-number',
      'duplicate',
      'router',
      'next-door',
      'duplicate-2',
    ] as const);

    // --- The fault: the device still has the address it had where it came from ---
    // (Not "from the servers' side": a device carrying an address of the far
    // network is still found by this simulator, so that start would pass.)
    const oldAddress = plan.stranger.at(plan.servers[1]);
    const topology = withNodeData(lan.topology, moved, { ip: oldAddress, role: 'server' });
    const names = { ...lan.names, [moved]: place.printer };
    const others = lan.pcs.filter((id) => id !== moved);
    const neighbour = others[0] ?? 'pc1';

    // --- The brief ---
    const dev = place.printer;
    const opening = scene(place, {
      home: L(
        `A ${dev.en} came from the grandparents' house and was plugged in in the lounge.`,
        `おじいちゃんの家で使っていた${dev.ja}をもらって、リビングにつなぎました。`,
      ),
      shop: L(
        `A ${dev.en} was brought over from another branch and plugged in on the shop floor.`,
        `ほかの支店で使っていた${dev.ja}を持ってきて、売り場につなぎました。`,
      ),
      clinic: L(
        `A ${dev.en} was handed down from another clinic and plugged in at reception.`,
        `ほかの診療所で使っていた${dev.ja}をゆずってもらい、受付につなぎました。`,
      ),
      school: L(
        `A ${dev.en} was passed on from another school and plugged in near the classrooms.`,
        `ほかの学校で使っていた${dev.ja}をゆずり受けて、教室の近くにつなぎました。`,
      ),
      office: L(
        `A ${dev.en} was sent over from a closed branch and plugged in near the desks.`,
        `閉めた支店で使っていた${dev.ja}が送られてきたので、席の近くにつなぎました。`,
      ),
    });
    const brief = say(
      opening,
      L(
        `No device can print on it. Its address is still the one it had before, ${oldAddress}.`,
        `ところが、どの機器からも印刷できません。アドレスは、前の場所で使っていた「${oldAddress}」のままです。`,
      ),
      L(
        `Compare it with the addresses of the devices around it. Which address should ${the(dev)} get?`,
        `まわりの機器のアドレスと見くらべてください。${dev.ja}のアドレスを、どれに変えますか。`,
      ),
    );

    // --- The options ---
    const neighbourName = names[neighbour] ?? place.pcs[0];
    const neighbour2 = others[1] ?? neighbour;
    const neighbour2Name = names[neighbour2] ?? place.pcs[1];
    const [first, second, third] = plan.near.starts.split('.');
    const nextDoor = net24(`${first}.${second}.${Number(third) + 1}`).at(plan.free);
    const optionOf: Record<(typeof order)[number], DesignOption> = {
      'next-door': {
        id: 'next-door',
        label: L(nextDoor, `「${nextDoor}」にする`),
        changes: [setIp(moved, nextDoor)],
        explain: L(
          `It looks close, but the third number differs from the devices here (${starts(plan.near)}). All of the first three numbers have to match.`,
          `よく似ていますが、3 つ目の数字がここの機器（${startsJa(plan.near)}）とちがいます。はじめの 3 つの数字は、全部同じでなければなりません。`,
        ),
      },
      'duplicate-2': {
        id: 'duplicate-2',
        label: L(addressOf(lan, neighbour2), `「${addressOf(lan, neighbour2)}」にする`),
        changes: [setIp(moved, addressOf(lan, neighbour2))],
        explain: L(
          `${The(neighbour2Name)} already uses this address. Two devices with one address take each other's traffic.`,
          `このアドレスは、${neighbour2Name.ja}がすでに使っています。同じアドレスの機器が 2 台あると、お互いあての通信を取り合ってしまいます。`,
        ),
      },
      fits: {
        id: 'fits',
        label: L(plan.near.at(plan.free), `「${plan.near.at(plan.free)}」にする`),
        changes: [setIp(moved, plan.near.at(plan.free))],
        explain: L(
          `It starts like every address on this side (${starts(plan.near)}), and no other device uses it.`,
          `この側のアドレスと同じ始まり（${startsJa(plan.near)}）で、ほかの機器が使っていないアドレスです。`,
        ),
      },
      'last-number': {
        id: 'last-number',
        label: L(plan.stranger.at(plan.free), `「${plan.stranger.at(plan.free)}」にする`),
        changes: [setIp(moved, plan.stranger.at(plan.free))],
        explain: L(
          `Only the last number changed. It still starts the way addresses did in the old place, so the devices here look for it outside this network and never find it.`,
          `変わったのは最後の数字だけです。始まりが前の場所のままなので、ここの機器は、この機器をネットワークの外にあるものとして探してしまい、見つけられません。`,
        ),
      },
      duplicate: {
        id: 'duplicate',
        label: L(addressOf(lan, neighbour), `「${addressOf(lan, neighbour)}」にする`),
        changes: [setIp(moved, addressOf(lan, neighbour))],
        explain: L(
          `${The(neighbourName)} already uses this address. Two devices with one address take each other's traffic.`,
          `このアドレスは、${neighbourName.ja}がすでに使っています。同じアドレスの機器が 2 台あると、お互いあての通信を取り合ってしまいます。`,
        ),
      },
      router: {
        id: 'router',
        label: L(plan.near.at(plan.gateway), `「${plan.near.at(plan.gateway)}」にする`),
        changes: [setIp(moved, plan.near.at(plan.gateway))],
        explain: L(
          `This is the address of ${the(place.router)} on this side. It starts the right way, but it is taken.`,
          `これは、${place.router.ja}のこの側のアドレスです。始まりは合っていますが、すでに使われています。`,
        ),
      },
    };

    // --- The goals ---
    const { reach } = goals(names);
    return {
      title: L(`A ${dev.en} from somewhere else`, `よそから来た${dev.ja}`),
      task: L(
        `Choose the address ${the(dev)} should get.`,
        `${dev.ja}のアドレスを、どれにするか選んでください。`,
      ),
      rule: L(
        'Rule: the same first three numbers as the devices next to it; a last number nobody else has, the router included.',
        'ルール：となりの機器と、はじめの 3 つの数字を同じに。最後の数字は、ルータもふくめて、だれともかぶらない。',
      ),
      brief,
      topology,
      names,
      allowed: [{ kind: 'host-ip', nodeId: moved }],
      options: order.map((id) => optionOf[id]),
      checks: [...others.map((pc) => reach(pc, moved)), ...others.map((pc) => reach(pc, 'srv'))],
      hints: [
        L(
          `Look at the addresses of the devices that are now next to ${the(dev)}.`,
          `いま${dev.ja}のとなりにある機器のアドレスを見てください。`,
        ),
        L(
          `A device needs an address that starts like its neighbours' (${starts(plan.near)}), and that no other device, the router included, already has.`,
          `機器のアドレスは、となりの機器と同じ始まり（${startsJa(plan.near)}）で、ルータもふくめて、ほかのどの機器も使っていないものにします。`,
        ),
        L(
          `Five of the six fail: two start differently from the devices here, two belong to other devices, one belongs to the router.`,
          `6 つのうち 5 つはうまくいきません。2 つは始まりがここの機器とちがい、2 つはほかの機器のもの、1 つはルータのものです。`,
        ),
      ],
      lessons: ['/course', '/learning/subnetting'],
      reference: optionOf.fits.changes,
      fingerprint: [place.id, shape, moved],
    };
  },
);
