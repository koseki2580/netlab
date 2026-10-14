/**
 * p4-two-faults — a packet with two things wrong. The first stops it before
 * the second can show: fixing one reveals the other. At most two fields may
 * change, so changing everything does not pass.
 *
 * Pairs: the list refuses its port and the TTL is one short; it is too big
 * with the "do not split" mark and the TTL is one short; the list refuses it
 * and, further on, it is too big. The two faults are always at different
 * routers, so nothing rests on the order in which one router checks. The
 * narrow cable is never before the list: pieces after the first carry no
 * port, so a list that filters on ports refuses them (as a real one would).
 */

import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { field } from '../../fields';
import type { PacketResultCode, PacketValues } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { packetFrom, type RouterCount } from '../shared/nets';
import { guardedPath, SERVICE_PORTS } from '../shared/path';

const PAIRS = ['acl-ttl', 'df-ttl', 'acl-df'] as const;

const CODE: Record<'acl' | 'df' | 'ttl', PacketResultCode> = {
  acl: 'filter-refused',
  df: 'too-big-not-split',
  ttl: 'ttl-ran-out',
};

export const p4TwoFaults = definePacketTemplate(
  {
    id: 'p4-two-faults',
    level: 4,
    kind: 'build-packet',
    title: L('Two things wrong', '直すところが 2 つ'),
  },
  (draw, seed) => {
    const pair = draw.pick(PAIRS);
    const count = draw.pick([3, 4] as const) as RouterCount;
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const [first, second] = pair.split('-') as ['acl' | 'df', 'acl' | 'df' | 'ttl'];
    // The first fault sits before the last router; a second list/cable fault further on.
    const firstAt = draw.int(count - 1);
    const secondAt = second === 'ttl' ? count - 1 : firstAt + 1 + draw.int(count - 1 - firstAt);
    // The sound one of the list and the cable: the cable at or after the list.
    const aclAt = first === 'acl' ? firstAt : draw.int(firstAt + 1);
    const narrowAt =
      first === 'df' ? firstAt : second === 'df' ? secondAt : firstAt + draw.int(count - firstAt);
    const path = guardedPath(draw, place, plan, seed, count, aclAt, narrowAt);
    const { net, port, mtu } = path;
    const faulty = new Set([first, second]);
    const wrongPort = SERVICE_PORTS.find((entry) => entry !== port && entry < port) ?? port + 1;
    const ttl = faulty.has('ttl') ? count : count + 1 + draw.int(3);
    const size = faulty.has('df') ? mtu + 8 * (1 + draw.int(40)) : mtu - 8 * draw.int(10);
    const fix = (fault: 'acl' | 'df' | 'ttl'): PacketValues =>
      fault === 'acl' ? { dstPort: port } : fault === 'df' ? { df: false } : { ttl: count + 1 };
    const reference = { ...fix(first), ...fix(second) };
    const sound = (['ttl', 'df'] as const).find((entry) => !faulty.has(entry));
    const extra: PacketValues =
      sound === 'ttl' ? { ttl: 200 } : sound === 'df' ? { df: false } : { dstPort: wrongPort };
    const pc = net.names.pc ?? place.pcs[0];
    const srv = net.names.srv ?? place.server;
    return {
      kind: 'build-packet',
      title: L(`Still not at ${the(srv)}`, `まだ${srv.ja}に届かない`),
      task: L(
        `Correct the packet so that it reaches ${the(srv)}. Change two fields at most.`,
        `パケットが${srv.ja}に届くように直してください。変える欄は 2 つまでです。`,
      ),
      rule: L(
        'Rule: a packet stops at the first check it fails; what lies beyond shows only once that is fixed.',
        'ルール：パケットは最初に引っかかった所で止まる。その先の問題は、それを直して初めて見える。',
      ),
      brief: L(
        `A UDP packet from ${the(pc)} does not reach ${the(srv)}. On the way are a router with a list (ACL), a narrow cable with its limit (MTU) and several routers that each take 1 off the TTL. More than one thing about the packet is wrong.`,
        `${pc.ja}からの UDP のパケットが、${srv.ja}に届きません。途中には、一覧（ACL）を持つルータ、上限（MTU）付きの細い回線、TTL を 1 ずつ減らすルータがあります。パケットのおかしなところは 1 つではありません。`,
      ),
      topology: net.topology,
      names: net.names,
      packet: packetFrom(net, 'pc', {
        dstIp: net.ip.srv ?? '',
        ttl,
        df: true,
        carries: 'udp',
        dstPort: faulty.has('acl') ? wrongPort : port,
        dataBytes: size - 28,
      }),
      fields: [field('ttl'), field('df'), field('dstPort')],
      goals: [
        {
          id: 'delivered',
          kind: 'delivered',
          to: 'srv',
          label: L(`It reaches ${the(srv)}`, `${srv.ja}に届く`),
        },
        {
          id: 'two-changes',
          kind: 'max-changes',
          max: 2,
          label: L('Two fields changed at most', '変える欄は 2 つまで'),
        },
      ],
      reference,
      wrongAnswers: [
        { values: fix(first), code: CODE[second], note: 'only the first fixed: the second shows' },
        { values: fix(second), code: CODE[first], note: 'only the second fixed' },
        {
          values: { ...reference, ...extra },
          code: 'too-many-changes',
          note: 'a sound field changed too',
        },
      ],
      hints: [
        L(
          'Send it as it is and see where it stops and why. That is the first thing to fix, not the only one.',
          'まずそのまま送り、どこで、なぜ止まるかを見てください。それが最初に直すところですが、1 つだけではありません。',
        ),
        L(
          'Before sending again, follow it on beyond that router: count the TTL to the end, and check the list and the cable it will meet.',
          '送り直す前に、そのルータより先もたどってください。最後まで TTL を数え、出会う一覧と回線も確かめます。',
        ),
        L(
          'Two of these need changing: the TTL (count the routers), the port (read the list), the "do not split" mark (compare the size with the MTU).',
          '直すのは次のうち 2 つです。TTL（ルータを数える）、ポート番号（一覧を読む）、「分割しない」の印（大きさと MTU を比べる）。',
        ),
      ],
      lessons: [
        '/simulation/trace-inspector',
        '/simulation/acl',
        '/networking/mtu-fragmentation',
        '/routing/multi-hop',
      ],
      fingerprint: [place.id, pair, count, firstAt, secondAt],
    };
  },
);
