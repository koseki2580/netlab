/**
 * l1-prefix-fit — the "/number" after the router's address says how many of the
 * first numbers a device must share. The learner reads it (/8, /16 or /24) and
 * gives a PC an address that fits.
 *
 * Unlike l1-host-address, the brief does not say how addresses start: with /16
 * and /8 the healthy PCs differ from each other in the middle numbers, so
 * "copy the first three numbers" is not the rule here.
 */

import { buildLan, LAN_SHAPES, withInterface, withNodeData } from '../shared/build';
import { defineTemplate, formNames } from '../shared/exercise';
import { everyoneReaches, setIp } from '../shared/lan';
import { drawPlace, scene } from '../shared/places';
import { drawPlan, net24 } from '../shared/plans';
import { L, PRESS_CHECK, say, the, The } from '../shared/text';

/** A network per "/number": its fixed first numbers, and middle numbers for variety. */
const FITS = {
  8: {
    count: L('first number', 'はじめの 1 つの数字'),
    bases: [
      { fixed: '10', inside: ['0.0', '3.2', '20.0'], outside: '11' },
      { fixed: '10', inside: ['1.1', '1.2', '40.7'], outside: '12' },
    ],
  },
  16: {
    count: L('first two numbers', 'はじめの 2 つの数字'),
    bases: [
      { fixed: '172.16', inside: ['0', '4', '9'], outside: '172.17' },
      { fixed: '10.5', inside: ['0', '2', '7'], outside: '10.6' },
    ],
  },
  24: {
    count: L('first three numbers', 'はじめの 3 つの数字'),
    bases: [
      { fixed: '192.168.3', inside: ['', '', ''], outside: '192.168.4' },
      { fixed: '10.1.2', inside: ['', '', ''], outside: '10.1.3' },
    ],
  },
} as const;

export const l1PrefixFit = defineTemplate(
  {
    id: 'l1-prefix-fit',
    level: 1,
    kind: 'configure',
    title: L('Read the "/number" and pick an address', '「/数字」を読んでアドレスを決める'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    // The servers' side gets a network that overlaps none of the networks below.
    const plan = {
      ...drawPlan(draw),
      far: net24(draw.pick(['192.168.200', '172.20.8', '192.168.50'])),
    };
    const shape = draw.pick(LAN_SHAPES);
    const length = draw.pick([8, 16, 24]);
    const fit = FITS[length];
    const base = draw.pick(fit.bases);

    // --- The network: the PCs' side renumbered to the drawn "/number" ---
    const join = (...parts: readonly (string | number)[]): string =>
      parts.filter((part) => part !== '').join('.');
    const routerAddress = join(base.fixed, base.inside[0], plan.gateway);
    const lan = buildLan(place, plan, shape);
    const device = draw.pick(lan.faultable);
    const healthy = lan.pcs.reduce(
      (topology, id, index) =>
        withNodeData(topology, id, {
          ip: join(base.fixed, base.inside[index] ?? '', plan.pcs[index] ?? 9),
        }),
      withInterface(lan.topology, 'r1', 'lan', { ipAddress: routerAddress, prefixLength: length }),
    );

    // --- The fault: an address whose first numbers do not match ---
    const index = lan.pcs.indexOf(device);
    const tail = join(base.inside[index] ?? '', plan.pcs[index] ?? 9);
    const topology = withNodeData(healthy, device, { ip: join(base.outside, tail) });

    // --- The brief ---
    const dev = lan.names[device] ?? place.pcs[0];
    const { router, server } = place;
    // The side of the router the PCs are on, named as the settings form and the diagram name it.
    const side = formNames(topology, lan.names).side('r1', 'lan');
    const opening = scene(place, {
      home: L(
        `${The(dev)} was given an address by hand, and it cannot show the photos on ${the(server)}.`,
        `${dev.ja}にアドレスを手で入れたところ、${server.ja}の写真が見られません。`,
      ),
      shop: L(
        `${The(dev)} was set up from a note someone left, and it cannot use ${the(server)}.`,
        `だれかが残したメモのとおりに${dev.ja}を設定しましたが、${server.ja}が使えません。`,
      ),
      clinic: L(
        `${The(dev)} was given an address over the phone, and it cannot open ${the(server)}.`,
        `電話で聞いたアドレスを${dev.ja}に入れましたが、${server.ja}が開けません。`,
      ),
      school: L(
        `${The(dev)} was given an address from an old list, and it cannot open ${the(server)}.`,
        `古い一覧表のアドレスを${dev.ja}に入れましたが、${server.ja}が開けません。`,
      ),
      office: L(
        `${The(dev)} was given an address from last year's sheet, and it cannot use ${the(server)}.`,
        `去年の管理表のアドレスを${dev.ja}に入れましたが、${server.ja}が使えません。`,
      ),
    });
    const brief = say(
      opening,
      L(
        `The address of ${the(router)} on the ${side.en} is ${routerAddress}/${length}. The "/${length}" means: devices whose ${fit.count.en} match are on the same network.`,
        `${router.ja}の「${side.ja}」のアドレスは「${routerAddress}/${length}」です。「/${length}」は、${fit.count.ja}が同じ機器どうしが、同じネットワークの仲間だという意味です。`,
      ),
      L(
        `Compare the numbers, and change the address of ${the(dev)} so that it belongs.`,
        `数字を見くらべて、${dev.ja}のアドレスを、仲間に入るように直してください。`,
      ),
      PRESS_CHECK,
    );

    // --- What may be changed, the goals, the answers ---
    const right = join(base.fixed, base.inside[index] ?? '', plan.free);
    return {
      title: L(
        `Make ${the(dev)} fit a /${length} network`,
        `${dev.ja}を「/${length}」のネットワークに入れる`,
      ),
      brief,
      topology,
      names: lan.names,
      allowed: [{ kind: 'host-ip', nodeId: device }],
      checks: everyoneReaches(lan, lan.names),
      hints: [
        L(
          `Put the address of ${the(dev)} next to the router's ${routerAddress} and compare them number by number, from the left.`,
          `${dev.ja}のアドレスを、ルータの「${routerAddress}」と並べて、左から 1 つずつ数字を見くらべてください。`,
        ),
        L(
          `With /${length}, the ${fit.count.en} must be ${base.fixed}. The numbers after that are free, as long as no other device has the same address.`,
          `「/${length}」では、${fit.count.ja}が「${base.fixed}」でなければなりません。そのあとの数字は自由ですが、ほかの機器と同じアドレスにはできません。`,
        ),
        L(
          `Change the start of the address of ${the(dev)} to ${base.fixed}, and keep the whole address different from every other device's.`,
          `${dev.ja}のアドレスの始まりを「${base.fixed}」に変えます。アドレス全体は、ほかのどの機器とも重ならないようにします。`,
        ),
      ],
      lessons: ['/learning/subnetting', '/routing/client-server'],
      reference: [setIp(device, right)],
      wrongAnswers: [
        // Only the last number changed: the first numbers still do not match.
        [setIp(device, join(base.outside, base.inside[index] ?? '', plan.free))],
        // An address from the server's side.
        [setIp(device, plan.far.at(plan.free))],
      ],
      fingerprint: [place.id, shape, `/${length}`, device],
    };
  },
);
