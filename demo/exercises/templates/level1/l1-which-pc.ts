/**
 * l1-which-pc — one of three PCs has a bad address, and the brief does not say
 * which. The learner compares the three, finds the odd one and changes only it.
 */

import { buildLan } from '../shared/build';
import { evenPlace } from '../shared/draw';
import { defineTemplate } from '../shared/exercise';
import {
  addressOf,
  broken,
  everyoneReaches,
  freeAddressOn,
  SAME_START_RULE,
  setIp,
} from '../shared/lan';
import { drawPlace, scene } from '../shared/places';
import { drawPlan, net24 } from '../shared/plans';
import { L, say, the } from '../shared/text';

export const l1WhichPc = defineTemplate(
  {
    id: 'l1-which-pc',
    level: 1,
    kind: 'diagnose-repair',
    title: L('Find the device with the wrong address', 'アドレスがおかしい機器を見つける'),
  },
  (draw, seed) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    // Only the shapes where any of the three can carry the fault (see
    // `LanNet.faultable`): the question is "which one", so each of the three
    // must be the answer equally often, the first on the diagram included.
    const shape = draw.pick(['one-switch', 'server-switch']);
    const lan = buildLan(place, plan, shape);
    const index = evenPlace(seed, lan.pcs.length, 4);
    const device = lan.pcs[index] ?? 'pc1';
    // Another network altogether; one number off; or the same address as the next PC.
    const fault = draw.pick(['stranger', 'near-miss', 'duplicate']);

    // --- The fault ---
    const [first, second, third] = plan.near.starts.split('.');
    const last = plan.pcs[index] ?? 9;
    const twin = lan.pcs[(index + 1) % 3] ?? 'pc2';
    const wrongAddress =
      fault === 'stranger'
        ? plan.stranger.at(last)
        : fault === 'near-miss'
          ? net24(`${first}.${second}.${Number(third) + 1}`).at(last)
          : addressOf(lan, twin);
    const topology = broken(lan.topology, setIp(device, wrongAddress));

    // --- The brief ---
    const dev = lan.names[device] ?? place.pcs[0];
    const { server } = place;
    const opening = scene(place, {
      home: L(
        `Everyone in the house set up their own device. Now not all of them can open the photos on ${the(server)}.`,
        `家族がそれぞれ、自分の機器を設定しました。ところが、${server.ja}の写真が見られない機器があります。`,
      ),
      shop: L(
        `Three devices were set up in a hurry before the sale. Not all of them can use ${the(server)}.`,
        `セールの前に、3 台の機器を急いで設定しました。ところが、${server.ja}が使えない機器があります。`,
      ),
      clinic: L(
        `Three PCs were set up again after a power cut. Not all of them can open ${the(server)}.`,
        `停電のあと、3 台のパソコンを設定し直しました。ところが、${server.ja}が開けないパソコンがあります。`,
      ),
      school: L(
        `Three PCs were set up for the new term. Not all of them can open ${the(server)}.`,
        `新学期にそなえて、3 台のパソコンを設定しました。ところが、${server.ja}が開けないパソコンがあります。`,
      ),
      office: L(
        `Three PCs were set up for a new team. Not all of them can use ${the(server)}.`,
        `新しいチームのために、3 台のパソコンを設定しました。ところが、${server.ja}が使えないパソコンがあります。`,
      ),
    });
    const brief = say(
      opening,
      L(
        'One of the three has an address that was typed wrongly.',
        '3 台のうち 1 台は、アドレスの入れまちがいです。',
      ),
    );

    // --- What may be changed, the goals, the answers ---
    const right = plan.near.at(plan.free);
    const healthy = lan.pcs[(index + 2) % 3] ?? 'pc3';
    return {
      title: L('One of three is wrong', '3 台のうち 1 台がおかしい'),
      task: L(
        'One of the three has a wrong address. Find which one, and fix only that one.',
        '3 台のうち、アドレスがおかしい 1 台を見つけて、その 1 台だけを直してください。',
      ),
      rule: L(
        'Rule: devices on the same side share their first three numbers; the last number is different for each.',
        'ルール：同じ側の機器は、はじめの 3 つの数字が同じ。最後の数字は、1 台ずつちがう。',
      ),
      brief,
      topology,
      names: lan.names,
      allowed: lan.pcs.map((nodeId) => ({ kind: 'host-ip', nodeId })),
      checks: [
        ...everyoneReaches(lan, lan.names),
        {
          id: 'one-change',
          kind: 'max-changes',
          max: 1,
          label: L('Only one address was changed', '変えたアドレスは 1 つだけ'),
        },
      ],
      hints: [
        L(
          'Put the three addresses side by side and compare them number by number.',
          '3 台のアドレスを並べて、数字を 1 つずつ見くらべてください。',
        ),
        SAME_START_RULE(plan.near),
        L(
          `Change the address of ${the(dev)} to ${freeAddressOn(plan.near).en}.`,
          `${dev.ja}のアドレスを、${freeAddressOn(plan.near).ja}に変えます。`,
        ),
      ],
      lessons: ['/course', '/learning/subnetting'],
      reference: [setIp(device, right)],
      wrongAnswers: [
        // Changing a PC that was fine: the bad one is still bad.
        [setIp(healthy, plan.near.at(plan.free))],
        // Changing the right PC, but to the address of another one.
        [setIp(device, addressOf(lan, healthy))],
      ],
      // Two devices with one address: either of the two is right to point at.
      pickFirst: { faulty: fault === 'duplicate' ? [device, twin] : [device] },
      fingerprint: [place.id, shape, device, fault],
    };
  },
);
