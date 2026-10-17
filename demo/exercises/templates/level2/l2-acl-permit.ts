/**
 * l2-acl-permit — a router lets only listed devices through to a server. One
 * device that should be let through is not on the list (or is listed with a
 * mistyped address). The learner adds it, without opening the server to all.
 *
 * "Gets through" is judged by a tcp connection to the server's service, as the
 * story says, not by a ping: a line that allows ping alone opens nothing.
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
import { defineTemplate, type LabelledCheck } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, say, the, The, type Named } from '../shared/text';
import type { SettingChange } from '../../model/types';

const permit = (id: string, priority: number, address: string): AclRule => ({
  id,
  priority,
  action: 'permit',
  protocol: 'any',
  srcIp: `${address}/32`,
});

/** What the server is opened with: a tcp connection to this port. The brief says so, and the goals test it. */
const SERVICE_PORT = 80;

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
        `${The(rtr)} does this with an ACL: a list of lines, each saying which traffic to allow or to refuse.`,
        `${rtr.ja}は、これを ACL（通す通信・止める通信を 1 行ずつ書いた一覧）で行っています。`,
      ),
      L(
        `${The(server)} is opened with traffic of the kind tcp, to port number ${SERVICE_PORT}. (A port number says which service inside a device is meant. It is not a socket of a switch.)`,
        `${server.ja}を開くときの通信は、種類が tcp で、あて先のポート番号は ${SERVICE_PORT} 番です。（ポート番号は、機器の中の「どの窓口あてか」を表す数字です。スイッチの差し込み口（ポート）とは別のものです。）`,
      ),
      L(
        'One line is enough to stop everything else, because the list ends with a line you cannot see: "refuse the rest".',
        '行が 1 つあるだけで、ほかの通信がぜんぶ止まります。一覧の最後には、見えない『それ以外は止める』の行があるからです。',
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
    );

    // --- What may be changed, the goals, the answers ---
    // Judged with what the story is about: a tcp connection to the server's
    // service. A ping would be let through by a line for ping alone.
    const opens = (from: string): LabelledCheck => ({
      id: `reach-${from}-srv`,
      kind: 'reach',
      probe: { via: 'tcp', from, to: 'srv', dstPort: SERVICE_PORT },
      label: L(
        `${The(names[from] ?? dev)} can open the ${server.en} (tcp, port ${SERVICE_PORT})`,
        `${(names[from] ?? dev).ja}から${server.ja}を開ける（tcp・${SERVICE_PORT} 番）`,
      ),
    });
    const shut: LabelledCheck = {
      id: 'apart-guest-srv',
      kind: 'must-not-reach',
      probe: { via: 'tcp', from: 'guest', to: 'srv', dstPort: SERVICE_PORT },
      because: 'acl',
      label: L(
        `${The(guest)} cannot open the ${server.en} (tcp, port ${SERVICE_PORT})`,
        `${guest.ja}からは${server.ja}を開けない（tcp・${SERVICE_PORT} 番）`,
      ),
    };
    const added = permit('r20', 20, address[leftOut]);
    return {
      title: L(`${The(dev)} is refused`, `${dev.ja}が通してもらえない`),
      task: L(
        `Change the list (ACL) so that ${the(dev)} gets through. ${The(guest)} must still be refused.`,
        `一覧（ACL）を直して、${dev.ja}が通るようにしてください。${guest.ja}は、通してはいけません。`,
      ),
      rule: L(
        'Rule: read from the top; the first line that fits decides. What fits no line is refused. With no lines at all, everything passes.',
        'ルール：上から調べ、最初に当てはまった行で「通す・止める」が決まる。どの行にも当てはまらなければ止める。行が 1 つもなければ、すべて通す。',
      ),
      brief,
      topology,
      names,
      allowed: [{ kind: 'iface-acl', nodeId: 'r1', ifaceId, direction }],
      checks: [opens(leftOut), opens(listed), shut],
      hints: [
        L(
          `Open the list on ${the(rtr)} and read it line by line. Whose addresses are on it?`,
          `${rtr.ja}の一覧を開いて、1 行ずつ読んでください。どの機器のアドレスが書いてありますか。`,
        ),
        fault === 'mistyped'
          ? L(
              `A line fits only traffic whose sender has the address written on it ("/32" means: that one device). The line meant for ${the(dev)} says ${mistyped}, but its address is ${address[leftOut]}.`,
              `行が当てはまるのは、送り主のアドレスがその行と同じ通信だけです（「/32」は「その 1 台だけ」の意味）。${dev.ja}のための行には「${mistyped}」とありますが、${dev.ja}のアドレスは「${address[leftOut]}」です。`,
            )
          : L(
              `A line fits only traffic whose sender has the address written on it ("/32" means: that one device). There is no line with the address of ${the(dev)} (${address[leftOut]}).`,
              `行が当てはまるのは、送り主のアドレスがその行と同じ通信だけです（「/32」は「その 1 台だけ」の意味）。${dev.ja}のアドレス（${address[leftOut]}）が書かれた行がありません。`,
            ),
        L(
          `The list needs a line "allow, kind anything (or tcp), sender ${address[leftOut]}/32". Do not add a line that allows every sender.`,
          `一覧に「通す・種類 すべて（または tcp）・送り主 ${address[leftOut]}/32」の行が必要です。「どの送り主も通す」という行は足しません。`,
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
      // Lines for the right senders that let through another kind of traffic
      // than the server is opened with: ping alone, or udp alone.
      unsoundPasses: (['icmp', 'udp'] as const).map((protocol) => [
        acl([
          { ...kept, protocol },
          { ...added, protocol },
        ]),
      ]),
      fingerprint: [place.id, where, fault, leftOut],
    };
  },
);
