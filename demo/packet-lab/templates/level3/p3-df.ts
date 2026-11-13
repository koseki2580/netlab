/**
 * p3-df — the "do not split" mark (DF) and a narrow cable. What the task asks
 * decides the fix:
 *
 * - `report`: make the router answer that the packet must be split (set DF);
 * - `split-ok`: let it arrive, cut into pieces, at its size (clear DF);
 * - `whole-on` / `whole-off`: let it arrive whole, DF set or clear at the
 *   start (make it no bigger than the MTU; flipping the mark does not do it).
 *
 * So flipping the mark is right in half of the instances only. At most one
 * field may change. The narrow cable is never the sender's own (README 6).
 */

import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the, The } from '../../../exercises/templates/shared/text';
import { field } from '../../fields';
import type { PacketGoal } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { chainNet, packetFrom, withMtu, type RouterCount } from '../shared/nets';

export const MTUS = [576, 600, 800, 1000, 1280, 1400] as const;

const MODES = ['report', 'split-ok', 'whole-on', 'whole-off'] as const;

export const p3Df = definePacketTemplate(
  {
    id: 'p3-df',
    level: 3,
    kind: 'build-packet',
    title: L('Split it or say so', '分けるか、知らせるか'),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const mode = draw.pick(MODES);
    const count = draw.pick([2, 3] as const) as RouterCount;
    const cutAt = draw.int(count);
    const mtu = draw.pick(MTUS);
    const size = mtu + 40 + 8 * draw.int(60);
    const base = chainNet(place, plan, count, seed);
    const cutter = base.routers[cutAt] ?? 'r1';
    const net = withMtu(base, base.edgeAfter[cutter] ?? 'e-srv', mtu);
    const srv = net.names.srv ?? place.server;
    const rtr = net.names[cutter] ?? place.router;
    const startDf = mode === 'split-ok' || mode === 'whole-on';
    const reaches: PacketGoal = {
      id: 'delivered',
      kind: 'delivered',
      to: 'srv',
      label: L(`It reaches ${the(srv)}`, `${srv.ja}に届く`),
    };
    const oneChange: PacketGoal = {
      id: 'one-change',
      kind: 'max-changes',
      max: 1,
      label: L('One field changed at most', '変える欄は 1 つまで'),
    };
    const goals: PacketGoal[] =
      mode === 'report'
        ? [
            {
              id: 'reported',
              kind: 'dropped',
              at: cutter,
              reason: 'fragmentation-needed',
              label: L(
                `${The(rtr)} answers with the cable's limit`,
                `${rtr.ja}が回線の上限を知らせてくる`,
              ),
            },
            oneChange,
          ]
        : mode === 'split-ok'
          ? [
              reaches,
              {
                id: 'split',
                kind: 'fragmented',
                label: L(
                  'Cut on the way, put together at the end',
                  '途中で分割され、最後にまとめ直される',
                ),
              },
              oneChange,
            ]
          : [
              reaches,
              {
                id: 'whole',
                kind: 'not-fragmented',
                label: L('Never cut on the way', '途中で分割されない'),
              },
              oneChange,
            ];
    const task =
      mode === 'report'
        ? L(
            `Change the packet so that a router on the way answers with the limit of the narrow cable.`,
            '途中のルータが、細い回線の上限（MTU）を知らせてくるようにしてください。',
          )
        : mode === 'split-ok'
          ? L(
              `Let the packet reach ${the(srv)} at its size; it may be cut on the way.`,
              `大きさは変えずに、${srv.ja}に届くようにしてください。途中で分割されてかまいません。`,
            )
          : L(
              `Let the packet reach ${the(srv)} without being cut on the way.`,
              `途中で分割されずに、${srv.ja}に届くようにしてください。`,
            );
    const wrongDf = { values: { df: startDf }, note: 'DF the wrong way' };
    return {
      kind: 'build-packet',
      title: L(`A narrow cable on the way to ${the(srv)}`, `${srv.ja}までの途中の細い回線`),
      task,
      rule: L(
        'Rule: a packet bigger than the MTU is split if it lacks the DF mark; with it, it is dropped and a note comes back.',
        'ルール：MTU より大きいパケットは、DF の印がなければ分割され、あれば捨てられて知らせが返る。',
      ),
      brief: L(
        'Each cable has a limit on the size of a packet it carries: its MTU. A router that must send a packet onto a cable too narrow for it cuts the packet into pieces, unless the packet carries the "do not split" mark (DF): then it throws it away and tells the sender the cable\'s limit, so that the sender can send smaller packets.',
        '回線には、運べるパケットの大きさの上限（MTU）があります。細すぎる回線へパケットを送るルータは、パケットを分割します。ただし「分割しない」の印（DF）が付いていれば、分割せずに捨て、回線の上限を送り主に知らせます。送り主はそれを見て、小さく送り直せます。',
      ),
      topology: net.topology,
      names: net.names,
      packet: packetFrom(net, 'pc', { dstIp: net.ip.srv ?? '', df: startDf, dataBytes: size - 28 }),
      fields: [field('df'), field('size')],
      goals,
      reference:
        mode === 'report' ? { df: true } : mode === 'split-ok' ? { df: false } : { size: mtu },
      wrongAnswers:
        mode === 'report'
          ? [
              { ...wrongDf, code: 'not-dropped' },
              { values: { df: true, size: mtu }, code: 'too-many-changes', note: 'both changed' },
            ]
          : mode === 'split-ok'
            ? [
                { ...wrongDf, code: 'too-big-not-split' },
                { values: { size: mtu }, code: 'was-not-split', note: 'made smaller' },
              ]
            : [
                {
                  values: { df: !startDf },
                  code: startDf ? 'was-split' : 'too-big-not-split',
                  note: 'flag flipped',
                },
                {
                  values: { size: mtu + 8 },
                  code: startDf ? 'too-big-not-split' : 'was-split',
                  note: 'just over',
                },
              ],
      hints: [
        L(
          `Find the narrow cable on the diagram and its limit (MTU), and compare it with the size of the packet.`,
          '図で細い回線とその上限（MTU）を探し、パケットの大きさと比べてください。',
        ),
        mode === 'report' || mode === 'split-ok'
          ? L(
              'Whether the router cuts the packet or answers instead depends on one mark of the packet alone.',
              'ルータが分割するか、捨てて知らせるかは、パケットの印 1 つだけで決まります。',
            )
          : L(
              'Whatever the mark says, a packet bigger than the limit is either cut or thrown away. Only a packet within the limit passes whole.',
              '印がどうであれ、上限より大きいパケットは分割されるか捨てられます。そのまま通れるのは、上限以内のパケットだけです。',
            ),
        mode === 'report'
          ? L('Set the "do not split" mark.', '「分割しない」の印を付けます。')
          : mode === 'split-ok'
            ? L('Clear the "do not split" mark.', '「分割しない」の印を外します。')
            : L(
                'Make the packet size no bigger than the MTU of the narrow cable; the size counts the IP header too.',
                'パケットの大きさを、細い回線の MTU 以下にします。大きさには IP ヘッダも含みます。',
              ),
      ],
      lessons: ['/networking/mtu-fragmentation'],
      fingerprint: [place.id, mode, count, cutAt],
    };
  },
);
