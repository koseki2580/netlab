/**
 * p3-frame-after — the frame on a cable after a router: its source MAC, its
 * destination MAC, and the packet's TTL there. The IP addresses stay; the
 * frame is written anew at every router; a switch rewrites nothing (README
 * question 2: "after every router the frame is rewritten correctly"). The
 * cable is drawn: between two routers, after the last router, or between a
 * switch and the server.
 *
 * The TTLs offered are four in a row with the right one at a rank every rank
 * gets equally often, plus the TTL it left with.
 */

import { evenPlace, type Draw } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L } from '../../../exercises/templates/shared/text';
import type { Candidate } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { chainNet, lanNet, packetFrom, type PacketNet } from '../shared/nets';
import { question, type Captured } from '../shared/read';

/** One cable to ask about, with what is on either side of it. */
interface Spot {
  readonly net: PacketNet;
  readonly sender: string;
  readonly edgeId: string;
  /** The ends of the cable as the diagram shows them. */
  readonly before: string;
  readonly after: string;
  /** MAC keys (`node` or `node:side`). */
  readonly out: string;
  readonly in: string;
  readonly next: string;
  readonly gateway: string;
  /** Routers crossed before this cable, and switches crossed. */
  readonly routers: number;
  readonly switches: number;
  readonly name: string;
}

function drawSpot(
  draw: Draw,
  seed: number,
  place: Parameters<typeof lanNet>[0],
  plan: Parameters<typeof lanNet>[1],
): Spot {
  const kind = draw.pick([
    'chain2-mid',
    'chain2-end',
    'chain3-1',
    'chain3-2',
    'chain3-end',
    'lan-mid',
    'lan-end',
    'lan-srv',
  ] as const);
  if (kind.startsWith('lan')) {
    const net = lanNet(place, plan, seed, 'two-routers');
    const base = { net, sender: 'pc1', gateway: 'r1:lan', name: kind };
    if (kind === 'lan-mid') {
      return {
        ...base,
        edgeId: 'e-12',
        before: 'r1',
        after: 'r2',
        out: 'r1:to-r2',
        in: 'r1:lan',
        next: 'r2:to-r1',
        routers: 1,
        switches: 1,
      };
    }
    return {
      ...base,
      edgeId: kind === 'lan-end' ? 'e-far' : 'e-srv',
      before: kind === 'lan-end' ? 'r2' : 'sw2',
      after: kind === 'lan-end' ? 'sw2' : 'srv',
      out: 'r2:far',
      in: 'r2:to-r1',
      next: 'srv',
      routers: 2,
      switches: kind === 'lan-end' ? 1 : 2,
    };
  }
  const count = kind.startsWith('chain2') ? 2 : 3;
  const net = chainNet(place, plan, count, seed);
  const j = kind.endsWith('end') ? count : Number(kind.slice(-1)) || 1;
  const last = j === count;
  return {
    net,
    sender: 'pc',
    gateway: 'r1:lan',
    name: kind,
    edgeId: net.edgeAfter[`r${j}`] ?? 'e-srv',
    before: `r${j}`,
    after: last ? 'srv' : `r${j + 1}`,
    out: `r${j}:${last ? 'lan' : `to-r${j + 1}`}`,
    in: `r${j}:${j === 1 ? 'lan' : `to-r${j - 1}`}`,
    next: last ? 'srv' : `r${j + 1}:to-r${j}`,
    routers: j,
    switches: 0,
  };
}

/** The right one and the mistakes, without two of one value. */
function distinct(right: Candidate, wrong: readonly Candidate[]): Candidate[] {
  const seen = new Set([String(right.value)]);
  return [
    right,
    ...wrong.filter((entry) => {
      const key = String(entry.value);
      if (seen.has(key) || key === '') return false;
      seen.add(key);
      return true;
    }),
  ];
}

export const p3FrameAfter = definePacketTemplate(
  {
    id: 'p3-frame-after',
    level: 3,
    kind: 'read-packet',
    title: L('The frame after the router', 'ルータの先のフレーム'),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const spot = drawSpot(draw, seed, place, plan);
    const { net } = spot;
    const mac = (key: string) => net.mac[key] ?? '';
    // Away from the ends of the range, so that no offered TTL falls outside 1 to 255.
    const ttl0 = 30 + draw.int(200);
    const ttl = ttl0 - spot.routers;
    const rank = evenPlace(seed, 4, 91);
    const window = [0, 1, 2, 3].map((step) => ttl - rank + step);
    const ttlWhy = (value: number) =>
      value === ttl
        ? 'right'
        : spot.switches > 0 && value === ttl - spot.switches
          ? 'ttl-switches-counted'
          : Math.abs(value - ttl) === 1
            ? 'ttl-off-by-one'
            : 'ttl-off-by-more';
    const packet = packetFrom(net, spot.sender, { dstIp: net.ip.srv ?? '', ttl: ttl0 }) as Captured;
    const srcRight: Candidate = { value: mac(spot.out), why: 'right' };
    const dstRight: Candidate = { value: mac(spot.next), why: 'right' };
    const ttlRight: Candidate = { value: ttl, why: 'right' };
    const before = net.names[spot.before] ?? place.router;
    const after = net.names[spot.after] ?? place.server;
    return {
      kind: 'read-packet',
      title: L('The same packet, another frame', '同じパケット、ちがうフレーム'),
      task: L(
        `Choose the frame's MACs and the TTL as the packet crosses the cable between the ${before.en} and the ${after.en}.`,
        `${before.ja}と${after.ja}のあいだの回線での、フレームの MAC アドレスと TTL を選んでください。`,
      ),
      rule: L(
        'Rule: at every router the frame is written anew for the next cable and the TTL drops by 1; the IP addresses stay.',
        'ルール：ルータを越えるたびにフレームは次の区間用に書き直され、TTL は 1 減る。IP アドレスは変わらない。',
      ),
      brief: L(
        'The packet below is captured as it leaves the sender. On its way it is carried in a new frame on every cable between routers: the frame says which device sent it onto this cable and which takes it off. The MAC addresses of every device are on the diagram.',
        '下のパケットは、送り主から出ていくところでとらえたものです。パケットは、ルータとルータのあいだの区間ごとに新しいフレームに入れて運ばれます。フレームには「この回線でだれが送り出し、だれが受け取るか」が書かれます。各機器の MAC アドレスは図にあります。',
      ),
      topology: net.topology,
      names: net.names,
      packets: [packet],
      outcome: { deliveredTo: 'srv', dropAt: null, reason: null },
      questions: [
        {
          ...question(
            draw,
            'src',
            'frame-src-mac',
            String(srcRight.value),
            distinct(srcRight, [
              { value: mac(spot.sender), why: 'src-sender' },
              { value: mac(spot.in), why: 'src-router-in' },
              { value: mac(spot.next), why: 'src-next' },
              { value: mac('srv'), why: 'src-destination' },
            ]),
          ),
          edgeId: spot.edgeId,
        },
        {
          ...question(
            draw,
            'dst',
            'frame-dst-mac',
            String(dstRight.value),
            distinct(dstRight, [
              { value: mac('srv'), why: 'dst-destination-early' },
              { value: mac(spot.out), why: 'dst-router-out' },
              { value: mac(spot.gateway), why: 'dst-gateway' },
              ...(spot.switches > 0 ? [{ value: mac('sw2:up'), why: 'dst-switch' }] : []),
            ]).slice(0, 5),
          ),
          edgeId: spot.edgeId,
        },
        {
          ...question(
            draw,
            'ttl',
            'ttl-on-link',
            String(ttl),
            distinct(ttlRight, [
              { value: ttl0, why: 'ttl-unchanged' },
              ...window
                .filter((value) => value !== ttl)
                .map((value) => ({ value, why: ttlWhy(value) })),
            ]),
          ),
          edgeId: spot.edgeId,
        },
      ],
      hints: [
        L(
          `Find the cable on the diagram: which device sends the frame onto it, and which takes it off?`,
          `図でその回線を探してください。フレームをそこへ送り出すのはどの機器で、受け取るのはどの機器ですか。`,
        ),
        L(
          'A router writes a new frame: from its own side facing the cable, to the next router or the destination. A switch passes the frame on unchanged.',
          'ルータは新しいフレームを書きます。送り主はルータ自身のその回線側、あて先は次のルータかあて先の機器です。スイッチはフレームを変えずに運びます。',
        ),
        L(
          'Count the routers the packet has crossed before this cable; the TTL is that much less than when it left.',
          'この回線までに越えたルータを数えてください。TTL は、出発したときよりその数だけ減っています。',
        ),
      ],
      lessons: ['/networking/arp', '/simulation/step', '/routing/multi-hop'],
      fingerprint: [place.id, spot.name],
    };
  },
);
