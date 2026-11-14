/**
 * p5-mpls-read — a packet crosses an MPLS core (RFC 3031): r1 pushes the LDP
 * label for r3's loopback (RFC 5036) over the VPN label from BGP (RFC 4364
 * §5–6); the router in the middle swaps it, or pops it when r3 asked for
 * label 3 (PHP, RFC 3032); r3 pops what is left. Two questions: the labels on
 * a cable of the core, and where the packet stops. One in three gets through,
 * one in three is thrown away by the router in the middle (no label table),
 * one in three by r3 (no entry for the VPN label).
 */

import { evenPlace } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { definePacketTemplate } from '../shared/define';
import { packetFrom } from '../shared/nets';
import { device, question, type Captured } from '../shared/read';
import { tunnelNet, type TunnelFault } from '../shared/tunnels';

const FAULTS: readonly TunnelFault[] = ['none', 'middle', 'far-end'];
const stack = (labels: readonly number[]): string => labels.join(' / ');

export const p5MplsRead = definePacketTemplate(
  {
    id: 'p5-mpls-read',
    level: 5,
    kind: 'read-packet',
    title: L('Read the labels of an MPLS packet', 'MPLS のラベルを読む'),
  },
  (draw, seed) => {
    // One in three: r3 asked for label 3, and the router in the middle pops the top label.
    const php = evenPlace(seed, 3, 61) === 0;
    const fault = FAULTS[evenPlace(seed, 3, 62)] ?? 'none';
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const net = tunnelNet(place, plan, { kind: 'mpls', fault, php, salt: seed });
    const packet = packetFrom(net, 'pc', { dstIp: net.ip.srv ?? '', ttl: 64 }) as Captured;
    const name = (id: string) => net.names[id] ?? place.router;
    const [r1, r2, r3] = [name('r1'), name('r2'), name('r3')];
    const { top, vpn } = net.labels;
    // The cable asked about is one the packet crosses: the first where it stops in the middle.
    const edgeId = fault === 'middle' ? 'e-1' : 'e-2';
    const right =
      fault === 'middle' ? stack([top, vpn]) : php ? stack([vpn]) : stack([top + 1, vpn]);
    const of = (value: string, otherwise: string) => ({
      value,
      why: value === right ? 'right' : otherwise,
    });
    const stops = fault === 'middle' ? 'r2' : fault === 'far-end' ? 'r3' : 'srv';
    const at = (id: string, otherwise: string) => (id === stops ? 'right' : otherwise);
    return {
      kind: 'read-packet',
      title: L('A packet across an MPLS core', 'MPLS のコアを通るパケット'),
      task: L(
        'Read the label tables beside the diagram, and answer the two questions.',
        '図の横のラベル表を読んで、2 つの問いに答えてください。',
      ),
      rule: L(
        'Rule: each router swaps the top label for the one the next asked for, or pops it for 3. The VPN label stays.',
        'ルール：上のラベルは、次のルータの指定に付け替える（3 なら外す）。下の VPN ラベルは変わらない。',
      ),
      brief: L(
        `${capital(the(r1))} and ${the(r3)} are the provider's edge routers (PE). The top label is for the loopback of ${the(r3)} (LDP); the VPN label below it comes from BGP. ${capital(the(r2))} in the middle forwards by label only and knows no route to the sites.`,
        `${r1.ja}と${r3.ja}は事業者の端のルータ（PE）です。上のラベルは${r3.ja}のループバックあて（LDP）、その下の VPN ラベルは BGP から来ます。まん中の${r2.ja}はラベルだけで転送し、拠点への経路は知りません。`,
      ),
      topology: net.topology,
      names: net.names,
      packets: [packet],
      outcome: {
        deliveredTo: fault === 'none' ? 'srv' : null,
        dropAt: fault === 'none' ? null : stops,
        reason: fault === 'none' ? null : 'mpls-no-label',
      },
      questions: [
        {
          ...question(draw, 'labels', 'labels-on-link', right, [
            of(stack([top, vpn]), 'not-swapped'),
            of(stack([top + 1, vpn]), php ? 'swapped-under-php' : 'swapped-too-early'),
            of(stack([vpn]), 'popped-too-early'),
            of(stack([3, vpn]), 'implicit-null-on-wire'),
            of(stack([0, vpn]), 'explicit-null'),
            {
              value: 'none',
              label: L('None: plain IP', 'なし（ふつうの IP）'),
              why: 'no-labels-in-core',
            },
          ]),
          edgeId,
        },
        question(draw, 'stops', 'stops-at', stops, [
          device(net.names, 'r1', 'stops-near-end'),
          device(net.names, 'r2', at('r2', 'stops-middle-with-entry')),
          device(net.names, 'r3', at('r3', 'stops-far-pe')),
          device(net.names, 'srv', at('srv', 'arrives-without-entry')),
        ]),
      ],
      hints: [
        L(
          'Beside the diagram: what the first router pushes, and the label table of each router.',
          '図の横に、最初のルータが付けるラベルと、それぞれのルータのラベル表があります。',
        ),
        L(
          'Follow the top label: the router in the middle looks it up in its table and swaps or pops it.',
          '上のラベルをたどってください。まん中のルータは自分の表でそれを探し、付け替えるか外します。',
        ),
        L(
          'A router with no entry for the label it reads throws the packet away: it has no route to fall back on.',
          '読んだラベルが表にないルータは、パケットを捨てます。代わりに使える経路がないからです。',
        ),
      ],
      lessons: ['/networking/tunneling/mpls-l3vpn'],
      fingerprint: [place.id, php ? 'php' : 'swap', fault],
    };
  },
);

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
