/**
 * l2-vlan-separate — two groups share the switches and every port is in one
 * VLAN, so each group sees the other. The learner splits them in two.
 *
 * The brief does not say which numbers to use. On one switch any two numbers
 * work. Across two switches the numbers must be ones the link between them
 * carries, so there the two ends of that link are in the form too: the learner
 * reads its list (and may change it; any configuration that works passes).
 */

import { buildVlan, withPort } from '../shared/build';
import { defineTemplate, goals } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, listOf, say } from '../shared/text';
import { access, groupOf, portRef, trunk, VLAN_PAIRS, RULE_VLAN } from '../shared/vlan';

/** Each member with the next: [a1, a2], [a2, a3]. */
const inTurn = <T>(members: readonly T[]): [T, T][] =>
  members.slice(1).map((member, index) => [members[index] as T, member]);

export const l2VlanSeparate = defineTemplate(
  {
    id: 'l2-vlan-separate',
    level: 2,
    kind: 'switch',
    title: L('Split two groups with VLANs', 'VLAN で 2 つのグループに分ける'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(['one-2-2', 'one-3-2', 'two-trunk']);
    const vlans = draw.pick(VLAN_PAIRS);
    const net = buildVlan(place, plan, shape, vlans);
    // Where everything starts: in the first group's VLAN, or in VLAN 1 as shipped.
    const startIn = draw.pick(['first-group', 'factory']);

    // --- The fault: every port in one VLAN ---
    const shared = startIn === 'first-group' ? vlans[0] : 1;
    const topology = net.members.reduce(
      (current, member) =>
        withPort(current, member.switchId, member.portId, { accessVlan: shared }),
      net.topology,
    );

    // --- The brief ---
    const [groupA, groupB] = place.groups;
    const [a1, a2] = groupOf(net, 0);
    const [b1, b2] = groupOf(net, 1);
    if (!a1 || !a2 || !b1 || !b2) throw new Error('a VLAN shape lacks a pair');
    const name = (id: string) => net.names[id] ?? place.pcs[0];
    const membersA = listOf(groupOf(net, 0).map((member) => name(member.id)));
    const membersB = listOf(groupOf(net, 1).map((member) => name(member.id)));
    const opening = scene(place, {
      home: L(
        `Someone now works from home, and the work devices must not be open to the family's devices.`,
        `家で仕事をするようになりました。仕事用の機器は、家族の機器から見えないようにしなければなりません。`,
      ),
      shop: L(
        `The auditor says the back-office PCs must not be reachable from the devices on the shop floor.`,
        `監査で、「売り場の機器から事務のパソコンに届いてはいけない」と言われました。`,
      ),
      clinic: L(
        `The devices in the waiting room are used by patients. They must not be able to reach the PCs of the medical staff.`,
        `待合室の機器は患者さんが使います。そこから診療用のパソコンに届いてはいけません。`,
      ),
      school: L(
        `A pupil's PC was found browsing a teacher's PC. The pupils' PCs must not be able to reach the teachers' PCs.`,
        `生徒用のパソコンから先生のパソコンの中が見えていました。生徒用のパソコンから先生のパソコンに届いてはいけません。`,
      ),
      office: L(
        `The accounts PCs hold salaries. The sales PCs must not be able to reach them.`,
        `経理のパソコンには給与のデータがあります。営業のパソコンから届いてはいけません。`,
      ),
    });
    const brief = say(
      opening,
      L(
        `A switch can be divided with VLANs (a VLAN is a separate network inside a switch): every socket has a VLAN number, and only sockets with the same number can reach each other. Right now every socket has the same number, so everything reaches everything.`,
        `スイッチの中は、VLAN（スイッチの中を分ける仕切り）で分けられます。差し込み口ごとに VLAN 番号があり、同じ番号の差し込み口どうしだけが届きます。いまは、どの差し込み口も同じ番号なので、どの機器からもどの機器にも届きます。`,
      ),
      L(
        `Give the ${groupA.name.en} devices (${membersA.en}) one VLAN number and the ${groupB.name.en} devices (${membersB.en}) another. Inside a group everything must still work.`,
        `${groupA.name.ja}の機器（${membersA.ja}）と、${groupB.name.ja}の機器（${membersB.ja}）が、別々の VLAN 番号になるように分けてください。同じグループの中では、これまでどおり届くようにします。`,
      ),
      net.trunks.length > 0
        ? L(
            `The cable between the two switches carries only the VLAN numbers on its list, so use numbers that are on it.`,
            `スイッチ同士をつなぐケーブルは、一覧にある VLAN 番号だけを通します。その一覧にある番号を使ってください。`,
          )
        : null,
    );

    // --- What may be changed, the goals, the answers ---
    const { reach, apart } = goals(net.names);
    const firstB = groupOf(net, 1)[0];
    const groupA0 = groupOf(net, 0);
    const aLast = groupA0[groupA0.length - 1] ?? a2;
    return {
      title: L(
        `Keep ${groupA.name.en} and ${groupB.name.en} apart`,
        `${groupA.name.ja}と${groupB.name.ja}を分ける`,
      ),
      task: L(
        `Give the ${groupA.name.en} devices and the ${groupB.name.en} devices different VLAN numbers.`,
        `${groupA.name.ja}の機器と${groupB.name.ja}の機器を、別々の VLAN 番号に分けてください。`,
      ),
      rule:
        net.trunks.length > 0
          ? L(
              `${RULE_VLAN.en} Use numbers that are on the list of the cable between the switches.`,
              `${RULE_VLAN.ja}番号は、スイッチ同士をつなぐケーブルの一覧にあるものを使う。`,
            )
          : RULE_VLAN,
      brief,
      topology,
      names: net.names,
      allowed: [...net.members, ...net.trunks].map(portRef),
      // Every device is in a goal: one left behind in the old number is cut
      // off from its group, and that must not pass.
      checks: [
        ...inTurn(groupOf(net, 0)).map(([left, right]) => reach(left.id, right.id)),
        ...inTurn(groupOf(net, 1)).map(([left, right]) => reach(left.id, right.id)),
        apart(a1.id, b1.id, 'vlan'),
        apart(b2.id, aLast.id, 'vlan'),
      ],
      hints: [
        L(
          `For each socket, look at which device is plugged into it and which group that device belongs to.`,
          `差し込み口ごとに、どの機器がつながっているか、その機器がどちらのグループかを見てください。`,
        ),
        L(
          `A switch only passes traffic between sockets with the same VLAN number. Give one number to every socket of one group, and another number to every socket of the other.`,
          `スイッチは、VLAN 番号が同じ差し込み口どうしでしか通信を運びません。片方のグループの差し込み口は全部同じ番号に、もう片方は全部別の番号にします。`,
        ),
        L(
          `Set the sockets of ${name(a1.id).en} and its group to VLAN ${vlans[0]}, and the sockets of ${name(b1.id).en} and its group to VLAN ${vlans[1]}.`,
          `${name(a1.id).ja}など${groupA.name.ja}の差し込み口を VLAN ${vlans[0]} に、${name(b1.id).ja}など${groupB.name.ja}の差し込み口を VLAN ${vlans[1]} にします。`,
        ),
      ],
      lessons: ['/networking/vlan'],
      reference: net.members.map((member) => access(member, vlans[member.group])),
      wrongAnswers: [
        // Moving everything to the other number: still one VLAN.
        net.members.map((member) => access(member, vlans[1])),
        // Moving only one device of the second group: it is cut off from its own group.
        firstB ? [access(firstB, vlans[1])] : [],
      ],
      unsoundPasses: [
        // Two of the first group moved and the third left behind, cut off from them.
        ...(groupA0.length > 2 ? [[a1, a2].map((member) => access(member, vlans[1]))] : []),
        // The second group "split off" by turning its sockets into trunks.
        groupOf(net, 1).map((member) => trunk(member, [vlans[1]])),
        [trunk(a1, [vlans[0]]), trunk(a2, [vlans[0]])],
      ],
      fingerprint: [place.id, shape, startIn],
    };
  },
);
