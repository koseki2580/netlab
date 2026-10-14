/**
 * p3-fragment — how a router splits a packet for one narrow cable: how many
 * pieces, and each one's size. Compared with the simulator's own split
 * (README question 7); offsets and flags wait for level 4.
 */

import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { definePacketTemplate } from '../shared/define';
import { drawSplit, rfcSplit } from '../shared/split';

export const p3Fragment = definePacketTemplate(
  {
    id: 'p3-fragment',
    level: 3,
    kind: 'fragment',
    title: L('How is it split?', 'どう分割される？'),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const split = drawSplit(draw, place, plan, seed, [2, 3, 4], 'icmp');
    const { net, packet, mtu } = split;
    const asks = { offsets: false, flags: false };
    const rtr = net.names[split.cutBy] ?? place.router;
    return {
      kind: 'fragment',
      title: L(`Through the narrow cable after ${the(rtr)}`, `${rtr.ja}の先の細い回線`),
      task: L(
        'Say into how many pieces the packet is split, and the size of each in bytes.',
        'パケットがいくつに分割され、それぞれ何バイトになるかを答えてください。',
      ),
      rule: L(
        'Rule: each piece fits the MTU with its 20-byte IP header; all but the last carry a multiple of 8, as much as fits.',
        'ルール：断片は IP ヘッダ 20 バイト込みで MTU 以内。最後以外の中身は 8 の倍数で、入るだけ詰める。',
      ),
      brief: L(
        `A ping with ${packet.dataBytes} bytes of data is sent: after the 20-byte IP header come the 8-byte ICMP header and the data. On the way it meets a cable whose MTU is ${mtu} bytes, and the router before it cuts the packet into pieces. Each piece is a packet of its own, with an IP header of its own.`,
        `データ ${packet.dataBytes} バイトの ping を送ります。IP ヘッダ 20 バイトの後ろに、ICMP ヘッダ 8 バイトとデータが続きます。途中に MTU ${mtu} バイトの回線があり、その手前のルータがパケットを分割します。断片はそれぞれが 1 つのパケットで、自分の IP ヘッダを持ちます。`,
      ),
      topology: net.topology,
      names: net.names,
      packet,
      payloadBytes: packet.dataBytes,
      mtu,
      narrowEdgeId: split.narrowEdgeId,
      cutBy: split.cutBy,
      asks,
      offsetUnit: 'units8',
      goals: [
        { id: 'count', label: L('The number of pieces', '断片の数') },
        { id: 'sizes', label: L('The size of each piece', 'それぞれの断片の大きさ') },
      ],
      reference: rfcSplit(packet, mtu, 'units8', asks),
      hints: [
        L(
          'Find the narrow cable and its MTU, and add up what comes after the IP header: the ICMP header and the data.',
          '細い回線と MTU を見つけ、IP ヘッダより後ろ（ICMP ヘッダとデータ）が何バイトあるかを足してください。',
        ),
        L(
          'One piece holds the MTU less its own 20-byte IP header, rounded down to a multiple of 8.',
          '1 つの断片で運べるのは、MTU から自分の IP ヘッダ 20 バイトを引き、8 の倍数に切り下げた量です。',
        ),
        L(
          'Fill the pieces one after another with that much; the last takes the rest. Add 20 bytes to each for its IP header.',
          'その量ずつ順に詰め、残りを最後の断片に入れます。どの断片にも IP ヘッダの 20 バイトを足します。',
        ),
      ],
      lessons: ['/networking/mtu-fragmentation'],
      fingerprint: [
        place.id,
        split.splitCase,
        split.count,
        mtu % 8 === 4 ? 'round' : 'odd',
        split.routers,
        split.cutBy,
      ],
    };
  },
);
