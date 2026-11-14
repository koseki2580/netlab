/**
 * l1-cable-off — one cable is unplugged. The brief gives the symptom (who
 * cannot reach the server), not the cable; the learner finds it on the picture
 * and plugs it back in.
 *
 * A second cable is out on purpose: a PC not in use this week (the brief says
 * so). The picture and the list show two cables out, so neither gives the
 * answer away; the symptom says which one matters, and plugging both in is
 * one change too many (persona run 2: one ✕ in the list was the answer).
 *
 * No loop anywhere in these shapes, so a cable that is down behaves as one
 * (engine fact 4 is about loops).
 */

import { buildLan, LAN_SHAPES, withLinkState } from '../shared/build';
import { defineTemplate } from '../shared/exercise';
import { endsOf, everyoneReaches } from '../shared/lan';
import { drawPlace, scene } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, listOf, say, the } from '../shared/text';

export const l1CableOff = defineTemplate(
  {
    id: 'l1-cable-off',
    level: 1,
    kind: 'diagnose-repair',
    title: L('Find the unplugged cable', 'ぬけたケーブルを見つける'),
  },
  (draw) => {
    // --- Drawn from the seed ---
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(LAN_SHAPES);
    const lan = buildLan(place, plan, shape);
    const pc = draw.pick(lan.pcs);
    // Which cable: the PC's own, one every PC shares, or the server's.
    const where = draw.pick(['own', 'shared', 'server']);
    // The PC put away, its cable out on purpose: never the one cut off.
    // At least two PCs are left: one is left out only when it is the one cut off.
    const spare = draw.pick(
      lan.pcs.filter((id) => where !== 'own' || id !== pc) as [string, ...string[]],
    );

    // --- The fault ---
    const cable =
      where === 'own'
        ? (lan.cableOf[pc] ?? 'e-pc1')
        : where === 'server'
          ? 'e-srv'
          : // Where there are two switches, either of the cables every PC's traffic crosses.
            shape === 'two-switches'
            ? draw.pick(['e-sw', lan.uplink])
            : shape === 'server-switch'
              ? draw.pick([lan.uplink, 'e-far'])
              : lan.uplink;
    const spareCable = lan.cableOf[spare] ?? 'e-pc3';
    const topology = withLinkState(withLinkState(lan.topology, cable, 'down'), spareCable, 'down');

    // --- The brief: who notices ---
    const srv = place.server;
    const inUse = lan.pcs.filter((id) => id !== spare);
    const cutOff: readonly string[] = (
      cable === 'e-sw' ? ['pc1', 'pc2'] : where === 'own' ? [pc] : lan.pcs
    ).filter((id) => id !== spare);
    const cutOffNames = cutOff.flatMap((id) => lan.names[id] ?? []);
    const stillFine = inUse.flatMap((id) => (cutOff.includes(id) ? [] : (lan.names[id] ?? [])));
    const spareName = lan.names[spare] ?? place.pcs[2];
    const symptom =
      stillFine.length === 0
        ? L(
            `No device in use can reach ${the(srv)}.`,
            `使っているどの機器からも、${srv.ja}につながりません。`,
          )
        : L(
            `${capital(listOf(cutOffNames).en)} cannot reach ${the(srv)}, while ${listOf(stillFine).en} still can.`,
            `${listOf(cutOffNames).ja}から${srv.ja}につながりません。${listOf(stillFine).ja}からは、つながります。`,
          );
    const opening = scene(place, {
      home: L('The furniture was moved at the weekend.', '週末に、部屋の模様替えをしました。'),
      shop: L('The shop floor was cleaned last night.', 'きのうの夜、お店の床をそうじしました。'),
      clinic: L(
        'A desk was moved to make room for a new chair.',
        '新しいいすを置くために、机を動かしました。',
      ),
      school: L(
        'The desks were rearranged after the last lesson.',
        '授業のあとで、机を並べ替えました。',
      ),
      office: L('Workmen were under the desks yesterday.', 'きのう、机の下で工事がありました。'),
    });
    const brief = say(
      opening,
      L(
        `${capital(the(spareName))} is not in use this week, so its cable was taken out on purpose.`,
        `${spareName.ja}は今週は使わないので、ケーブルをわざとぬいてあります。`,
      ),
      symptom,
      L(
        'Another cable seems to have been pulled out somewhere.',
        'ほかにも、どこかでケーブルがぬけたようです。',
      ),
    );

    // --- What may be changed, the goals, the answers ---
    const [endA, endB] = endsOf(lan, lan.names, cable);
    return {
      title: L(
        stillFine.length === 0 ? 'Nobody can reach the server' : 'One cable is out',
        stillFine.length === 0 ? 'だれもつながらない' : 'つながらない機器がある',
      ),
      task: L(
        'Find the cable that was pulled out by mistake and plug it back in. Leave the other one out.',
        'まちがってぬけたケーブルを見つけて、つなぎ直してください。わざとぬいたほうは、そのままにします。',
      ),
      rule: L(
        'Rule: a cable that is out is drawn as a red dotted line. Press it to plug it in.',
        'ルール：ぬけているケーブルは、図では赤い点線。押すと、つながります。',
      ),
      brief,
      topology,
      names: lan.names,
      // Cables and nothing else. An address setting stood here as a distractor;
      // with one Check to count it was only noise, and a learner who plugged the
      // cable in and also changed the address was told it was solved.
      allowed: lan.cables.map((edgeId) => ({ kind: 'link-state', edgeId }) as const),
      checks: [
        ...everyoneReaches(lan, lan.names).filter((check) =>
          check.kind === 'reach' ? check.probe.from !== spare : true,
        ),
        {
          id: 'one-change',
          kind: 'max-changes',
          max: 1,
          label: L('Only one cable was plugged in', 'つないだケーブルは 1 本だけ'),
        },
      ],
      hints: [
        L(
          `Two cables are drawn as out. One of them is the cable of ${the(spareName)}, taken out on purpose.`,
          `ぬけているように描かれたケーブルが 2 本あります。そのうち 1 本は、わざとぬいた${spareName.ja}のケーブルです。`,
        ),
        L(
          'If only one device is cut off, suspect the cable only that device uses. If several are, suspect a cable they all share.',
          'つながらないのが 1 台だけなら、その 1 台だけが使うケーブルがあやしいです。何台もつながらないなら、みんなが通るケーブルがあやしいです。',
        ),
        L(
          `The cable between ${the(endA)} and ${the(endB)} is out. Plug that one back in.`,
          `${endA.ja}と${endB.ja}のあいだのケーブルがぬけています。そのケーブルをつなぎます。`,
        ),
      ],
      lessons: ['/course'],
      reference: [{ kind: 'link-state', edgeId: cable, state: 'up' }],
      wrongAnswers: [
        // Plugging in the cable taken out on purpose instead.
        [{ kind: 'link-state', edgeId: spareCable, state: 'up' }],
        // Plugging both in: one change too many.
        [
          { kind: 'link-state', edgeId: cable, state: 'up' },
          { kind: 'link-state', edgeId: spareCable, state: 'up' },
        ],
      ],
      fingerprint: [place.id, shape, where === 'own' ? pc : cable, spare],
    };
  },
);

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
