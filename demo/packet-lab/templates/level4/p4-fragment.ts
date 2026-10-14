/**
 * p4-fragment — the full statement of a split: each piece's size, position and
 * "more pieces follow" mark, for ICMP or UDP. The position is asked in steps of
 * 8 bytes, as on the wire, or in bytes; the task line says which.
 */

import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { definePacketTemplate } from '../shared/define';
import { drawSplit, rfcSplit } from '../shared/split';

export const p4Fragment = definePacketTemplate(
  {
    id: 'p4-fragment',
    level: 4,
    kind: 'fragment',
    title: L('Every piece, in full', '断片をすべて書き出す'),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const carries = draw.pick(['icmp', 'udp'] as const);
    const offsetUnit = draw.pick(['units8', 'units8', 'bytes'] as const);
    const split = drawSplit(draw, place, plan, seed, [2, 3, 4, 5], carries);
    const { net, packet, mtu } = split;
    const asks = { offsets: true, flags: true };
    const rtr = net.names[split.cutBy] ?? place.router;
    const head = carries === 'udp' ? 'UDP' : 'ICMP';
    return {
      kind: 'fragment',
      title: L(`Every piece after ${the(rtr)}`, `${rtr.ja}が作る断片`),
      task:
        offsetUnit === 'bytes'
          ? L(
              'For each piece, give its size, its position in bytes and its "more pieces follow" mark.',
              '断片ごとに、大きさ・位置（バイト数）・「続きあり」の印を答えてください。',
            )
          : L(
              'For each piece, give its size, its position in steps of 8 bytes and its "more pieces follow" mark.',
              '断片ごとに、大きさ・位置（8 バイト単位）・「続きあり」の印を答えてください。',
            ),
      rule: L(
        'Rule: the position counts what came before, after the IP headers; every piece but the last is marked "more".',
        'ルール：位置は前の断片が運んだ中身の合計。最後以外の断片には「続きあり」の印を付ける。',
      ),
      brief: L(
        `${head === 'UDP' ? 'A UDP message' : 'A ping'} with ${packet.dataBytes} bytes of data is sent: after the 20-byte IP header come the 8-byte ${head} header and the data. A cable on the way has an MTU of ${mtu} bytes. The receiver puts the pieces back together by their position, and knows it has the last one when the "more pieces follow" mark is clear.`,
        `データ ${packet.dataBytes} バイトの${head === 'UDP' ? ' UDP の通信' : ' ping'}を送ります。IP ヘッダ 20 バイトの後ろに、${head} ヘッダ 8 バイトとデータが続きます。途中の回線の MTU は ${mtu} バイトです。受け取る側は、位置を見て断片を並べ直し、「続きあり」の印がない断片で最後だとわかります。`,
      ),
      topology: net.topology,
      names: net.names,
      packet,
      payloadBytes: packet.dataBytes,
      mtu,
      narrowEdgeId: split.narrowEdgeId,
      cutBy: split.cutBy,
      asks,
      offsetUnit,
      goals: [
        { id: 'count', label: L('The number of pieces', '断片の数') },
        { id: 'sizes', label: L('The size of each piece', 'それぞれの断片の大きさ') },
        { id: 'offsets', label: L('The position of each piece', 'それぞれの断片の位置') },
        { id: 'flags', label: L('The "more pieces follow" marks', '「続きあり」の印') },
      ],
      reference: rfcSplit(packet, mtu, offsetUnit, asks),
      hints: [
        L(
          `Split it first as at level 3: what comes after the IP header (the ${head} header and the data), in pieces that fit the MTU.`,
          `まず、IP ヘッダより後ろ（${head} ヘッダとデータ）を、MTU に入る断片に分けてください。`,
        ),
        L(
          `The first piece is at position 0; each next one starts where the one before it ended.${offsetUnit === 'bytes' ? '' : ' Divide by 8 for the step count.'}`,
          `最初の断片の位置は 0 で、次の断片は前の断片の終わりから始まります。${offsetUnit === 'bytes' ? '' : '8 で割った数が位置です。'}`,
        ),
        L(
          'The position of a piece is the sum of what the pieces before it carried, without their IP headers. Only the last piece has no "more" mark.',
          'ある断片の位置は、それより前の断片の中身（IP ヘッダを除く）の合計です。「続きあり」の印がないのは最後の断片だけです。',
        ),
      ],
      lessons: ['/networking/mtu-fragmentation', '/networking/udp'],
      fingerprint: [
        place.id,
        carries,
        offsetUnit,
        split.splitCase,
        split.count,
        mtu % 8 === 4 ? 'round' : 'odd',
        split.cutBy,
      ],
    };
  },
);
