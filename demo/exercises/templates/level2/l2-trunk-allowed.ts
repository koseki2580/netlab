/**
 * l2-trunk-allowed — the link between two switches does not carry one of the
 * VLANs, so that group is cut in half. The learner lets the VLAN through.
 *
 * Only the trunk ports may be changed: no cable (a cut trunk gives the same
 * drop reason as isolation) and no address.
 */

import { buildVlan, withPort } from '../shared/build';
import { defineTemplate, formNames, goals } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, say, the, The } from '../shared/text';
import { access, groupOf, portRef, trunk, VLAN_PAIRS, vlanIntro } from '../shared/vlan';

export const l2TrunkAllowed = defineTemplate(
  {
    id: 'l2-trunk-allowed',
    level: 2,
    kind: 'switch',
    title: L('Let a VLAN across the link between switches', 'スイッチ間のケーブルに VLAN を通す'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(['two-trunk', 'three-trunk']);
    const vlans = draw.pick(VLAN_PAIRS);
    const net = buildVlan(place, plan, shape, vlans);
    // Which group is cut, on which link, and at which end of it (or both).
    const cut = draw.pick([0, 1]);
    const linkIndex = shape === 'three-trunk' ? draw.pick([0, 1]) : 0;
    const ends = draw.pick(['left', 'right', 'both']);

    // --- The fault: the trunk port lists only the other VLAN ---
    const kept = vlans[cut === 0 ? 1 : 0];
    const [left, right] = net.trunks.slice(linkIndex * 2, linkIndex * 2 + 2);
    if (!left || !right) throw new Error('a trunk shape has no trunk');
    const faulty = ends === 'both' ? [left, right] : ends === 'left' ? [left] : [right];
    const topology = faulty.reduce(
      (current, port) =>
        withPort(current, port.switchId, port.portId, { trunkAllowedVlans: [kept] }),
      net.topology,
    );

    // --- Who is who: the first and last member of each group sit at the two ends ---
    const name = (id: string) => net.names[id] ?? place.pcs[0];
    const ofCut = groupOf(net, cut);
    const ofKept = groupOf(net, cut === 0 ? 1 : 0);
    const [near, far] = [
      ofCut.find((m) => m.id.endsWith('1')),
      ofCut.find((m) => m.id.endsWith('2')),
    ];
    const [keptNear, keptFar] = [ofKept[0], ofKept[ofKept.length - 1]];
    if (!near || !far || !keptNear || !keptFar) throw new Error('a trunk shape lacks a pair');
    const group = place.groups[cut];
    const [swLeft, swRight] = [name(left.switchId), name(right.switchId)];
    const form = formNames(topology, net.names);

    // --- The brief ---
    const opening = scene(place, {
      home: L(
        `A second switch was put in so that devices in another room can be plugged in.`,
        `別の部屋の機器もつなげるように、スイッチを 1 台ふやしました。`,
      ),
      shop: L(
        `The shop grew, and its switches are now joined by one cable.`,
        `お店が広くなり、スイッチ同士を 1 本のケーブルでつないで使っています。`,
      ),
      clinic: L(
        `The clinic's rooms each have a switch, joined to the next by one cable.`,
        `診療所では、部屋ごとのスイッチを 1 本のケーブルでつないでいます。`,
      ),
      school: L(
        `The school's rooms each have a switch, joined to the next by one cable.`,
        `学校では、部屋ごとのスイッチを 1 本のケーブルでつないでいます。`,
      ),
      office: L(
        `Each floor of the office has a switch, joined to the next by one cable.`,
        `会社では、階ごとのスイッチを 1 本のケーブルでつないでいます。`,
      ),
    });
    const brief = say(
      opening,
      vlanIntro(place),
      L(
        `A cable between switches is a trunk: it carries several VLANs at once, but only the numbers on its list, at both ends. ${The(name(near.id))} cannot reach ${the(name(far.id))} on the other switch, although both are ${group.name.en} devices.`,
        `スイッチ同士をつなぐケーブルはトランクといい、複数の VLAN をまとめて運びます。ただし運ぶのは、両はしの一覧にある番号だけです。${name(near.id).ja}から、別のスイッチにある${name(far.id).ja}に届きません。どちらも${group.name.ja}の機器です。`,
      ),
      L(
        `Compare the VLAN numbers of the devices on the diagram with the lists of the trunk, and add the number that is missing. Keep the two groups apart.`,
        `図にある機器の VLAN 番号と、トランクの一覧を見くらべて、足りない番号を足してください。2 つのグループは分けたままにします。`,
      ),
    );

    // --- What may be changed, the goals, the answers ---
    const { reach, apart } = goals(net.names);
    return {
      title: L(
        `The ${group.name.en} VLAN stops at a switch`,
        `${group.name.ja}の VLAN がスイッチで止まる`,
      ),
      task: L(
        'Add the missing VLAN number to the list of the cable between the switches (the trunk).',
        'スイッチ同士をつなぐケーブル（トランク）の一覧に、足りない VLAN 番号を足してください。',
      ),
      rule: L(
        'Rule: a trunk carries only the VLAN numbers that are on the list at BOTH of its ends.',
        'ルール：トランクは、両はしの一覧にある VLAN 番号だけを通す。',
      ),
      brief,
      topology,
      names: net.names,
      allowed: net.trunks.map(portRef),
      checks: [
        reach(near.id, far.id),
        reach(keptNear.id, keptFar.id),
        apart(near.id, keptFar.id, 'vlan'),
      ],
      hints: [
        L(
          `Look at the list of allowed VLANs at both ends of each cable between switches.`,
          `スイッチ同士をつなぐケーブルの両はしで、通してよい VLAN の一覧を見てください。`,
        ),
        L(
          `A VLAN crosses a trunk only if BOTH ends list it. VLAN ${vlans[cut]} is missing between ${the(swLeft)} and ${the(swRight)}.`,
          `VLAN は、トランクの両はしの一覧にあるときだけ通ります。${swLeft.ja}と${swRight.ja}のあいだで、VLAN ${vlans[cut]} が足りません。`,
        ),
        L(
          `Add VLAN ${vlans[cut]} to the list on ${faulty.map((port) => `${form.port(port.switchId, port.portId).en} of ${the(name(port.switchId))}`).join(' and ')}. Leave VLAN ${kept} on it.`,
          `${faulty.map((port) => `${name(port.switchId).ja}の「${form.port(port.switchId, port.portId).ja}」`).join('と、')}の一覧に、VLAN ${vlans[cut]} を足します。VLAN ${kept} は残します。`,
        ),
      ],
      lessons: ['/networking/vlan'],
      reference: faulty.map((port) => trunk(port, vlans)),
      wrongAnswers: [
        // Swapping one VLAN for the other: now the other group is cut.
        [left, right].map((port) => trunk(port, [vlans[cut]])),
      ],
      unsoundPasses: [
        // The link made a socket for the cut group alone, at both ends or at one.
        [left, right].map((port) => access(port, vlans[cut])),
        faulty.map((port) => access(port, vlans[cut])),
        [left, right].map((port) => access(port, 1)),
      ],
      fingerprint: [place.id, shape, `group${cut}`, `link${linkIndex}`, ends],
    };
  },
);
