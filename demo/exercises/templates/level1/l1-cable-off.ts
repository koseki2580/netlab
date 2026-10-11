/**
 * l1-cable-off — one cable is unplugged. The brief gives the symptom (who
 * cannot reach the server), not the cable; the learner finds it on the picture
 * and plugs it back in. The address of a PC may be changed too, and is not the
 * problem.
 *
 * No loop anywhere in these shapes, so a cable that is down behaves as one
 * (engine fact 4 is about loops).
 */

import { buildLan, LAN_SHAPES, withLinkState } from '../shared/build';
import { defineTemplate } from '../shared/exercise';
import { endsOf, everyoneReaches, setIp } from '../shared/lan';
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
    const topology = withLinkState(lan.topology, cable, 'down');

    // --- The brief: who notices ---
    const srv = place.server;
    const cutOff: readonly string[] =
      cable === 'e-sw' ? ['pc1', 'pc2'] : where === 'own' ? [pc] : lan.pcs;
    const cutOffNames = cutOff.flatMap((id) => lan.names[id] ?? []);
    const stillFine = lan.pcs.flatMap((id) => (cutOff.includes(id) ? [] : (lan.names[id] ?? [])));
    const symptom =
      stillFine.length === 0
        ? L(`No device can reach ${the(srv)}.`, `どの機器からも、${srv.ja}につながりません。`)
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
      symptom,
      L('A cable seems to have been pulled out somewhere.', 'どこかでケーブルがぬけたようです。'),
    );

    // --- What may be changed, the goals, the answers ---
    const [endA, endB] = endsOf(lan, lan.names, cable);
    const asked = cutOff[0] ?? pc;
    return {
      title: L(
        stillFine.length === 0 ? 'Nobody can reach the server' : 'One cable is out',
        stillFine.length === 0 ? 'だれもつながらない' : 'つながらない機器がある',
      ),
      task: L(
        'Find the unplugged cable on the diagram and plug it back in.',
        'ぬけているケーブルを図で見つけて、つなぎ直してください。',
      ),
      rule: L(
        'Rule: a cable that is out is drawn as a red dotted line. Press it to plug it in.',
        'ルール：ぬけているケーブルは、図では赤い点線。押すと、つながります。',
      ),
      brief,
      topology,
      names: lan.names,
      allowed: [
        ...lan.cables.map((edgeId) => ({ kind: 'link-state', edgeId }) as const),
        { kind: 'host-ip', nodeId: asked },
      ],
      checks: everyoneReaches(lan, lan.names),
      hints: [
        L(
          'Look at the cables on the picture one by one. A cable that is out is drawn differently from the others.',
          '図のケーブルを 1 本ずつ見てください。ぬけているケーブルは、ほかのケーブルとちがう見た目になっています。',
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
        // Blaming the address instead of the cable.
        [setIp(asked, plan.near.at(plan.free))],
      ],
      fingerprint: [place.id, shape, where === 'own' ? pc : cable],
    };
  },
);

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
