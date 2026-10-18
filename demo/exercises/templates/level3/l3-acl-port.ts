/**
 * l3-acl-port — the guests may now open the server's page (tcp 80), and must
 * still not log in to it (tcp 22). The learner adds a line with a kind, a
 * sender and a port number: a line for the guest alone, without a port,
 * opens the login too.
 */

import { defineTemplate } from '../shared/exercise';
import { ACL_GLOSS, aclOn, buildAclNet, opens, rule } from '../shared/aclNet';
import { drawPlace } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { L, say, the, The } from '../shared/text';

export const l3AclPort = defineTemplate(
  {
    id: 'l3-acl-port',
    level: 3,
    kind: 'configure',
    title: L('Let one service through', '1 つの窓口だけ通す'),
  },
  (draw) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const net = buildAclNet(place, plan, false);
    const where = draw.pick(['lan', 'far'] as const);
    const list = aclOn(where, where === 'lan' ? 'inbound' : 'outbound');
    // The staff lines let through anything, or tcp alone.
    const staff = draw.pick(['any', 'tcp'] as const);
    const start = [
      rule('pc1', 10, 'permit', staff, net.address.pc1),
      rule('pc2', 20, 'permit', staff, net.address.pc2),
    ];
    const topology = list.put(net.topology, start);
    const name = (id: string) => net.names[id] ?? place.router;
    const guest = name('guest');
    const server = name('srv');
    const brief = say(
      L(
        `${The(guest)} should now be able to open the page of ${the(server)} (tcp, port 80), but still not log in to it (tcp, port 22). Right now the list on ${the(name('r1'))} lets only ${the(name('pc1'))} and ${the(name('pc2'))} through.`,
        `${guest.ja}から、${server.ja}のページ（tcp・80 番）を開けるようにしたいのですが、ログイン（tcp・22 番）はできないままにします。いまは、${name('r1').ja}の一覧が通しているのは${name('pc1').ja}と${name('pc2').ja}だけです。`,
      ),
      ACL_GLOSS,
    );
    const page = rule('guest-page', 30, 'permit', 'tcp', net.address.guest, 80);
    return {
      title: L(`The page only, for ${the(guest)}`, `${guest.ja}にはページだけ`),
      task: L(
        `Add a line so that ${the(guest)} can open the page (port 80) and still cannot log in (port 22).`,
        `${guest.ja}がページ（80 番）は開けて、ログイン（22 番）はできないように、一覧に行を足してください。`,
      ),
      rule: L(
        'Rule: a line fits only traffic of its kind, from its sender, to its port number. A line without a port number fits every port.',
        'ルール：行が当てはまるのは、その種類・その送り主・そのポート番号の通信だけ。ポート番号のない行は、どのポートにも当てはまる。',
      ),
      brief,
      topology,
      names: net.names,
      allowed: [list.ref],
      checks: [
        opens(net.names, 'guest', 'srv', 80, true),
        opens(net.names, 'guest', 'srv', 22, false),
        opens(net.names, 'pc1', 'srv', 22, true),
      ],
      hints: [
        L(
          `Read the list for traffic from ${the(guest)} (${net.address.guest}) to port 80. Does any line fit it?`,
          `${guest.ja}（${net.address.guest}）から 80 番への通信で、一覧を読んでください。当てはまる行はありますか。`,
        ),
        L(
          'A line for the guest with the kind "anything", or tcp without a port number, would let the login through too.',
          '種類が「すべて」の行や、ポート番号のない tcp の行では、ログインまで通ってしまいます。',
        ),
        L(
          `Add a line: allow, kind tcp, sender ${net.address.guest}/32, port number 80.`,
          `「通す・種類 tcp・送り主 ${net.address.guest}/32・ポート番号 80」の行を足します。`,
        ),
      ],
      lessons: ['/simulation/acl'],
      reference: [list.set([...start, page])],
      wrongAnswers: [
        [list.set([...start, rule('guest-all', 30, 'permit', 'any', net.address.guest)])],
        [list.set([...start, rule('guest-tcp', 30, 'permit', 'tcp', net.address.guest)])],
        [list.set([...start, rule('guest-ssh', 30, 'permit', 'tcp', net.address.guest, 22)])],
        [list.set([])],
      ],
      fingerprint: [place.id, where, staff],
    };
  },
);
