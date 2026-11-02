/**
 * p4-send-window — how much may this sender still put on the wire? The captured
 * segment is on its way; the question gives the sender's cwnd, the window the
 * receiver last advertised (rwnd) and the bytes in flight.
 *
 * Truth (RFC 5681 §3, RFC 9293 §3.8.6.2.1): bytes in flight stay within
 * min(cwnd, rwnd), so what may still go is min(cwnd, rwnd) less what is in
 * flight, and nothing at all while the window is 0. The judge asks the engine's
 * own `usableWindow`.
 *
 * The answer takes each rank among the four offers equally often, so neither
 * the smallest nor the largest number is a way through without reading.
 */

import { evenPlace } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import type { Candidate, Localised } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { chainNet, packetFrom, type RouterCount } from '../shared/nets';
import { question, type Captured } from '../shared/read';

const RANK_SALT = 67;
const LIMIT_SALT = 71;
const SEGMENT_SIZES = [500, 536, 1000, 1200, 1460] as const;

const bytes = (value: number): Localised => L(`${value} bytes`, `${value} バイト`);
const offer = (value: number, why: string): Candidate => ({
  value: String(value),
  label: bytes(value),
  why,
});

export const p4SendWindow = definePacketTemplate(
  {
    id: 'p4-send-window',
    level: 4,
    kind: 'read-packet',
    title: L('How much may the sender still send?', '送信側はあと何バイト送れる？'),
  },
  (draw, seed) => {
    const count = draw.pick([1, 2, 3] as const) as RouterCount;
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const size = draw.pick(SEGMENT_SIZES);
    /** How many of the three wrong offers are smaller than the answer. */
    const rank = evenPlace(seed, 4, RANK_SALT);
    const rwndLimits = evenPlace(seed, 2, LIMIT_SALT) === 0;

    const inFlight = (rank < 2 ? 2 + draw.int(2) : 1 + draw.int(2)) * size;
    // Rank 0 is half the time the closed window, whose answer is 0.
    const closed = rank === 0 && rwndLimits;
    // Not a whole number of segments, so a value remembered from one instance is no use in the next.
    const part = Math.floor((size * draw.int(8)) / 800) * 100;
    const room = closed
      ? 0
      : rank === 0
        ? size + part
        : rank === 1
          ? inFlight + size + part
          : inFlight + (2 + draw.int(3)) * size + part;
    const window = closed ? 0 : room + inFlight;
    // Far enough above that taking off what is in flight does not land on another offer.
    const other = closed
      ? 2 * inFlight + (1 + draw.int(4)) * size
      : window + inFlight + (1 + draw.int(4)) * size;
    const limitIsRwnd = closed || rwndLimits;
    const cwnd = limitIsRwnd ? other : window;
    const rwnd = limitIsRwnd ? window : other;

    const wrong: readonly Candidate[] = closed
      ? [
          offer(cwnd - inFlight, 'window-other'),
          offer(cwnd, 'window-forgot-flight'),
          offer(inFlight, 'window-is-flight'),
        ]
      : rank === 0
        ? [
            offer(inFlight, 'window-is-flight'),
            offer(window, 'window-forgot-flight'),
            offer(other - inFlight, 'window-other'),
          ]
        : rank === 1
          ? [
              offer(0, 'window-nothing'),
              offer(window, 'window-forgot-flight'),
              offer(other - inFlight, 'window-other'),
            ]
          : rank === 2
            ? [
                offer(0, 'window-nothing'),
                offer(inFlight, 'window-is-flight'),
                offer(window, 'window-forgot-flight'),
              ]
            : [
                offer(0, 'window-nothing'),
                offer(inFlight, 'window-is-flight'),
                offer(room - size, 'window-one-short'),
              ];

    const net = chainNet(place, plan, count, seed);
    const packet = packetFrom(net, 'pc', {
      dstIp: net.ip.srv ?? '',
      carries: 'tcp',
      dstPort: 80,
      df: true,
      dataBytes: size,
    }) as Captured;
    const srv = net.names.srv ?? place.server;
    const asked = question(draw, 'room', 'send-window', String(room), [
      offer(room, 'right'),
      ...wrong,
    ]);
    return {
      kind: 'read-packet',
      title: L(`Sending to ${the(srv)}`, `${srv.ja}へ送る`),
      task: L(
        'Read the three numbers, and choose how many more bytes the sender may send now.',
        '3 つの数を読んで、送信側がいまあと何バイト送れるかを選んでください。',
      ),
      rule: L(
        'Rule: bytes in flight stay within the smaller of cwnd and rwnd.',
        'ルール：送信中のバイトは、cwnd と rwnd の小さいほうを超えない。',
      ),
      brief: L(
        'Two limits apply to a TCP sender. The receiver advertises in every segment how much room it has left: its window, rwnd. The sender keeps its own estimate of what the network can carry: cwnd. Bytes sent and not yet acknowledged are "in flight", and they count against both. While rwnd is 0 no new data may go at all, however large cwnd is.',
        'TCP の送信側には 2 つの上限があります。受信側は、あとどれだけ入るかをセグメントごとに知らせます。これがウィンドウ（rwnd）です。送信側は、ネットワークが運べる量の見積もり（cwnd）を持っています。送ったけれどまだ確認応答のないバイトが「送信中」で、どちらの上限にも数えます。rwnd が 0 のあいだは、cwnd がどれほど大きくても新しいデータは送れません。',
      ),
      topology: net.topology,
      names: net.names,
      packets: [packet],
      outcome: { deliveredTo: 'srv', dropAt: null, reason: null },
      questions: [
        {
          ...asked,
          prompt: L(
            `cwnd is ${cwnd} bytes, rwnd is ${rwnd} bytes, and ${inFlight} bytes are in flight. How many more bytes may the sender send now?`,
            `cwnd は ${cwnd} バイト、rwnd は ${rwnd} バイト、送信中は ${inFlight} バイトです。送信側はいま、あと何バイト送れますか。`,
          ),
          window: { cwnd, rwnd, inFlight },
        },
      ],
      hints: [
        L(
          'There are two windows here. Find the smaller of them first.',
          'ここには 2 つの上限があります。まず小さいほうを見つけてください。',
        ),
        L(
          'Bytes in flight have already used part of that window.',
          '送信中のバイトは、その上限の一部をもう使っています。',
        ),
        L(
          'Take what is in flight from the smaller window. A window of 0 leaves nothing, whatever the other number says.',
          '小さいほうの上限から、送信中のバイトを引きます。上限が 0 なら、もう一方が何であっても何も送れません。',
        ),
      ],
      lessons: ['/simulation/tcp-flow-control'],
      fingerprint: [
        limitIsRwnd ? 'rwnd' : 'cwnd',
        rank,
        closed ? 'closed' : 'open',
        inFlight / size,
      ],
    };
  },
);
