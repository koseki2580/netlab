/**
 * The ICMP lesson (REQ-368): four situations on Host A → R1 → R2 → Host B, and
 * the ICMP message each one brings back, read from the simulator's trace.
 */
import { buildFragmentedEchoTopology } from '../../src/scenarios/fragmented-echo';
import type { PacketTrace } from '../../src/types/simulation';
import type { NetworkTopology } from '../../src/types/topology';

/** The low-MTU link between R1 and R2. */
export const ICMP_LINK_MTU = 1400;
export const ICMP_SENDER = 'host-a';
export const ICMP_TARGET_IP = '203.0.113.10';
export const ICMP_UNROUTED_IP = '198.51.100.7';
/** An address of Host B's LAN that no device has. */
export const ICMP_ABSENT_IP = '203.0.113.99';

/**
 * The MTU lesson's network, with R2's default route taken away: R2 then has
 * no route for an address outside its networks, and says so itself.
 */
export function icmpTopology(): NetworkTopology {
  const topology = buildFragmentedEchoTopology(ICMP_LINK_MTU);
  return {
    ...topology,
    nodes: topology.nodes.map((node) =>
      node.id === 'router-r2'
        ? {
            ...node,
            data: {
              ...node.data,
              staticRoutes: (node.data.staticRoutes ?? []).filter(
                (route) => route.destination !== '0.0.0.0/0',
              ),
            },
          }
        : node,
    ),
  };
}

export type IcmpKind =
  | 'echo-reply'
  | 'time-exceeded'
  | 'net-unreachable'
  | 'host-unreachable'
  | 'frag-needed'
  | 'nothing';

/** What came back to the sender, read from the trace. */
export interface IcmpOutcome {
  readonly kind: IcmpKind;
  readonly type?: number;
  readonly code?: number;
  /** The address the answer came from. */
  readonly from?: string;
  /** The device that sent it. */
  readonly fromDevice?: string;
  /** For frag-needed: the next-hop MTU it reports. */
  readonly mtu?: number;
}

export const ICMP_CODES: Record<Exclude<IcmpKind, 'nothing'>, { type: number; code: number }> = {
  'echo-reply': { type: 0, code: 0 },
  'time-exceeded': { type: 11, code: 0 },
  'net-unreachable': { type: 3, code: 0 },
  'host-unreachable': { type: 3, code: 1 },
  'frag-needed': { type: 3, code: 4 },
};

/** Read the answer to `trace` that reached `sender`. */
export function readIcmpOutcome(trace: PacketTrace, sender: string): IcmpOutcome {
  const replyStart = trace.hops.findIndex((hop, index) => index > 0 && hop.event === 'create');
  const reply = replyStart === -1 ? undefined : trace.hops[replyStart];
  const arrived = trace.hops
    .slice(replyStart === -1 ? trace.hops.length : replyStart)
    .some((hop) => hop.nodeId === sender && hop.event === 'deliver');
  if (!reply || !arrived) return { kind: 'nothing' };
  const drop = trace.hops.slice(0, replyStart).find((hop) => hop.event === 'drop');
  const kind: IcmpKind = !drop
    ? 'echo-reply'
    : drop.reason === 'ttl-exceeded'
      ? 'time-exceeded'
      : drop.reason === 'fragmentation-needed'
        ? 'frag-needed'
        : drop.reason === 'no-route'
          ? 'net-unreachable'
          : drop.reason === 'arp-no-reply'
            ? 'host-unreachable'
            : 'nothing';
  if (kind === 'nothing') return { kind };
  return {
    kind,
    ...ICMP_CODES[kind],
    from: reply.srcIp,
    fromDevice: reply.nodeLabel,
    ...(kind === 'frag-needed' && drop?.nextHopMtu !== undefined ? { mtu: drop.nextHopMtu } : {}),
  };
}

export type IcmpCaseId = 'echo' | 'ttl' | 'no-route' | 'no-host' | 'too-big';

export interface IcmpCase {
  readonly id: IcmpCaseId;
  readonly situation: { readonly en: string; readonly ja: string };
  readonly expected: IcmpKind;
  readonly explain: { readonly en: string; readonly ja: string };
}

export const ICMP_CASES: readonly IcmpCase[] = [
  {
    id: 'echo',
    situation: {
      en: 'Host A pings Host B (203.0.113.10), two routers away.',
      ja: 'Host A が、ルータ 2 台の先の Host B（203.0.113.10）に ping します。',
    },
    expected: 'echo-reply',
    explain: {
      en: 'ping sends an Echo Request (type 8); the destination answers with an Echo Reply (type 0) from its own address. Only the destination answers it.',
      ja: 'ping は Echo Request（タイプ 8）を送り、宛先が自分のアドレスから Echo Reply（タイプ 0）で答えます。答えるのは宛先だけです。',
    },
  },
  {
    id: 'ttl',
    situation: {
      en: 'The same ping, sent with TTL 1.',
      ja: '同じ ping を、TTL 1 で送ります。',
    },
    expected: 'time-exceeded',
    explain: {
      en: 'R1 would take the TTL to 0, so it drops the packet and answers Time Exceeded (type 11, code 0) from its own address. traceroute is built on this: TTL 1, 2, 3… each draw an answer from the next router.',
      ja: 'R1 で TTL が 0 になるので、R1 はパケットを捨て、自分のアドレスから Time Exceeded（タイプ 11、コード 0）を返します。traceroute はこの仕組みでできています。TTL を 1、2、3… と増やすと、1 台先ずつのルータが答えます。',
    },
  },
  {
    id: 'no-route',
    situation: {
      en: 'Host A pings 198.51.100.7. R1 sends it on by its default route; R2 has no route for it.',
      ja: 'Host A が 198.51.100.7 に ping します。R1 はデフォルトルートで先へ送りますが、R2 にはその経路がありません。',
    },
    expected: 'net-unreachable',
    explain: {
      en: 'The router with no route answers, not the first one: R2 drops the packet and sends Destination Unreachable, network unreachable (type 3, code 0), from the address it received it on.',
      ja: '答えるのは最初のルータではなく、経路を持たないルータです。R2 がパケットを捨て、受け取ったインタフェースのアドレスから Destination Unreachable、ネットワーク到達不能（タイプ 3、コード 0）を返します。',
    },
  },
  {
    id: 'no-host',
    situation: {
      en: 'Host A pings 203.0.113.99: on Host B’s network, but no device there has that address.',
      ja: 'Host A が 203.0.113.99 に ping します。Host B のネットワークの中のアドレスですが、その番号を持つ機器はいません。',
    },
    expected: 'host-unreachable',
    explain: {
      en: 'R2 has the network (it is connected), so it asks by ARP who has 203.0.113.99. Nobody answers, so R2 drops the packet and sends Destination Unreachable, host unreachable (type 3, code 1): the network is there, the host is not.',
      ja: 'R2 はそのネットワークを持っている（直結）ので、ARP で「203.0.113.99 はだれ？」と尋ねます。答える機器がいないので、R2 はパケットを捨て、Destination Unreachable、ホスト到達不能（タイプ 3、コード 1）を返します。ネットワークはあるが、その機器がいない、という知らせです。',
    },
  },
  {
    id: 'too-big',
    situation: {
      en: 'Host A sends 1,500 bytes with Don’t Fragment set. The link from R1 to R2 carries at most 1,400.',
      ja: 'Host A が 1,500 バイトを「断片化禁止（DF）」付きで送ります。R1 から R2 への回線は 1,400 バイトまでしか運べません。',
    },
    expected: 'frag-needed',
    explain: {
      en: 'R1 may not split it, so it drops it and answers Destination Unreachable, fragmentation needed (type 3, code 4), with the next hop’s MTU, 1400. The sender learns the path MTU from this (path MTU discovery, RFC 1191).',
      ja: 'R1 は分けることを禁じられているので、パケットを捨て、次の区間の MTU 1400 を添えて Destination Unreachable、断片化が必要（タイプ 3、コード 4）を返します。送り主はこれで経路の MTU を知ります（経路 MTU 探索、RFC 1191）。',
    },
  },
];
