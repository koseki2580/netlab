/**
 * l2-vlan-access — one device sits on a port in the wrong VLAN, so it cannot
 * reach its own group. The learner puts that port back, without merging the
 * two groups.
 *
 * VLAN isolation is judged by the drop reason, so neither cables nor addresses
 * may be changed here.
 */

import { buildVlan, withPort } from '../shared/build';
import { defineTemplate, formNames, goals } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, PRESS_CHECK, say, the, The } from '../shared/text';
import { access, groupOf, portRef, VLAN_PAIRS, vlanIntro } from '../shared/vlan';

export const l2VlanAccess = defineTemplate(
  {
    id: 'l2-vlan-access',
    level: 2,
    kind: 'switch',
    title: L('Put a port in the right VLAN', '差し込み口を正しい VLAN に入れる'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(['one-2-2', 'one-3-2', 'two-trunk']);
    const vlans = draw.pick(VLAN_PAIRS);
    const net = buildVlan(place, plan, shape, vlans);
    const victim = net.members[draw.int(net.members.length)] ?? net.members[0];
    if (!victim) throw new Error('a VLAN shape has no members');
    // In the other group's VLAN, or left in VLAN 1 where nobody is.
    const fault = draw.pick(['other-group', 'unused']);

    // --- The fault ---
    const ownVlan = vlans[victim.group];
    const otherGroup = victim.group === 0 ? 1 : 0;
    const wrongVlan = fault === 'other-group' ? vlans[otherGroup] : 1;
    const topology = withPort(net.topology, victim.switchId, victim.portId, {
      accessVlan: wrongVlan,
    });

    // --- Who is who ---
    const mate = groupOf(net, victim.group).find((member) => member.id !== victim.id);
    const [outsider, outsider2] = groupOf(net, otherGroup);
    if (!mate || !outsider || !outsider2) throw new Error('a VLAN shape lacks a pair');
    const name = (id: string) => net.names[id] ?? place.pcs[0];
    const dev = name(victim.id);
    const group = place.groups[victim.group];
    const sw = name(victim.switchId);
    const port = formNames(topology, net.names).port(victim.switchId, victim.portId);

    // --- The brief ---
    const opening = scene(place, {
      home: L(
        `${The(dev)} was unplugged while tidying and plugged back into a different socket of the switch.`,
        `片づけのときに${dev.ja}のケーブルを抜いて、スイッチの別の差し込み口につなぎ直しました。`,
      ),
      shop: L(
        `${The(dev)} was moved to another counter and plugged into a different socket of the switch.`,
        `${dev.ja}を別のカウンターに移して、スイッチの別の差し込み口につなぎました。`,
      ),
      clinic: L(
        `${The(dev)} was moved to another room and plugged into a different socket of the switch.`,
        `${dev.ja}を別の部屋に移して、スイッチの別の差し込み口につなぎました。`,
      ),
      school: L(
        `${The(dev)} was moved for the new term and plugged into a different socket of the switch.`,
        `新学期の席替えで${dev.ja}を移して、スイッチの別の差し込み口につなぎました。`,
      ),
      office: L(
        `${The(dev)} was moved in a desk change and plugged into a different socket of the switch.`,
        `席替えで${dev.ja}を移して、スイッチの別の差し込み口につなぎました。`,
      ),
    });
    const brief = say(
      vlanIntro(place),
      opening,
      L(
        `Since then ${the(dev)} alone cannot reach ${the(name(mate.id))}, which is in its own group (${group.name.en}).`,
        `それから、${dev.ja}だけ、同じグループ（${group.name.ja}）の${name(mate.id).ja}に届きません。`,
      ),
      L(
        `Compare the VLAN numbers of the sockets and fix the one that is different. Keep the two groups apart.`,
        `差し込み口の VLAN 番号を見くらべて、ちがっている 1 つを直してください。2 つのグループは分けたままにします。`,
      ),
      PRESS_CHECK,
    );

    // --- What may be changed, the goals, the answers ---
    const { reach, apart } = goals(net.names);
    return {
      title: L(`${The(dev)} is in the wrong VLAN`, `${dev.ja}の VLAN がちがう`),
      brief,
      topology,
      names: net.names,
      allowed: net.members.map(portRef),
      checks: [
        reach(victim.id, mate.id),
        reach(outsider.id, outsider2.id),
        apart(victim.id, outsider.id, 'vlan'),
      ],
      hints: [
        L(
          `Look at the VLAN number of each socket on ${the(sw)}, and find the one ${the(dev)} is plugged into: ${port.en}.`,
          `${sw.ja}の差し込み口ごとの VLAN 番号を見て、${dev.ja}がつながっている「${port.ja}」を探してください。`,
        ),
        L(
          `A switch only passes traffic between sockets with the same VLAN number. The socket of ${the(name(mate.id))} is in VLAN ${ownVlan}; the socket of ${the(dev)} is in VLAN ${wrongVlan}.`,
          `スイッチは、VLAN 番号が同じ差し込み口どうしでしか通信を運びません。${name(mate.id).ja}の差し込み口は VLAN ${ownVlan} ですが、${dev.ja}の差し込み口は VLAN ${wrongVlan} になっています。`,
        ),
        L(
          `Set ${port.en} of ${the(sw)} to VLAN ${ownVlan}.`,
          `${sw.ja}の「${port.ja}」を VLAN ${ownVlan} にします。`,
        ),
      ],
      lessons: ['/networking/vlan'],
      reference: [access(victim, ownVlan)],
      wrongAnswers: [
        // Everything in one VLAN: it reaches its group, and everyone else too.
        net.members.map((member) => access(member, ownVlan)),
        // Moving the colleague into the wrong VLAN as well.
        [access(victim, vlans[otherGroup]), access(mate, vlans[otherGroup])],
      ],
      fingerprint: [place.id, shape, victim.id, fault],
    };
  },
);
