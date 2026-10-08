/**
 * l1-choose-address — a shared device was brought from somewhere else and still
 * has the address it had there. Four addresses are offered; the
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
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, PRESS_CHECK_CHOICE, say, the, The } from '../shared/text';
import type { DesignOption } from '../../model/types';

export const l1ChooseAddress = defineTemplate(
  {
    id: 'l1-choose-address',
    level: 1,
    kind: 'choose-design',
    title: L('Choose an address for a device', '機器のアドレスを選ぶ'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(['one-switch', 'two-switches']);
    const lan = buildLan(place, plan, shape);
    // The moved device takes the seat of one of the PCs.
    const moved = draw.pick(lan.faultable);
    const order = draw.pick([
      ['fits', 'last-number', 'duplicate', 'router'],
      ['duplicate', 'fits', 'router', 'last-number'],
      ['last-number', 'router', 'fits', 'duplicate'],
      ['router', 'duplicate', 'last-number', 'fits'],
    ]);

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
        `No device can print on it. Its address is still the one it had before, ${oldAddress}; here, addresses start with ${starts(plan.near)}.`,
        `ところが、どの機器からも印刷できません。アドレスは前の場所で使っていた「${oldAddress}」のままです。ここでは、アドレスは${startsJa(plan.near)}で始まります。`,
      ),
      L(`Which address should ${the(dev)} get?`, `${dev.ja}のアドレスを、どれに変えますか。`),
      PRESS_CHECK_CHOICE,
    );

    // --- The options ---
    const neighbourName = names[neighbour] ?? place.pcs[0];
    const optionOf: Record<(typeof order)[number], DesignOption> = {
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
          `Three of the four fail: one still starts the old way, one belongs to ${the(neighbourName)}, one belongs to the router.`,
          `4 つのうち 3 つはうまくいきません。1 つは始まりが前のまま、1 つは${neighbourName.ja}のもの、1 つはルータのものです。`,
        ),
      ],
      lessons: ['/course', '/learning/subnetting'],
      reference: optionOf.fits.changes,
      fingerprint: [place.id, shape, moved],
    };
  },
);
