/**
 * l3-acl-order — the list has the line that refuses the guest, but under a
 * line that lets everyone through: the first line that fits decides, so the
 * guest gets in. The learner moves the refusing line up.
 */

import { defineTemplate } from '../shared/exercise';
import { ACL_GLOSS, aclOn, buildAclNet, opens, rule } from '../shared/aclNet';
import { drawPlace } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, say, the, The } from '../shared/text';

export const l3AclOrder = defineTemplate(
  {
    id: 'l3-acl-order',
    level: 3,
    kind: 'configure',
    title: L('Put the refusing line first', '止める行を上にする'),
  },
  (draw) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const net = buildAclNet(place, plan, false);
    const where = draw.pick(['lan', 'far'] as const);
    // On the PCs' side the list looks at traffic coming in; on the server's side, going out to it.
    const list = aclOn(where, where === 'lan' ? 'inbound' : 'outbound');
    // How the guest is refused: everything, or tcp alone.
    const kind = draw.pick(['any', 'tcp'] as const);
    const everyone = rule('all', 10, 'permit', 'any');
    const refuse = rule('guest', 20, 'deny', kind, net.address.guest);
    const topology = list.put(net.topology, [everyone, refuse]);
    const name = (id: string) => net.names[id] ?? place.router;
    const guest = name('guest');
    const brief = say(
      L(
        `${The(guest)} must not open ${the(place.server)}.`,
        `${guest.ja}からは、${place.server.ja}を開けないようにしたいところです。`,
      ),
      L(
        `Someone added a line refusing ${the(guest)} to the list on ${the(name('r1'))}, yet ${the(guest)} still gets in.`,
        `だれかが${name('r1').ja}の一覧に、${guest.ja}を止める行を足しました。それでも、${guest.ja}から開けてしまいます。`,
      ),
      ACL_GLOSS,
      L(
        `Change the list so that ${the(guest)} is refused and the others still get through.`,
        `一覧を直して、${guest.ja}は止まり、ほかの機器は通れるようにしてください。`,
      ),
    );
    const fixed = [
      { ...refuse, priority: 10 },
      { ...everyone, priority: 20 },
    ];
    return {
      title: L(`${The(guest)} still gets in`, `${guest.ja}が、まだ入れてしまう`),
      task: L(
        `Change the list (ACL) so that ${the(guest)} is refused and the others still get through.`,
        `一覧（ACL）を直して、${guest.ja}は止め、ほかの機器は通るようにしてください。`,
      ),
      rule: L(
        'Rule: the list is read from the top, and the first line that fits decides. A line under one that already fits is never read.',
        'ルール：一覧は上から読み、最初に当てはまった行で決まる。先に当てはまる行の下にある行は、読まれない。',
      ),
      brief,
      topology,
      names: net.names,
      allowed: [list.ref],
      checks: [
        opens(net.names, 'pc1', 'srv', 80, true),
        opens(net.names, 'pc2', 'srv', 80, true),
        opens(net.names, 'guest', 'srv', 80, false),
      ],
      hints: [
        L(
          `Read the list from the top, as the router does, for traffic from ${the(guest)} (${net.address.guest}). Which line fits it first?`,
          `${guest.ja}（${net.address.guest}）からの通信で、一覧を上から読んでください。最初に当てはまるのは、どの行ですか。`,
        ),
        L(
          'The first line lets everything through, so the line under it is never reached.',
          '1 行目が「すべて通す」なので、その下の行まで読まれません。',
        ),
        L(
          `Move the line that refuses ${net.address.guest}/32 above the line that lets everything through.`,
          `${net.address.guest}/32 を止める行を、「すべて通す」行より上に動かします。`,
        ),
      ],
      lessons: ['/simulation/acl'],
      reference: [list.set(fixed)],
      wrongAnswers: [
        // The refusing line removed: the guest gets in.
        [list.set([everyone])],
        // The line letting everyone through removed: now everyone is refused.
        [list.set([{ ...refuse, priority: 10 }])],
        // No list at all.
        [list.set([])],
      ],
      fingerprint: [place.id, where, kind],
    };
  },
);
