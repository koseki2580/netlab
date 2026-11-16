/**
 * The tasks of the terminal page (REQ-363): each is met by a command whose
 * output shows the goal reached, and then explains what that output means.
 */
export interface Bilingual {
  readonly en: string;
  readonly ja: string;
}

/** One command the learner ran, and what it printed. */
export interface TerminalRun {
  readonly nodeId: string;
  readonly line: string;
  readonly lines: readonly string[];
}

export interface Mission {
  readonly id: string;
  readonly goal: Bilingual;
  readonly hint: Bilingual;
  /** Whether this run reached the goal. */
  readonly met: (run: TerminalRun) => boolean;
  /** Shown once the goal is reached: how to read what was printed. */
  readonly explain: Bilingual;
}

const first = (run: TerminalRun) => run.line.trim().split(/\s+/)[0] ?? '';
const printed = (run: TerminalRun, pattern: RegExp) => run.lines.some((line) => pattern.test(line));

export const MISSIONS: readonly Mission[] = [
  {
    id: 'reach',
    goal: { en: 'Check that the client reaches www', ja: 'client から www に届くか確かめる' },
    hint: { en: 'ping, on client', ja: 'client で ping' },
    met: (run) =>
      run.nodeId === 'client' &&
      first(run) === 'ping' &&
      printed(run, /^64 bytes from 10\.0\.2\.80:/) &&
      printed(run, / 0% packet loss$/),
    explain: {
      en: 'ttl=63: www sent its reply with TTL 64, and the router took one off on the way. Ping the router itself (10.0.1.1) and the reply arrives with 64: nothing forwarded it.',
      ja: 'ttl=63 は、www が TTL 64 で返した応答を、途中のルータが 1 減らした印です。ルータ自身（10.0.1.1）に ping すると、転送する機器がないので 64 のまま届きます。',
    },
  },
  {
    id: 'dns',
    goal: {
      en: 'Find the address of www.example.test with DNS',
      ja: 'www.example.test のアドレスを DNS で調べる',
    },
    hint: { en: 'nslookup or dig', ja: 'nslookup か dig を使う' },
    met: (run) =>
      ['nslookup', 'dig'].includes(first(run)) &&
      printed(run, /(Address: 10\.0\.2\.80|\tA\t10\.0\.2\.80)$/),
    explain: {
      en: 'The host asked the DNS server 10.0.2.53 over UDP port 53, and the answer’s A record gave the address. “nslookup www” fails: “www” is a device name the terminal knows like /etc/hosts, not a name in DNS.',
      ja: 'この機器は DNS サーバ 10.0.2.53 に UDP の 53 番で聞き、応答の A レコードがアドレスを教えました。「nslookup www」 が失敗するのは、「www」は端末が /etc/hosts のように知っている機器の名前で、DNS には登録されていないからです。',
    },
  },
  {
    id: 'web',
    goal: {
      en: 'Fetch the web page of www.example.test',
      ja: 'www.example.test の Web ページを取ってくる',
    },
    hint: { en: 'curl', ja: 'curl を使う' },
    met: (run) => first(run) === 'curl' && printed(run, /(Hello from www|HTTP\/1\.1 200 OK)/),
    explain: {
      en: 'In the timeline: the DNS question and answer, then TCP’s SYN, SYN-ACK and ACK, the GET and the page, and the FINs that close the connection. “curl -v” prints the request (>) and the response’s headers (<).',
      ja: 'タイムラインに、DNS の問い合わせと応答、TCP の SYN・SYN-ACK・ACK、GET とページ、接続を閉じる FIN が並びます。「curl -v」 にすると、要求（>）と応答の見出し（<）も表示されます。',
    },
  },
  {
    id: 'dhcp',
    goal: { en: 'Give the laptop an address', ja: 'laptop にアドレスを持たせる' },
    hint: {
      en: 'switch the terminal to laptop, then dhclient',
      ja: '端末を laptop に切り替えて dhclient',
    },
    met: (run) =>
      run.nodeId === 'laptop' && first(run) === 'dhclient' && printed(run, /^bound to /),
    explain: {
      en: 'DHCP in four messages: DISCOVER (a broadcast, since the laptop has no address yet), OFFER, REQUEST and ACK. “ip addr” now shows the address, and “ip route” the gateway the lease named.',
      ja: 'DHCP は 4 つのメッセージで進みます。DISCOVER（laptop にはまだアドレスがないので全員あて）、OFFER、REQUEST、ACK です。このあと 「ip addr」 にアドレスが、「ip route」 にリースで渡されたゲートウェイが出ます。',
    },
  },
  {
    id: 'arp',
    goal: { en: 'Find the gateway’s MAC address', ja: 'ゲートウェイの MAC アドレスを調べる' },
    hint: { en: 'send something first, then arp -a', ja: '何か送ってから arp -a' },
    met: (run) => first(run) === 'arp' && printed(run, /^\? \(10\.0\.1\.1\) at /),
    explain: {
      en: 'To reach www, on another network, the host sends its frames to the gateway’s MAC. ARP only asks inside one LAN, so www’s MAC never appears here.',
      ja: '別のネットワークにある www へは、フレームをゲートウェイの MAC あてに送ります。ARP は 1 つの LAN の中でしか聞かないので、www の MAC はここに出ません。',
    },
  },
  {
    id: 'unreachable',
    goal: {
      en: 'See what happens with an address no route covers',
      ja: '経路のない宛先に送ると何が起きるか見る',
    },
    hint: { en: 'ping 192.0.2.99', ja: 'ping 192.0.2.99 を打つ' },
    met: (run) => first(run) === 'ping' && printed(run, /Destination Net Unreachable$/),
    explain: {
      en: 'The router has no route for 192.0.2.99: it drops the packet and tells the sender with ICMP Destination Unreachable, type 3 code 0, from its own address.',
      ja: 'ルータには 192.0.2.99 への経路がありません。パケットを捨て、自分のアドレスから ICMP の Destination Unreachable（タイプ 3、コード 0）で送り主に知らせます。',
    },
  },
  {
    id: 'path',
    goal: {
      en: 'Count the routers between client and www',
      ja: 'client と www のあいだのルータを数える',
    },
    hint: { en: 'traceroute', ja: 'traceroute を使う' },
    met: (run) =>
      first(run) === 'traceroute' &&
      printed(run, /^ {1}2 {2}10\.0\.2\.80 /) &&
      printed(run, /^ {1}1 {2}10\.0\.1\.1 /),
    explain: {
      en: 'The probe with TTL 1 runs out at the router, which answers “time exceeded” from 10.0.1.1; the one with TTL 2 reaches www. One line per router, then the destination.',
      ja: 'TTL 1 の調査パケットはルータで寿命が尽き、ルータが 10.0.1.1 から「時間超過」を返します。TTL 2 のものは www に届きます。ルータ 1 台につき 1 行、最後が宛先です。',
    },
  },
];

/** The missions this run completes, among those not yet done. */
export function completedBy(run: TerminalRun, done: ReadonlySet<string>): string[] {
  return MISSIONS.filter((mission) => !done.has(mission.id) && mission.met(run)).map(
    (mission) => mission.id,
  );
}
