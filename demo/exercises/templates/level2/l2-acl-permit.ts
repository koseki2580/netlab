/**
 * l2-acl-permit — a router lets only listed devices through to a server. One
 * device that should be let through is not on the list (or is listed with a
 * mistyped address). The learner adds it, without opening the server to all.
 *
 * The list sits where traffic goes TOWARDS the server (in from the PCs, or out
 * to the server), so answers coming back are not filtered and need no line.
 * Clearing the list removes it altogether, which lets everything through.
 */

import type { AclRule } from '../../../../src/types/acl';
import {
  host,
  iface,
  link,
  port,
  router,
  snapshot,
  switchNode,
  withInterface,
} from '../shared/build';
import { defineTemplate, goals } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, PRESS_CHECK, say, the, The, type Named } from '../shared/text';
import type { SettingChange } from '../../model/types';

const permit = (id: string, priority: number, address: string): AclRule => ({
  id,
  priority,
  action: 'permit',
  protocol: 'any',
  srcIp: `${address}/32`,
});

export const l2AclPermit = defineTemplate(
  {
    id: 'l2-acl-permit',
    level: 2,
    kind: 'configure',
    title: L('Let one more device through a filter', '通してよい機器を 1 台ふやす'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    // Where the list sits: on the way in from the PCs, or on the way out to the server.
    const where = draw.pick(['in-from-pcs', 'out-to-server']);
    // The device is missing from the list, or listed with a wrong address.
    const fault = draw.pick(['not-listed', 'mistyped']);
    // Which of the two trusted devices is the one left out.
    const leftOut = draw.pick(['pc2', 'pc1']);
    const listed = leftOut === 'pc2' ? 'pc1' : 'pc2';

    // --- The network: two trusted devices and one that must stay out ---
    //   pc1, pc2, guest — sw1 — r1 — srv
    const { near, far, gateway, pcs, servers } = plan;
    const [trusted, outsiders] = place.groups;
    const names: Record<string, Named> = {
      pc1: trusted.members[0],
      pc2: trusted.members[1],
      guest: outsiders.members[0],
      sw1: place.lanSwitch,
      r1: place.router,
      srv: place.server,
    };
    const at = (col: number, row: number) => ({ x: col * 210, y: row * 110 });
    const address = { pc1: near.at(pcs[0]), pc2: near.at(pcs[1]), guest: near.at(pcs[2]) };
    const open = snapshot(
      [
        host('pc1', address.pc1, at(0, 0)),
        host('pc2', address.pc2, at(0, 1)),
        host('guest', address.guest, at(0, 2)),
        switchNode('sw1', [port('p1'), port('p2'), port('p3'), port('up')], {}, at(1, 1)),
        router(
          'r1',
          [iface('lan', `${near.at(gateway)}/24`), iface('far', `${far.at(gateway)}/24`)],
          {},
          at(2, 1),
        ),
        host('srv', far.at(servers[0]), { role: 'server', ...at(3, 1) }),
      ],
      [
        link('e-pc1', 'pc1', 'sw1:p1'),
        link('e-pc2', 'pc2', 'sw1:p2'),
        link('e-guest', 'guest', 'sw1:p3'),
        link('e-up', 'sw1:up', 'r1:lan'),
        link('e-srv', 'r1:far', 'srv'),
      ],
    );

    // --- The fault: the list lacks the device, or has a wrong address for it ---
    const ifaceId = where === 'in-from-pcs' ? 'lan' : 'far';
    const direction = where === 'in-from-pcs' ? 'inbound' : 'outbound';
    const mistyped = near.at(plan.free);
    const kept = permit('r10', 10, address[listed]);
    const startRules = fault === 'mistyped' ? [kept, permit('r20', 20, mistyped)] : [kept];
    const topology = withInterface(open, 'r1', ifaceId, {
      [direction === 'inbound' ? 'inboundAcl' : 'outboundAcl']: startRules,
    });
    const acl = (rules: readonly AclRule[]): SettingChange => ({
      kind: 'iface-acl',
      nodeId: 'r1',
      ifaceId,
      direction,
      rules,
    });

    // --- The brief ---
    const dev = names[leftOut] ?? trusted.members[1];
    const guest = names.guest ?? outsiders.members[0];
    const { server, router: rtr } = place;
    const opening = scene(place, {
      home: L(
        `Only the family's devices may open ${the(server)}; the work devices must stay out.`,
        `${server.ja}を開いてよいのは、家族の機器だけです。仕事用の機器からは開けないようにしてあります。`,
      ),
      shop: L(
        `Only the shop-floor devices may use ${the(server)}; the back-office PCs must stay out.`,
        `${server.ja}を使ってよいのは、売り場の機器だけです。事務のパソコンからは使えないようにしてあります。`,
      ),
      clinic: L(
        `Only the medical staff's PCs may open ${the(server)}; the devices in the waiting room must stay out.`,
        `${server.ja}を開いてよいのは、診療用のパソコンだけです。待合室の機器からは開けないようにしてあります。`,
      ),
      school: L(
        `Only the teachers' PCs may open ${the(server)}; the pupils' PCs must stay out.`,
        `${server.ja}を開いてよいのは、先生のパソコンだけです。生徒用のパソコンからは開けないようにしてあります。`,
      ),
      office: L(
        `Only the sales PCs may use ${the(server)}; the accounts PCs must stay out.`,
        `${server.ja}を使ってよいのは、営業のパソコンだけです。経理のパソコンからは使えないようにしてあります。`,
      ),
    });
    const brief = say(
      opening,
      L(
        `${The(rtr)} does this with an ACL: a list of traffic it lets through. Whatever no line of the list allows is refused.`,
        `${rtr.ja}は、これを ACL（通してよい通信の一覧）で行っています。一覧のどの行にも当てはまらない通信は、通しません。`,
      ),
      fault === 'mistyped'
        ? L(
            `${The(dev)} was added to the list last week, and it still cannot reach ${the(server)}.`,
            `先週${dev.ja}を一覧に足したはずなのに、いまも${server.ja}に届きません。`,
          )
        : L(
            `${The(dev)} is new, and it cannot reach ${the(server)}.`,
            `${dev.ja}は新しく入った機器で、まだ${server.ja}に届きません。`,
          ),
      L(
        `Change the list so that ${the(dev)} gets through. ${The(guest)} must still be refused.`,
        `一覧を直して、${dev.ja}が通るようにしてください。${guest.ja}は、これまでどおり通してはいけません。`,
      ),
      PRESS_CHECK,
    );

    // --- What may be changed, the goals, the answers ---
    const { reach, apart } = goals(names);
    const added = permit('r20', 20, address[leftOut]);
    return {
      title: L(`${The(dev)} is refused`, `${dev.ja}が通してもらえない`),
      brief,
      topology,
      names,
      allowed: [{ kind: 'iface-acl', nodeId: 'r1', ifaceId, direction }],
      checks: [reach(leftOut, 'srv'), reach(listed, 'srv'), apart('guest', 'srv', 'acl')],
      hints: [
        L(
          `Open the list on ${the(rtr)} and read it line by line. Whose addresses are on it?`,
          `${rtr.ja}の一覧を開いて、1 行ずつ読んでください。どの機器のアドレスが書いてありますか。`,
        ),
        fault === 'mistyped'
          ? L(
              `A line lets through traffic whose sender has exactly that address. The line meant for ${the(dev)} says ${mistyped}, but its address is ${address[leftOut]}.`,
              `行は、送り主のアドレスがその行とぴったり同じ通信だけを通します。${dev.ja}のための行には「${mistyped}」とありますが、${dev.ja}のアドレスは「${address[leftOut]}」です。`,
            )
          : L(
              `A line lets through traffic whose sender has exactly that address. There is no line with the address of ${the(dev)} (${address[leftOut]}).`,
              `行は、送り主のアドレスがその行とぴったり同じ通信だけを通します。${dev.ja}のアドレス（${address[leftOut]}）が書かれた行がありません。`,
            ),
        L(
          `The list needs a line "permit, sender ${address[leftOut]}/32". Do not add a line that permits every sender.`,
          `一覧に「通す・送り主 ${address[leftOut]}/32」の行が必要です。「どの送り主も通す」という行は足しません。`,
        ),
      ],
      lessons: ['/simulation/acl'],
      reference: [acl([kept, added])],
      wrongAnswers: [
        // A line that lets every sender through: the outsider gets in too.
        [acl([...startRules, { id: 'r30', priority: 30, action: 'permit', protocol: 'any' }])],
        // Emptying the list: no list at all, so nothing is refused.
        [acl([])],
        // Replacing the old line instead of adding one: the first device is locked out.
        [acl([added])],
      ],
      fingerprint: [place.id, where, fault, leftOut],
    };
  },
);
