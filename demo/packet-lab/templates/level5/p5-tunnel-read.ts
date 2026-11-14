/**
 * p5-gre-read, p5-vxlan-read — a packet crosses a provider in a tunnel (GRE,
 * RFC 2784 with a key, RFC 2890; or VXLAN, RFC 7348): two kinds of task, one
 * template each, so that level 5 has three (with p5-mpls-read). Two questions: on the first cable of the
 * core, what destination address does the packet on the wire carry (the far
 * end of the tunnel, not the server); and where does the PC's packet stop.
 * One in three gets through, one in three is thrown away by the far end (its
 * key or VNI differs), one in three by the router in the middle (its cable to
 * the far end is out).
 */

import { evenPlace } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { definePacketTemplate } from '../shared/define';
import { packetFrom } from '../shared/nets';
import { device, question, type Captured } from '../shared/read';
import { tunnelNet, type TunnelFault, type TunnelKind } from '../shared/tunnels';

const FAULTS: readonly TunnelFault[] = ['none', 'far-end', 'middle'];

const tunnelRead = (kind: Exclude<TunnelKind, 'mpls'>) =>
  definePacketTemplate(
    {
      id: `p5-${kind}-read`,
      level: 5,
      kind: 'read-packet',
      title:
        kind === 'gre'
          ? L('Read a packet in a GRE tunnel', 'GRE トンネルの中のパケットを読む')
          : L('Read a packet in a VXLAN tunnel', 'VXLAN トンネルの中のパケットを読む'),
    },
    (draw, seed) => {
      const fault = FAULTS[evenPlace(seed, 3, 52)] ?? 'none';
      // Half ask where the packet on the wire goes, half where it comes from.
      const asks = evenPlace(seed, 2, 54) === 0 ? 'dst-on-link' : 'src-on-link';
      const place = drawPlace(draw);
      const plan = drawPlan(draw);
      const net = tunnelNet(place, plan, { kind, fault, php: false, salt: seed });
      const packet = packetFrom(net, 'pc', { dstIp: net.ip.srv ?? '', ttl: 64 }) as Captured;
      const name = (id: string) => net.names[id] ?? place.router;
      const [r1, r3] = [name('r1'), name('r3')];
      const proto = kind === 'gre' ? 'GRE' : 'VXLAN';
      const id = kind === 'gre' ? L('key', 'キー') : L('VNI', 'VNI');
      // The outer packet's own address asked for; every other address of the core is a mistake.
      const outerAnswer = asks === 'dst-on-link' ? net.ends.far : net.ends.near;
      const middle = [net.ip['r2:to-r1'], net.ip['r2:to-r3']];
      const outerWhy = (value: string): string =>
        value === outerAnswer
          ? 'right'
          : value === net.ends.near
            ? 'near-end'
            : value === net.ends.far
              ? 'far-end-as-src'
              : middle.includes(value)
                ? 'middle-router'
                : kind === 'gre'
                  ? 'tunnel-side'
                  : 'cable-side';
      const stops = fault === 'far-end' ? 'r3' : fault === 'middle' ? 'r2' : 'srv';
      const why = (at: string, otherwise: string) => (at === stops ? 'right' : otherwise);
      return {
        kind: 'read-packet',
        title: L(`A packet through a ${proto} tunnel`, `${proto} トンネルを通るパケット`),
        task: L(
          `Read the ${proto} tunnel beside the diagram, and answer the two questions.`,
          `図の横の ${proto} トンネルを読んで、2 つの問いに答えてください。`,
        ),
        rule: L(
          `Rule: a tunnel wraps the packet in one addressed to the far end, which takes it only with the same ${id.en}.`,
          `ルール：トンネルは向こう端あてのパケットで包む。向こう端は${id.ja}が同じときだけ受け取る。`,
        ),
        brief: L(
          `${capital(the(r1))} and ${the(r3)} join two sites through a provider. The router in the middle belongs to the provider and knows nothing of the sites' networks.`,
          `${r1.ja}と${r3.ja}は、事業者の回線を通して 2 つの拠点をつないでいます。まん中のルータは事業者のもので、拠点のネットワークは知りません。`,
        ),
        topology: net.topology,
        names: net.names,
        packets: [packet],
        outcome: {
          deliveredTo: fault === 'none' ? 'srv' : null,
          dropAt: fault === 'none' ? null : stops,
          reason:
            fault === 'far-end'
              ? kind === 'gre'
                ? 'gre-key-mismatch'
                : 'vxlan-vni-mismatch'
              : fault === 'middle'
                ? 'no-route'
                : null,
        },
        questions: [
          {
            ...question(draw, 'outer', asks, outerAnswer, [
              ...net.core.map((value) => ({ value, why: outerWhy(value) })),
              asks === 'dst-on-link'
                ? { value: net.ip.srv ?? '', why: 'inner-dst' }
                : { value: net.ip.pc ?? '', why: 'inner-src' },
            ]),
            edgeId: 'e-1',
          },
          question(draw, 'stops', 'stops-at', stops, [
            device(net.names, 'r1', 'stops-near-end'),
            device(net.names, 'r2', why('r2', 'stops-middle')),
            device(net.names, 'r3', why('r3', 'stops-far-when-same')),
            device(
              net.names,
              'srv',
              why('srv', fault === 'middle' ? 'arrives-cable-out' : 'arrives-when-different'),
            ),
          ]),
        ],
        hints: [
          L(
            `Beside the diagram: the address each end sends from, and each end's ${id.en}.`,
            `図の横に、それぞれの端の送り元アドレスと${id.ja}があります。`,
          ),
          L(
            'Between the two ends the packet on the wire is the outer one. Its destination is the far end.',
            '2 つの端のあいだを流れるのは外側のパケットです。そのあて先は向こう端です。',
          ),
          L(
            `Compare the ${id.en} at the two ends, and look for a cable that is out on the way.`,
            `2 つの端の${id.ja}を見比べ、とちゅうにぬけている回線がないかも見てください。`,
          ),
        ],
        lessons: [
          kind === 'gre' ? '/networking/tunneling/gre' : '/networking/tunneling/vxlan-evpn',
        ],
        fingerprint: [place.id, kind, fault, asks],
      };
    },
  );

export const p5GreRead = tunnelRead('gre');
export const p5VxlanRead = tunnelRead('vxlan');

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
