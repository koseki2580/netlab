/**
 * l1-host-address — one device has an address that does not belong to its
 * network; the brief says which device. The learner types a right one.
 *
 * Crosses a router (a wrong address on one LAN can still "work", engine fact 5)
 * and checks every device on that side (taking a neighbour's address breaks
 * the neighbour, not the thief).
 */

import { buildLan, LAN_SHAPES } from '../shared/build';
import { defineTemplate, goals } from '../shared/exercise';
import {
  addressOf,
  broken,
  everyoneReaches,
  isFarSide,
  neighboursOf,
  netOf,
  SAME_START_RULE,
  setIp,
  starts,
  startsJa,
} from '../shared/lan';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, PRESS_CHECK, say, the, The } from '../shared/text';

export const l1HostAddress = defineTemplate(
  {
    id: 'l1-host-address',
    level: 1,
    kind: 'configure',
    title: L('Fix an address', 'アドレスを直す'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(LAN_SHAPES);
    const lan = buildLan(place, plan, shape);
    // A server can carry the fault only where a switch sits on its side: on a
    // direct cable, a server that takes the router's address goes unnoticed.
    const device = draw.pick(
      shape === 'server-switch' ? [...lan.faultable, 'srv', 'srv2'] : lan.faultable,
    );
    const far = isFarSide(lan, device);
    const fault = draw.pick(
      far ? ['stranger', 'other-side'] : ['stranger', 'other-side', 'router'],
    );

    // --- The fault ---
    const net = netOf(lan, plan, device);
    const last = Number(addressOf(lan, device).split('.')[3]);
    const wrongAddress =
      fault === 'stranger'
        ? plan.stranger.at(last)
        : fault === 'other-side'
          ? (far ? plan.near : plan.far).at(plan.free)
          : net.at(plan.gateway);
    const topology = broken(lan.topology, setIp(device, wrongAddress));

    // --- The brief ---
    const dev = lan.names[device] ?? place.pcs[0];
    const srv = place.server;
    const opening = far
      ? scene(place, {
          home: L(
            `${The(dev)} was replaced with a new one. Since then nobody in the house can open it.`,
            `${dev.ja}を新しいものに買い替えました。それから、家のどのパソコンからも開けません。`,
          ),
          shop: L(
            `${The(dev)} was moved to a new machine last night. This morning no till or PC in the shop can use it.`,
            `きのうの夜、${dev.ja}を新しい機械に入れ替えました。けさは、お店のどの機器からも使えません。`,
          ),
          clinic: L(
            `${The(dev)} was swapped over the weekend. On Monday nobody in the clinic can open it.`,
            `週末に${dev.ja}を入れ替えました。月曜の朝、診療所のどのパソコンからも開けません。`,
          ),
          school: L(
            `${The(dev)} was set up again during the holidays. Now no PC in the school can use it.`,
            `休みのあいだに${dev.ja}を設定し直しました。いまは、学校のどのパソコンからも使えません。`,
          ),
          office: L(
            `${The(dev)} was replaced by the supplier yesterday. Today nobody in the office can use it.`,
            `きのう業者が${dev.ja}を取り替えました。きょうは、会社のだれも使えません。`,
          ),
        })
      : scene(place, {
          home: L(
            `${The(dev)} was set up again, and now it cannot open the photos on ${the(srv)}.`,
            `${dev.ja}を設定し直したら、${srv.ja}の写真が見られなくなりました。`,
          ),
          shop: L(
            `${The(dev)} was replaced with a new one, and now it cannot use ${the(srv)}. The shop opens soon.`,
            `${dev.ja}を新しいものに取り替えたら、${srv.ja}が使えなくなりました。もうすぐ開店です。`,
          ),
          clinic: L(
            `Before the first patient, someone notices that ${the(dev)} cannot open ${the(srv)}.`,
            `朝の診療が始まる前に、${dev.ja}から${srv.ja}が開けないことに気づきました。`,
          ),
          school: L(
            `Before the lesson, ${the(dev)} cannot open the files on ${the(srv)}.`,
            `授業の前に、${dev.ja}から${srv.ja}の教材が開けなくなっていました。`,
          ),
          office: L(
            `After the desks were moved, ${the(dev)} can no longer use ${the(srv)}.`,
            `席替えのあと、${dev.ja}から${srv.ja}が使えなくなりました。`,
          ),
        });
    const brief = say(
      opening,
      L(
        `Someone typed its address by hand. Addresses on its side of the network all start with ${starts(net)}.`,
        `アドレスは、だれかが手で入れたものです。${dev.ja}のある側のアドレスは、どれも${startsJa(net)}で始まります。`,
      ),
      L(`Fix the address of ${the(dev)}.`, `${dev.ja}のアドレスを直してください。`),
      PRESS_CHECK,
    );

    // --- What may be changed, and the goals ---
    const allowed = [{ kind: 'host-ip', nodeId: device } as const];
    const checks = [
      ...everyoneReaches(lan, lan.names),
      // From the server too: a server that takes the router's address is caught here.
      ...(far ? [goals(lan.names).reach(device, 'pc1')] : []),
    ];

    // --- A right answer, and natural wrong ones ---
    const right = net.at(plan.free);
    const neighbour = neighboursOf(lan, device)[0] ?? 'pc1';
    const reference = [setIp(device, right)];
    const wrongAnswers = [
      // The address of the device next to it.
      [setIp(device, addressOf(lan, neighbour))],
      // Only the last number changed: still the wrong network.
      [
        setIp(
          device,
          (fault === 'router' ? plan.stranger : netOfWrong(wrongAddress)).at(plan.free),
        ),
      ],
    ];

    return {
      title: L(`Fix the address of ${the(dev)}`, `${dev.ja}のアドレスを直す`),
      brief,
      topology,
      names: lan.names,
      allowed,
      checks,
      hints: [
        L(
          `Compare the address of ${the(dev)} with the addresses of the devices next to it.`,
          `${dev.ja}のアドレスを、となりの機器のアドレスと見比べてください。`,
        ),
        fault === 'router'
          ? L(
              `One address belongs to one device. Look at the address of ${the(place.router)}: is ${the(dev)} using the same one?`,
              `アドレスは 1 台に 1 つです。${place.router.ja}のアドレスを見てください。${dev.ja}が同じものを使っていませんか。`,
            )
          : SAME_START_RULE(net),
        L(
          `Give ${the(dev)} an address such as ${right}: it starts with ${starts(net)} and no other device uses it.`,
          `${dev.ja}のアドレスを「${right}」のように、${startsJa(net)}で始まり、ほかの機器が使っていないものにします。`,
        ),
      ],
      lessons: ['/course', '/routing/client-server'],
      reference,
      wrongAnswers,
      fingerprint: [place.id, shape, device, fault],
    };
  },
);

/** The /24 an address is on, to make "same wrong network, another last number". */
function netOfWrong(address: string): { at: (last: number) => string } {
  const firstThree = address.split('.').slice(0, 3).join('.');
  return { at: (last) => `${firstThree}.${last + 1}` };
}
