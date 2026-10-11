/**
 * l2-choose-root — switches in a loop; spanning tree closes one link, and which
 * one depends on the root bridge. Two rooms both talk to a server; the learner
 * chooses which switch should be the root so that neither goes the long way
 * round, and the simulator shows the path.
 *
 * Where l2-stp-root says which switch and asks how, this asks which.
 */

import { buildLoop } from '../shared/build';
import { placedEvenly } from '../shared/draw';
import { defineTemplate, goals, type LabelledCheck } from '../shared/exercise';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, say, the, The } from '../shared/text';
import type { DesignOption, SettingChange } from '../../model/types';

const priority = (nodeId: string, value: number): SettingChange => ({
  kind: 'stp-priority',
  nodeId,
  priority: value,
});

export const l2ChooseRoot = defineTemplate(
  {
    id: 'l2-choose-root',
    level: 2,
    kind: 'choose-design',
    title: L('Choose the root bridge', 'ルートブリッジを選ぶ'),
  },
  (draw, seed) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(['triangle', 'tail']);
    const ring = ['swa', 'swb', 'swc'] as const;
    // The switch the server's traffic passes: in `tail` the server hangs off swc on swd.
    const hub = shape === 'tail' ? 'swc' : draw.pick(ring);
    const spokes = ring.filter((id) => id !== hub);
    const startRoot = draw.pick([0, 1]) === 0 ? spokes[0] : spokes[1];
    if (!startRoot) throw new Error('a ring has two spokes');

    // --- The network: the wrong switch is the root ---
    const serverSwitch = shape === 'tail' ? 'swd' : hub;
    const ids = shape === 'tail' ? [...ring, 'swd'] : [...ring];
    const devices = ids.map((id, index) =>
      id === serverSwitch
        ? place.server
        : id === hub
          ? place.newPc
          : (place.pcs[index % 3] ?? place.pcs[0]),
    );
    const net = buildLoop(place, plan, shape, { [startRoot]: 4096 }, devices);
    const name = (id: string) => net.names[id] ?? place.switches[0];
    const hostOf = (id: string) => `h${id.slice(2)}`;
    const srv = hostOf(serverSwitch);

    // --- The brief ---
    const [spokeA, spokeB] = spokes;
    if (!spokeA || !spokeB) throw new Error('a ring has two spokes');
    const { server } = place;
    const opening = scene(place, {
      home: L(
        `Three switches in the house are cabled in a ring.`,
        `家の 3 台のスイッチを、輪になるようにつないであります。`,
      ),
      shop: L(
        `Three switches in the shop are cabled in a ring.`,
        `お店の 3 台のスイッチを、輪になるようにつないであります。`,
      ),
      clinic: L(
        `Three switches in the clinic are cabled in a ring.`,
        `診療所の 3 台のスイッチを、輪になるようにつないであります。`,
      ),
      school: L(
        `Three switches in the school are cabled in a ring.`,
        `学校の 3 台のスイッチを、輪になるようにつないであります。`,
      ),
      office: L(
        `Three switches in the office are cabled in a ring.`,
        `会社の 3 台のスイッチを、輪になるようにつないであります。`,
      ),
    });
    const brief = say(
      opening,
      L(
        `Spanning tree (STP) closes one link of a ring so that traffic cannot circle forever. Which link depends on the root bridge, the switch the tree is built around: the one with the lowest priority number.`,
        `輪になった配線では、スパニングツリー（STP）がケーブルを 1 本止めて、通信が回り続けないようにします。どのケーブルが止まるかは、中心になるスイッチ（ルートブリッジ。優先度の数字がいちばん小さいスイッチ）で決まります。`,
      ),
      L(
        `The devices on ${the(name(spokeA))} and on ${the(name(spokeB))} both use ${the(server)} all day. Right now ${the(name(startRoot))} is the root bridge, and one of them reaches ${the(server)} the long way round.`,
        `${name(spokeA).ja}の機器も${name(spokeB).ja}の機器も、一日中${server.ja}を使います。いまは${name(startRoot).ja}が中心で、片方は遠回りをして${server.ja}に届いています。`,
      ),
      L(
        `Which setting lets both take the direct link?`,
        `どちらも直接のケーブルを通るようにするには、どの設定にしますか。`,
      ),
    );

    // --- The options: one priority setting each ---
    const rootOption = (id: string): DesignOption => ({
      id: `root-${id}`,
      label: L(
        `Make ${the(name(id))} the root bridge (priority 0)`,
        `${name(id).ja}を中心にする（優先度 0）`,
      ),
      changes: [priority(id, 0)],
      explain:
        id === hub || id === serverSwitch
          ? L(
              `Every switch keeps its shortest way to the root open. With the root where the server's traffic goes, both rooms' direct links stay open and the link between the two rooms is the one that closes.`,
              `どのスイッチも、中心へのいちばん近い道は開けたままにします。${server.ja}への通信が集まる場所を中心にすれば、2 つの部屋の直接のケーブルはどちらも開いたままで、止まるのは部屋どうしをつなぐケーブルになります。`,
            )
          : L(
              `With ${the(name(id))} as root, the other two switches each keep their link to it open, and the link between those two closes. That is the direct link of the other room, which now goes round through ${the(name(id))}.`,
              `${name(id).ja}を中心にすると、ほかの 2 台はそれぞれ${name(id).ja}へのケーブルを開けたままにして、その 2 台のあいだのケーブルが止まります。それはもう片方の部屋の直接のケーブルなので、そちらは${name(id).ja}を回る遠回りになります。`,
            ),
    });
    const bigNumber: DesignOption = {
      id: 'hub-high',
      label: L(
        `Give ${the(name(hub))} the highest priority number (61440)`,
        `${name(hub).ja}の優先度を、いちばん大きい数字（61440）にする`,
      ),
      changes: [priority(hub, 61440)],
      explain: L(
        `The LOWEST number wins, not the highest. ${The(name(startRoot))} still has the lowest number and stays the root, so nothing changes.`,
        `選ばれるのは、数字がいちばん「小さい」スイッチです。${name(startRoot).ja}の数字がいちばん小さいままなので、中心は変わらず、何も変わりません。`,
      ),
    };
    const byRoot = ids.map(rootOption);
    const best = byRoot.find((option) => option.id === `root-${hub}`);
    if (!best) throw new Error('the hub is one of the switches');
    // The setting this exercise is after stands in each place equally often.
    const options = placedEvenly(draw, seed, 1, best, [
      ...byRoot.filter((option) => option !== best),
      bigNumber,
    ]);

    // --- The goals: both rooms reach the server over their direct link ---
    const { reach } = goals(net.names);
    const direct = (spoke: string): LabelledCheck => ({
      id: `direct-${spoke}`,
      kind: 'path-via',
      probe: { via: 'ping', from: hostOf(spoke), to: srv },
      edgeId: net.cable(spoke, hub) ?? '',
      label: L(
        `Traffic from ${the(name(spoke))} takes the direct link to ${the(name(hub))}`,
        `${name(spoke).ja}からの通信が、${name(hub).ja}への直接のケーブルを通る`,
      ),
    });
    const reference = best.changes;
    return {
      title: L(`Both rooms use ${the(server)}`, `2 つの部屋が${server.ja}を使う`),
      task: L(
        `Choose the setting that lets both rooms reach ${the(server)} by their direct cable.`,
        `どちらの部屋からも${server.ja}へ近道で届くように、設定を 1 つ選んでください。`,
      ),
      rule: L(
        'Rule: the switch with the lowest priority number becomes the root bridge. Every switch keeps its shortest way to the root bridge open.',
        'ルール：優先度の数字がいちばん小さいスイッチが、ルートブリッジ（中心）になる。中心へのいちばん近い道は、止まらない。',
      ),
      brief,
      topology: net.topology,
      names: net.names,
      allowed: ids.map((nodeId) => ({ kind: 'stp-priority', nodeId })),
      options,
      checks: [
        reach(hostOf(spokeA), srv),
        direct(spokeA),
        reach(hostOf(spokeB), srv),
        direct(spokeB),
      ],
      hints: [
        L(
          `Find the link that is closed now, and see whose way to ${the(server)} it was.`,
          `いま止まっているケーブルを探して、それがだれの${server.ja}への道だったかを見てください。`,
        ),
        L(
          `The links that touch the root bridge are never closed. The link that closes is one between two switches that are NOT the root.`,
          `ルートブリッジにつながるケーブルは、止まりません。止まるのは、ルートブリッジではない 2 台のあいだのケーブルです。`,
        ),
        L(
          `Both direct links end at ${the(name(hub))}. Make that switch the root bridge.`,
          `2 本の直接のケーブルは、どちらも${name(hub).ja}につながっています。そのスイッチをルートブリッジにします。`,
        ),
      ],
      lessons: ['/networking/stp'],
      reference,
      fingerprint: [place.id, shape, hub, startRoot],
    };
  },
);
