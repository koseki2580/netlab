/**
 * l3-acl-replies — to keep a device on the server's side away from the PCs,
 * someone put a list with one line, "refuse that device", on the router's
 * server side, for traffic coming in. Now the server's answers are refused
 * too: they come in on that side, and the list ends with an unseen "refuse
 * the rest". The learner adds the line that lets the rest through, under the
 * refusing one.
 */

import { defineTemplate } from '../shared/exercise';
import { ACL_GLOSS, aclOn, buildAclNet, opens, rule } from '../shared/aclNet';
import { drawPlace } from '../shared/places';
import { drawPlan } from '../shared/plans';
import { goals } from '../shared/exercise';
import { L, say, the, The } from '../shared/text';

export const l3AclReplies = defineTemplate(
  {
    id: 'l3-acl-replies',
    level: 3,
    kind: 'diagnose-repair',
    title: L('A list that stops the answers', '返事まで止める一覧'),
  },
  (draw) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const net = buildAclNet(place, plan, true);
    const list = aclOn('far', 'inbound');
    const kind = draw.pick(['any', 'icmp'] as const);
    const refuse = rule('srv2', 10, 'deny', kind, net.address.srv2);
    const topology = list.put(net.topology, [refuse]);
    const name = (id: string) => net.names[id] ?? place.router;
    const { apart } = goals(net.names);
    const rest = rule('rest', 20, 'permit', 'any');
    const brief = say(
      L(
        `${The(name('srv2'))} must not reach the PCs. So someone gave ${the(name('r1'))} a list on its side towards ${the(name('srv'))}, for traffic coming in, with one line: refuse ${the(name('srv2'))}. Since then nothing opens ${the(name('srv'))} any more.`,
        `${name('srv2').ja}から、パソコンに届かないようにしたい。そこで、だれかが${name('r1').ja}の${name('srv').ja}側に、入ってくる通信の一覧を作り、「${name('srv2').ja}を止める」の 1 行を書きました。それから、どのパソコンからも${name('srv').ja}が開けなくなりました。`,
      ),
      ACL_GLOSS,
      L(
        'Answers are checked against a list too: the answer of the server comes IN on that side.',
        '返事も、一覧で調べられます。サーバーの返事は、その側から「入ってくる」通信です。',
      ),
    );
    return {
      title: L(`Nothing opens ${the(name('srv'))}`, `${name('srv').ja}が開けない`),
      task: L(
        `Fix the list so that the PCs open ${the(name('srv'))} again, and ${the(name('srv2'))} still cannot reach them.`,
        `一覧を直して、パソコンから${name('srv').ja}が開けるように、${name('srv2').ja}からは届かないままにしてください。`,
      ),
      rule: L(
        'Rule: answers are checked too, and what fits no line is refused. A list that only refuses needs a line that lets the rest through, under it.',
        'ルール：返事も調べられ、どの行にも当てはまらない通信は止まる。止める行だけの一覧には、その下に「ほかは通す」行がいる。',
      ),
      brief,
      topology,
      names: net.names,
      allowed: [list.ref],
      checks: [
        opens(net.names, 'pc1', 'srv', 80, true),
        opens(net.names, 'pc2', 'srv', 80, true),
        apart('srv2', 'pc1', 'acl'),
      ],
      hints: [
        L(
          `When ${the(name('pc1'))} opens ${the(name('srv'))}, the answer comes back into ${the(name('r1'))} on the server's side. Read the list for that answer: which line fits it?`,
          `${name('pc1').ja}が${name('srv').ja}を開くと、返事は${name('srv').ja}側から${name('r1').ja}に入ってきます。その返事で一覧を読んでください。当てはまる行はどれですか。`,
        ),
        L(
          'No line fits the answer, so the unseen last line refuses it.',
          '返事に当てはまる行がないので、見えない最後の行が止めています。',
        ),
        L(
          `Under the line that refuses ${net.address.srv2}/32, add a line: allow, kind anything, any sender.`,
          `${net.address.srv2}/32 を止める行の下に、「通す・種類 すべて・送り主 なし（どこからでも）」の行を足します。`,
        ),
      ],
      lessons: ['/simulation/acl'],
      reference: [list.set([refuse, rest])],
      wrongAnswers: [
        // The line letting everything through, put first: the device gets through it.
        [list.set([{ ...rest, priority: 5 }, refuse])],
        // The list emptied: nothing keeps the device away.
        [list.set([])],
        // Only the server's answers let in, by ping: the page is tcp.
        [list.set([refuse, rule('srv-ping', 20, 'permit', 'icmp', net.address.srv)])],
      ],
      fingerprint: [place.id, kind],
    };
  },
);
