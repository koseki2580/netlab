/**
 * l2-vlan-separate — two groups share the switches and every port is in one
 * VLAN, so each group sees the other. The learner splits them in two.
 */

import { buildVlan, withPort } from '../shared/build';
import { defineTemplate, goals } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, listOf, PRESS_CHECK, say } from '../shared/text';
import { access, groupOf, portRef, VLAN_PAIRS } from '../shared/vlan';

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
        `Right now every socket is in VLAN ${shared} (a VLAN is a separate network inside a switch), so everything reaches everything.`,
        `いまは、どの差し込み口も VLAN ${shared} です（VLAN は、スイッチの中を分ける仕切りです）。そのため、どの機器からもどの機器にも届きます。`,
      ),
      L(
        `Put the ${groupA.name.en} devices (${membersA.en}) in VLAN ${vlans[0]} and the ${groupB.name.en} devices (${membersB.en}) in VLAN ${vlans[1]}. Inside a group everything must still work.`,
        `${groupA.name.ja}の機器（${membersA.ja}）を VLAN ${vlans[0]}、${groupB.name.ja}の機器（${membersB.ja}）を VLAN ${vlans[1]} に分けてください。同じグループの中では、これまでどおり届くようにします。`,
      ),
      PRESS_CHECK,
    );

    // --- What may be changed, the goals, the answers ---
    const { reach, apart } = goals(net.names);
    const firstB = groupOf(net, 1)[0];
    return {
      title: L(
        `Keep ${groupA.name.en} and ${groupB.name.en} apart`,
        `${groupA.name.ja}と${groupB.name.ja}を分ける`,
      ),
      brief,
      topology,
      names: net.names,
      allowed: net.members.map(portRef),
      checks: [
        reach(a1.id, a2.id),
        reach(b1.id, b2.id),
        apart(a1.id, b1.id, 'vlan'),
        apart(b2.id, a2.id, 'vlan'),
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
      fingerprint: [place.id, shape, startIn],
    };
  },
);
