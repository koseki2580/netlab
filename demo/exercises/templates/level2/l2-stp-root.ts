/**
 * l2-stp-root — switches cabled in a loop; the wrong one is the centre of the
 * spanning tree. The brief says which switch should be; the learner sets the
 * priority numbers so that it is.
 *
 * Only priorities may be changed. No cable is ever taken down inside a loop
 * (engine fact 4).
 */

import { buildLoop } from '../shared/build';
import { defineTemplate, goals } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, PRESS_CHECK, say, the, The } from '../shared/text';
import type { SettingChange } from '../../model/types';

const priority = (nodeId: string, value: number): SettingChange => ({
  kind: 'stp-priority',
  nodeId,
  priority: value,
});

export const l2StpRoot = defineTemplate(
  {
    id: 'l2-stp-root',
    level: 2,
    kind: 'switch',
    title: L('Make a switch the root bridge', 'スイッチをルートブリッジにする'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(['triangle', 'square', 'tail']);
    const ids = shape === 'triangle' ? ['swa', 'swb', 'swc'] : ['swa', 'swb', 'swc', 'swd'];
    const targetIndex = draw.int(ids.length);
    const target = ids[targetIndex] ?? 'swa';
    const rival = ids[(targetIndex + 1 + draw.int(ids.length - 1)) % ids.length] ?? 'swb';
    // Another switch has a low number; another has 0; or the target has a high one.
    const fault = draw.pick(['rival-low', 'rival-zero', 'target-high']);

    // --- The fault ---
    const priorities: Record<string, number> =
      fault === 'rival-low'
        ? { [rival]: 4096 }
        : fault === 'rival-zero'
          ? { [rival]: 0 }
          : { [target]: 61440 };
    // The server hangs on the switch that should be the root; PCs on the others.
    const devices = ids.map((id, index) =>
      id === target ? place.server : (place.pcs[index % 3] ?? place.pcs[0]),
    );
    if (ids.length === 4 && targetIndex !== 3) devices[targetIndex === 0 ? 3 : 0] = place.newPc;
    const net = buildLoop(place, plan, shape, priorities, devices);

    // --- The brief ---
    const name = (id: string) => net.names[id] ?? place.switches[0];
    const sw = name(target);
    const { server } = place;
    const opening = scene(place, {
      home: L(
        `The switches in the house were cabled in a ring, so that one loose cable does not cut a room off.`,
        `ケーブルが 1 本抜けても部屋が切り離されないように、家のスイッチを輪につなぎました。`,
      ),
      shop: L(
        `The shop's switches are cabled in a ring, so that one broken cable does not stop the tills.`,
        `ケーブルが 1 本切れてもレジが止まらないように、お店のスイッチを輪につないであります。`,
      ),
      clinic: L(
        `The clinic's switches are cabled in a ring, so that one broken cable does not stop the exam rooms.`,
        `ケーブルが 1 本切れても診察が止まらないように、診療所のスイッチを輪につないであります。`,
      ),
      school: L(
        `The school's switches are cabled in a ring, so that one broken cable does not cut off a classroom.`,
        `ケーブルが 1 本切れても教室が切り離されないように、学校のスイッチを輪につないであります。`,
      ),
      office: L(
        `The office's switches are cabled in a ring, so that one broken cable does not cut off a floor.`,
        `ケーブルが 1 本切れてもフロアが切り離されないように、会社のスイッチを輪につないであります。`,
      ),
    });
    const brief = say(
      opening,
      L(
        `In a ring, spanning tree (STP) closes one link so that traffic cannot circle forever. It builds its tree around one switch, the root bridge: the switch with the lowest priority number.`,
        `輪になった配線では、スパニングツリー（STP）が線を 1 本止めて、通信が回り続けないようにします。そのとき中心になるスイッチをルートブリッジといい、優先度の数字がいちばん小さいスイッチが選ばれます。`,
      ),
      L(
        `${The(server)} is on ${the(sw)}, so that switch should be the root bridge. Right now another switch is. Change the priority numbers so that ${the(sw)} becomes the root bridge.`,
        `${server.ja}は${sw.ja}につながっているので、${sw.ja}を中心にしたいところです。ところが、いまは別のスイッチが中心になっています。優先度の数字を変えて、${sw.ja}がルートブリッジになるようにしてください。`,
      ),
      PRESS_CHECK,
    );

    // --- What may be changed, the goals, the answers ---
    const { reach } = goals(net.names);
    const hostOf = (id: string) => `h${id.slice(2)}`;
    const reference =
      fault === 'rival-low'
        ? [priority(target, 0)]
        : fault === 'rival-zero'
          ? [priority(rival, 32768), priority(target, 4096)]
          : [priority(target, 4096)];
    const wrongAnswers =
      fault === 'rival-low'
        ? // Lower than the default, but not lower than the rival.
          [[priority(target, 8192)], [priority(target, 61440)]]
        : fault === 'rival-zero'
          ? // Nothing is lower than 0: the rival has to be raised.
            [[priority(target, 4096)], [priority(rival, 4096), priority(target, 8192)]]
          : // "A bigger number is stronger", and "a little lower is enough".
            [[priority(target, 65535)], [priority(target, 49152)]];
    return {
      title: L(`${The(sw)} should be the root bridge`, `${sw.ja}を中心にする`),
      brief,
      topology: net.topology,
      names: net.names,
      allowed: ids.map((nodeId) => ({ kind: 'stp-priority', nodeId })),
      checks: [
        {
          id: 'root',
          kind: 'stp-root',
          nodeId: target,
          label: L(`${The(sw)} is the root bridge`, `${sw.ja}がルートブリッジになる`),
        },
        reach(hostOf(rival), hostOf(target)),
      ],
      hints: [
        L(
          `Compare the priority numbers of all the switches. Which one is lowest now?`,
          `全部のスイッチの優先度の数字を見くらべてください。いま、いちばん小さいのはどれですか。`,
        ),
        L(
          `The switch with the LOWEST number becomes the root bridge, not the highest. ${The(sw)} has to end up lower than every other switch.`,
          `ルートブリッジになるのは、数字がいちばん「小さい」スイッチです。大きいほうではありません。${sw.ja}の数字を、ほかのどのスイッチよりも小さくします。`,
        ),
        fault === 'rival-zero'
          ? L(
              `${The(name(rival))} has 0, and nothing is lower. Raise it to 32768, then set ${the(sw)} to 4096.`,
              `${name(rival).ja}の数字は 0 で、これより小さくはできません。${name(rival).ja}を 32768 に上げてから、${sw.ja}を 4096 にします。`,
            )
          : L(
              `Set the priority of ${the(sw)} to ${reference[0]?.kind === 'stp-priority' ? reference[0].priority : 0}.`,
              `${sw.ja}の優先度を ${reference[0]?.kind === 'stp-priority' ? reference[0].priority : 0} にします。`,
            ),
      ],
      lessons: ['/networking/stp'],
      reference,
      wrongAnswers,
      fingerprint: [place.id, shape, target, fault],
    };
  },
);
