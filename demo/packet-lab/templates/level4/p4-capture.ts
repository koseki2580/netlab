/**
 * p4-capture — a captured packet on a path with a list (ACL), a narrow cable
 * and several routers. Where does it die, which field is why, and correct that
 * one field so it arrives. One of four faults, each equally common: TTL too
 * small, a port the list refuses, too big with the "do not split" mark, an
 * address of a network no router knows (README "Read: which of four?"). The
 * other fields are close to their limits, so each must be checked.
 */

import { evenPlace } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { field } from '../../fields';
import type { FieldId, PacketResultCode, PacketValues } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { packetFrom, type RouterCount } from '../shared/nets';
import { guardedPath, SERVICE_PORTS } from '../shared/path';
import { device, fieldCandidate, question, type Captured } from '../shared/read';

const FAULTS = ['ttl', 'dstPort', 'df', 'dstIp'] as const;

export const p4Capture = definePacketTemplate(
  {
    id: 'p4-capture',
    level: 4,
    kind: 'read-packet',
    title: L('Where and why it died', 'どこで、なぜ止まった？'),
  },
  (draw, seed) => {
    const fault = FAULTS[evenPlace(seed, FAULTS.length, 71)] ?? 'ttl';
    // Four routers: the first is where an unknown network dies, and each of
    // the other three is where the other faults die, equally often.
    const count: RouterCount = 4;
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    // Where a fault other than the address shows: one of routers 2 to 4. The
    // list is never on the first router, and the narrow cable never before the
    // list: pieces after the first carry no port, so a list that filters on
    // ports refuses them (as a real one would).
    const shows = 1 + draw.int(count - 1);
    const aclAt =
      fault === 'dstPort' ? shows : fault === 'df' ? 1 + draw.int(shows) : 1 + draw.int(count - 1);
    const narrowAt = fault === 'df' ? shows : aclAt + draw.int(count - aclAt);
    const path = guardedPath(draw, place, plan, seed, count, aclAt, narrowAt);
    const { net, port, mtu } = path;
    const diesAt = shows + 1;
    const wrongPort = SERVICE_PORTS.find((entry) => entry !== port && entry > port) ?? port + 1000;
    const ttl = fault === 'ttl' ? diesAt : count + 1 + draw.int(2);
    const size = fault === 'df' ? mtu + 8 * (1 + draw.int(40)) : mtu - 8 * draw.int(10);
    const dstIp = fault === 'dstIp' ? plan.stranger.at(plan.servers[0]) : (net.ip.srv ?? '');
    const packet = packetFrom(net, 'pc', {
      dstIp,
      ttl,
      df: true,
      carries: 'udp',
      dstPort: fault === 'dstPort' ? wrongPort : port,
      dataBytes: size - 28,
    }) as Captured;
    const stopIndex =
      fault === 'ttl' ? diesAt - 1 : fault === 'dstPort' ? aclAt : fault === 'df' ? narrowAt : 0;
    const stop = net.routers[stopIndex] ?? 'r1';
    const reason = (
      {
        ttl: 'ttl-exceeded',
        dstPort: 'acl-deny',
        df: 'fragmentation-needed',
        dstIp: 'no-route',
      } as const
    )[fault];
    const reference: PacketValues =
      fault === 'ttl'
        ? { ttl: count + 1 }
        : fault === 'dstPort'
          ? { dstPort: port }
          : fault === 'df'
            ? { df: false }
            : { dstIp: net.ip.srv ?? '' };
    const near: Record<
      (typeof FAULTS)[number],
      { values: PacketValues; code: PacketResultCode; note: string }
    > = {
      ttl: { values: { ttl: count }, code: 'ttl-ran-out', note: 'TTL one short' },
      dstPort: { values: { dstPort: port + 1 }, code: 'filter-refused', note: 'port one off' },
      df: { values: { ttl: 64 }, code: 'too-big-not-split', note: 'the wrong field changed' },
      dstIp: {
        values: { dstIp: plan.stranger.at(plan.servers[0] + 1) },
        code: 'no-route',
        note: 'still another network',
      },
    };
    const extra: PacketValues = fault === 'df' ? { ttl: 99 } : { df: false };
    const srv = net.names.srv ?? place.server;
    const stopWhy = (id: string) => (id === stop ? 'right' : `not-${id}`);
    const causeWhy = (id: FieldId) => (id === fault ? 'right' : `not-${id}`);
    return {
      kind: 'read-packet',
      title: L(`A packet that never reached ${the(srv)}`, `${srv.ja}に届かなかったパケット`),
      task: L(
        'Choose where this packet dies and which field is why; then correct that one field.',
        'このパケットが止まる場所と、原因の欄を選んでください。そのあと、その欄を 1 つだけ直します。',
      ),
      rule: L(
        'Rule: on its way a router checks the TTL, its list (ACL), the route and the size against the next cable.',
        'ルール：ルータは、TTL・一覧（ACL）・行き先の道・次の回線に入る大きさを確かめる。',
      ),
      brief: L(
        'Someone captured this packet as it left the sender, and it never arrived. Every device it would cross is on the diagram: the routers, the list on one of them, and a narrow cable with its limit (MTU). Work out what happens to it at each router in turn.',
        '送り主から出ていくところで、このパケットをとらえました。パケットは届きませんでした。通るはずの機器（ルータ、その 1 台の一覧、上限（MTU）付きの細い回線）は、すべて図にあります。ルータごとに、順に何が起きるかを考えてください。',
      ),
      topology: net.topology,
      names: net.names,
      packets: [packet],
      outcome: { deliveredTo: null, dropAt: stop, reason },
      questions: [
        question(
          draw,
          'stops',
          'stops-at',
          stop,
          net.routers.map((id) => device(net.names, id, stopWhy(id))),
        ),
        question(
          draw,
          'cause',
          'cause',
          fault,
          FAULTS.map((id) => fieldCandidate(id, causeWhy(id))),
        ),
      ],
      fix: {
        fields: [field('dstIp'), field('ttl'), field('df'), field('dstPort')],
        goals: [
          {
            id: 'delivered',
            kind: 'delivered',
            to: 'srv',
            label: L(`It reaches ${the(srv)}`, `${srv.ja}に届く`),
          },
          {
            id: 'one-change',
            kind: 'max-changes',
            max: 1,
            label: L('One field changed at most', '変える欄は 1 つまで'),
          },
        ],
        reference,
        wrongAnswers: [
          near[fault],
          {
            values: { ...reference, ...extra },
            code: 'too-many-changes',
            note: 'a sound field changed too',
          },
        ],
      },
      hints: [
        L(
          'Follow the packet router by router. At each one, check four things: the TTL it comes in with, the list, whether it knows the destination, and the cable ahead.',
          'ルータを 1 台ずつたどり、それぞれで 4 つを確かめてください。着いたときの TTL、一覧、あて先への道、先の回線です。',
        ),
        L(
          'The values are close to their limits on purpose: count the TTL exactly, and compare the size with the MTU and the port with the list.',
          '値はわざと限界の近くにしてあります。TTL は正確に数え、大きさは MTU と、ポート番号は一覧と見比べてください。',
        ),
        L(
          'The first check that fails decides where it dies and why; correct just that field.',
          '最初に引っかかった確認が、止まる場所と原因を決めます。直すのはその欄だけです。',
        ),
      ],
      lessons: [
        '/simulation/trace-inspector',
        '/simulation/acl',
        '/networking/mtu-fragmentation',
        '/routing/multi-hop',
      ],
      fingerprint: [place.id, fault, count, stopIndex, aclAt, narrowAt],
    };
  },
);
