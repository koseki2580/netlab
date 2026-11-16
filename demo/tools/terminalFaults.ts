/**
 * Faults to find with the terminal (REQ-364): the network is broken in one
 * way, the learner sees one symptom — the web page will not open on the
 * client — and finds the cause with commands. Each cause shows itself in a
 * different set of outputs, so it can be told apart by evidence.
 */
import type { WebSites } from '../../src/terminal/types';
import type { NetworkTopology } from '../../src/types/topology';
import type { Bilingual } from './terminalMissions';

export type CauseId = 'dns-unreachable' | 'web-down' | 'core-link' | 'client-address';

export interface Cause {
  readonly id: CauseId;
  readonly label: Bilingual;
  /** What the commands would show if this were the cause: said after a wrong pick. */
  readonly wouldShow: Bilingual;
  /** Said after the right pick: the evidence, and what fixes it on a real network. */
  readonly explain: Bilingual;
}

export interface Fault {
  readonly id: string;
  readonly cause: CauseId;
  readonly apply: (topology: NetworkTopology) => NetworkTopology;
  readonly web: (sites: WebSites) => WebSites;
}

const cableDown =
  (edgeId: string) =>
  (topology: NetworkTopology): NetworkTopology => ({
    ...topology,
    edges: topology.edges.map((edge) =>
      edge.id === edgeId ? { ...edge, data: { ...edge.data, state: 'down' as const } } : edge,
    ),
  });

const same = (sites: WebSites) => sites;

export const FAULTS: readonly Fault[] = [
  { id: 'f1', cause: 'dns-unreachable', apply: cableDown('e-dns'), web: same },
  {
    id: 'f2',
    cause: 'web-down',
    apply: (topology) => topology,
    web: (sites) => Object.fromEntries(Object.entries(sites).filter(([id]) => id !== 'www')),
  },
  { id: 'f3', cause: 'core-link', apply: cableDown('e-up-b'), web: same },
  {
    id: 'f4',
    cause: 'client-address',
    apply: (topology) => ({
      ...topology,
      nodes: topology.nodes.map((node) =>
        node.id === 'client' ? { ...node, data: { ...node.data, ip: '10.0.3.10' } } : node,
      ),
    }),
    web: same,
  },
];

export const CAUSES: readonly Cause[] = [
  {
    id: 'dns-unreachable',
    label: { en: 'The DNS server cannot be reached', ja: 'DNS サーバに届かない' },
    wouldShow: {
      en: 'Then nslookup would time out and ping 10.0.2.53 would lose everything, while ping www (by its device name, no DNS) still answered.',
      ja: 'それなら nslookup がタイムアウトし、ping 10.0.2.53 は届かず、それでも ping www（機器の名前で引くので DNS を使わない）は届くはずです。',
    },
    explain: {
      en: 'curl said “Could not resolve host”, nslookup timed out and ping 10.0.2.53 got no reply — yet ping www reached the server by its address. The network works; only the DNS server is cut off: its cable is out. Plug it back in, and the name resolves again.',
      ja: 'curl は「Could not resolve host」、nslookup はタイムアウト、ping 10.0.2.53 は応答なし。それでも ping www はアドレスで www に届きました。ネットワークは動いていて、DNS サーバだけが切り離されています（ケーブルが抜けています）。挿し直せば名前がまた引けます。',
    },
  },
  {
    id: 'web-down',
    label: { en: 'The web server is not running', ja: 'Web サーバが動いていない' },
    wouldShow: {
      en: 'Then nslookup would answer 10.0.2.80 and ping www would answer, but curl would say “Couldn’t connect to server”.',
      ja: 'それなら nslookup は 10.0.2.80 を答え、ping www も届くのに、curl だけが「Couldn’t connect to server」になるはずです。',
    },
    explain: {
      en: 'DNS answered 10.0.2.80 and ping reached www, so the name and the path are fine. curl could not connect to port 80: nothing on www is listening — the web server program is down. Start it again on www.',
      ja: 'DNS は 10.0.2.80 を答え、ping も www に届くので、名前も経路も正常です。curl は 80 番につながりませんでした。www で Web サーバのプログラムが止まっていて、80 番を待ち受けている者がいません。www で起動し直せば直ります。',
    },
  },
  {
    id: 'core-link',
    label: { en: 'The line past the router is cut', ja: 'ルータの先の回線が切れている' },
    wouldShow: {
      en: 'Then ping 10.0.1.1 (the router) would answer but nothing past it would, and traceroute would stop after the router with * * *.',
      ja: 'それなら ping 10.0.1.1（ルータ）は届くのに、その先には何も届かず、traceroute はルータの次から * * * になるはずです。',
    },
    explain: {
      en: 'The router (10.0.1.1) answered, but www and the DNS server behind it did not, and traceroute stopped after hop 1. Everything past the router is unreachable: the line from the router to the server LAN is down.',
      ja: 'ルータ（10.0.1.1）は応答するのに、その先の www にも DNS サーバにも届かず、traceroute は 1 行目のあと止まりました。ルータより先がすべて届かない、つまりルータからサーバ側の LAN への回線が切れています。',
    },
  },
  {
    id: 'client-address',
    label: { en: 'The client’s address is wrong', ja: 'client のアドレスが間違っている' },
    wouldShow: {
      en: 'Then even ping 10.0.1.1, the router on the client’s own LAN, would get no reply, and ip addr would show an address outside 10.0.1.0/24.',
      ja: 'それなら同じ LAN のルータ 10.0.1.1 への ping すら届かず、ip addr には 10.0.1.0/24 の外のアドレスが出るはずです。',
    },
    explain: {
      en: 'Not even the router on the client’s own LAN answered, and ip addr shows 10.0.3.10 while the LAN is 10.0.1.0/24 (ip route has no default route). The client is set on the wrong network: give it an address in 10.0.1.0/24, or use DHCP.',
      ja: '同じ LAN のルータすら応答せず、ip addr は 10.0.3.10。この LAN は 10.0.1.0/24 です（ip route にもデフォルトルートがありません）。client が別のネットワークのアドレスになっています。10.0.1.0/24 のアドレスにするか、DHCP を使えば直ります。',
    },
  },
];

/** The cause of a fault, by id. */
export const causeOf = (id: CauseId): Cause => CAUSES.find((cause) => cause.id === id) as Cause;
