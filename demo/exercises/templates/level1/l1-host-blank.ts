/**
 * l1-host-blank — a new device is cabled but has no address yet. The learner
 * chooses one: on the right network, and not in use.
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
import { L, listOf, PRESS_CHECK, say, the } from '../shared/text';

export const l1HostBlank = defineTemplate(
  {
    id: 'l1-host-blank',
    level: 1,
    kind: 'configure',
    title: L('Give a new device an address', '新しい機器にアドレスを入れる'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(LAN_SHAPES);
    const lan = buildLan(place, plan, shape);
    // The new device is one of the PCs, or (where there are two) the second server.
    const device = draw.pick(
      shape === 'server-switch' ? [...lan.faultable, 'srv2'] : lan.faultable,
    );
    const far = isFarSide(lan, device);

    // --- The fault: no address at all ---
    const topology = broken(lan.topology, setIp(device, null));
    // A new PC is called what the place calls a new device; a new server keeps its name.
    const names = far ? lan.names : { ...lan.names, [device]: place.newPc };
    const dev = names[device] ?? place.newPc;
    const net = netOf(lan, plan, device);
    const neighbours = neighboursOf(lan, device);
    const neighbourNames = neighbours.flatMap((id) => names[id] ?? []);

    // --- The brief ---
    const opening = far
      ? scene(place, {
          home: L(
            `A ${dev.en} has been bought and plugged in next to ${the(place.server)}.`,
            `${dev.ja}を買ってきて、${place.server.ja}のとなりにつなぎました。`,
          ),
          shop: L(
            `A ${dev.en} has arrived and is plugged in next to ${the(place.server)}.`,
            `${dev.ja}が届いたので、${place.server.ja}のとなりにつなぎました。`,
          ),
          clinic: L(
            `A ${dev.en} has been installed on the same shelf as ${the(place.server)}.`,
            `${dev.ja}を、${place.server.ja}と同じ棚に取り付けました。`,
          ),
          school: L(
            `A ${dev.en} has been put in the same room as ${the(place.server)}.`,
            `${dev.ja}を、${place.server.ja}と同じ部屋に置きました。`,
          ),
          office: L(
            `A ${dev.en} has been delivered and plugged in beside ${the(place.server)}.`,
            `${dev.ja}が納品され、${place.server.ja}の横につなぎました。`,
          ),
        })
      : scene(place, {
          home: L(
            `A ${dev.en} is a birthday present. It is plugged in, but it cannot show the photos on ${the(place.server)} yet.`,
            `誕生日のプレゼントに${dev.ja}を買いました。ケーブルはつなぎましたが、まだ${place.server.ja}の写真が見られません。`,
          ),
          shop: L(
            `A ${dev.en} has arrived for the busy season. It is plugged in, but it cannot use ${the(place.server)} yet.`,
            `いそがしい時期にそなえて、${dev.ja}が届きました。ケーブルはつなぎましたが、まだ${place.server.ja}が使えません。`,
          ),
          clinic: L(
            `A ${dev.en} has been put on the desk. It is plugged in, but it cannot open ${the(place.server)} yet.`,
            `${dev.ja}を机に置きました。ケーブルはつなぎましたが、まだ${place.server.ja}が開けません。`,
          ),
          school: L(
            `A ${dev.en} has been handed out. It is plugged in, but it cannot open ${the(place.server)} yet.`,
            `${dev.ja}が配られました。ケーブルはつなぎましたが、まだ${place.server.ja}が開けません。`,
          ),
          office: L(
            `The ${dev.en} is on the desk for Monday. It is plugged in, but it cannot use ${the(place.server)} yet.`,
            `月曜からの${dev.ja}を席に置きました。ケーブルはつなぎましたが、まだ${place.server.ja}が使えません。`,
          ),
        });
    const brief = say(
      opening,
      L(
        `It has no address. Addresses on its side of the network all start with ${starts(net)}.`,
        `この機器には、まだアドレスが入っていません。こちら側のアドレスは、どれも${startsJa(net)}で始まります。`,
      ),
      L(
        `Give the ${dev.en} an address that no other device is using.`,
        `${dev.ja}に、ほかの機器と重ならないアドレスを入れてください。`,
      ),
      PRESS_CHECK,
    );

    // --- What may be changed, the goals, the answers ---
    const right = net.at(plan.free);
    return {
      title: L(`Give the ${dev.en} an address`, `${dev.ja}にアドレスを入れる`),
      brief,
      topology,
      names,
      allowed: [{ kind: 'host-ip', nodeId: device }],
      checks: [
        ...everyoneReaches(lan, names),
        // From the server too: a server that takes the router's address is caught here.
        ...(far ? [goals(names).reach(device, 'pc1')] : []),
      ],
      hints: [
        L(
          `Look at the addresses of ${listOf(neighbourNames).en}: the new device belongs with them.`,
          `${listOf(neighbourNames).ja}のアドレスを見てください。新しい機器は、その仲間に入ります。`,
        ),
        SAME_START_RULE(net),
        L(
          `Give the ${dev.en} an address such as ${right}: it starts with ${starts(net)} and nothing else uses it.`,
          `${dev.ja}に「${right}」のように、${startsJa(net)}で始まり、ほかの機器が使っていないアドレスを入れます。`,
        ),
      ],
      lessons: ['/course', '/routing/client-server'],
      reference: [setIp(device, right)],
      wrongAnswers: [
        // Copying the address of the device next to it.
        [setIp(device, addressOf(lan, neighbours[0] ?? 'pc1'))],
        // An address from the other side of the router.
        [setIp(device, (far ? plan.near : plan.far).at(plan.free))],
      ],
      fingerprint: [place.id, shape, device],
    };
  },
);
