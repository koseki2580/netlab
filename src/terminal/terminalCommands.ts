/**
 * The terminal's commands (REQ-358, REQ-359): each runs on the simulator
 * through the engine, so what it sends is a trace like any other send, and
 * prints what the real tool prints in shape (iputils, traceroute, bind, curl,
 * dhclient, iproute2), with no invented timings.
 */
import { resolveHostSettings } from '../components/NodeDetailPanel/hostSettings';
import { packetLeg, type PacketTrace } from '../types/simulation';
import type { NetlabNode } from '../types/topology';
import { intToIp, ipToInt, networkAddress } from '../utils/cidr';
import { MAX_BODY_BYTES } from './serverApp/serverApp';
import type { TerminalContext, TerminalResult, WebPage } from './types';

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const isIpv4 = (value: string) =>
  IPV4.test(value) && value.split('.').every((part) => Number(part) <= 255);

/** Split a command line into words; quotes keep spaces inside one word. */
export function tokenize(line: string): string[] {
  const words: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false;
  for (const char of line) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) words.push(current);
      current = '';
      started = false;
    } else {
      current += char;
      started = true;
    }
  }
  if (started) words.push(current);
  return words;
}

type Locale = 'en' | 'ja';
const say = (locale: Locale, en: string, ja: string) => (locale === 'ja' ? ja : en);

const USAGE: Record<string, readonly [string, string]> = {
  ping: ['Usage: ping [-c count] host', '使い方: ping [-c 回数] ホスト'],
  traceroute: ['Usage: traceroute host', '使い方: traceroute ホスト'],
  nslookup: ['Usage: nslookup name', '使い方: nslookup 名前'],
  dig: ['Usage: dig name', '使い方: dig 名前'],
  curl: [
    'Usage: curl [-v] [-i] [-I] [-X method] [-H header] [-d data] http://host[:port]/path',
    '使い方: curl [-v] [-i] [-I] [-X メソッド] [-H ヘッダ] [-d データ] http://ホスト[:ポート]/パス',
  ],
  ip: ['Usage: ip addr | ip route', '使い方: ip addr | ip route'],
  arp: ['Usage: arp -a', '使い方: arp -a'],
  ss: ['Usage: ss [-t] [-u] [-l] [-a] [-n]', '使い方: ss [-t] [-u] [-l] [-a] [-n]'],
};

function usage(command: string, locale: Locale): TerminalResult {
  const [en, ja] = USAGE[command] ?? [`Usage: ${command}`, `使い方: ${command}`];
  return { lines: [say(locale, en, ja)] };
}

function help(locale: Locale): TerminalResult {
  const rows: readonly [string, string, string][] = [
    ['ping [-c N] host', 'send echo requests (ICMP)', 'エコー要求を送る（ICMP）'],
    ['traceroute host', 'list the routers on the way', '途中のルータを順に調べる'],
    ['nslookup name', 'ask DNS for an address', 'DNS に名前のアドレスを聞く'],
    ['dig name', 'ask DNS, showing the answer section', 'DNS に聞き、応答の中身を見る'],
    ['curl [-v] [-I] url', 'fetch a web page over HTTP', 'HTTP で Web ページを取ってくる'],
    ['dhclient', 'ask DHCP for an address', 'DHCP でアドレスをもらう'],
    ['ip addr | ip route', 'show this host’s address and routes', 'この機器のアドレスと経路を見る'],
    ['arp -a', 'show the neighbours’ MAC addresses', '近くの機器の MAC アドレスを見る'],
    [
      'ss [-t] [-u] [-l] [-a]',
      'show connections; -l listening sockets, -a both',
      '接続を見る（-l は待ち受け中のソケット、-a は両方）',
    ],
    ['clear', 'clear the screen', '画面を消す'],
  ];
  const width = Math.max(...rows.map(([command]) => command.length));
  return {
    lines: [
      say(
        locale,
        'Commands (they run on the simulator):',
        '使えるコマンド（シミュレータの上で動きます）:',
      ),
      ...rows.map(([command, en, ja]) => `  ${command.padEnd(width)}  ${say(locale, en, ja)}`),
    ],
  };
}

const nodeIp = (context: TerminalContext, node: NetlabNode): string | undefined =>
  context.engine.getRuntimeNodeIp(node.id) ??
  node.data.ip ??
  node.data.interfaces?.find((iface) => iface.ipAddress)?.ipAddress;

/** This host's own address; without one it can send nothing (`connect: Network is unreachable`). */
function ownIp(context: TerminalContext): string | undefined {
  const node = context.engine
    .getTopology()
    .nodes.find((candidate) => candidate.id === context.nodeId);
  return node ? nodeIp(context, node) : undefined;
}

/** A name the way a resolver finds it: the devices' names first (as `/etc/hosts`), then DNS. */
async function resolve(context: TerminalContext, name: string): Promise<string | null> {
  if (isIpv4(name)) return name;
  const wanted = name.toLowerCase();
  const device = context.engine
    .getTopology()
    .nodes.find((node) => node.data.label.toLowerCase() === wanted || node.id === wanted);
  if (device) return nodeIp(context, device) ?? null;
  return context.engine.simulateDns(context.nodeId, name);
}

/** How a probe ended, read from its trace. */
type Outcome =
  | { kind: 'reply'; from: string; ttl: number }
  | { kind: 'time-exceeded' | 'net-unreachable' | 'host-unreachable'; from: string }
  | { kind: 'none' };

function outcome(trace: PacketTrace, srcNodeId: string): Outcome {
  const leg = packetLeg(trace);
  const dropped = leg[leg.length - 1]?.event === 'drop' ? leg[leg.length - 1] : undefined;
  // What came back starts at the next `create`: the reply, or the router's ICMP error.
  const replyStart = trace.hops.findIndex((hop, index) => index > 0 && hop.event === 'create');
  const reply = replyStart === -1 ? undefined : trace.hops[replyStart];
  const back = trace.hops
    .slice(replyStart === -1 ? trace.hops.length : replyStart)
    .find((hop) => hop.nodeId === srcNodeId && hop.event === 'deliver');
  if (!reply || !back) return { kind: 'none' };
  if (dropped?.reason === 'ttl-exceeded') return { kind: 'time-exceeded', from: reply.srcIp };
  // A router whose ARP on its own LAN went unanswered (REQ-371).
  if (dropped?.reason === 'arp-no-reply') return { kind: 'host-unreachable', from: reply.srcIp };
  if (dropped) return { kind: 'net-unreachable', from: reply.srcIp };
  return { kind: 'reply', from: reply.srcIp, ttl: back.ttl };
}

async function ping(
  args: string[],
  context: TerminalContext,
  locale: Locale,
): Promise<TerminalResult> {
  let count = 4;
  const rest: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '-c') {
      count = Number(args[index + 1]);
      index += 1;
    } else rest.push(args[index] as string);
  }
  const host = rest[0];
  if (!host || !Number.isInteger(count) || count < 1 || count > 10) return usage('ping', locale);
  if (!ownIp(context)) return { lines: ['ping: connect: Network is unreachable'] };
  const ip = await resolve(context, host);
  if (!ip) return { lines: [`ping: ${host}: Name or service not known`] };
  const lines = [`PING ${host} (${ip}) 56(84) bytes of data.`];
  let received = 0;
  for (let seq = 1; seq <= count; seq += 1) {
    const result = outcome(await context.engine.ping(context.nodeId, ip), context.nodeId);
    if (result.kind === 'reply') {
      received += 1;
      lines.push(`64 bytes from ${result.from}: icmp_seq=${seq} ttl=${result.ttl}`);
    } else if (result.kind === 'net-unreachable') {
      lines.push(`From ${result.from} icmp_seq=${seq} Destination Net Unreachable`);
    } else if (result.kind === 'host-unreachable') {
      lines.push(`From ${result.from} icmp_seq=${seq} Destination Host Unreachable`);
    } else if (result.kind === 'time-exceeded') {
      lines.push(`From ${result.from} icmp_seq=${seq} Time to live exceeded`);
    }
  }
  const loss = Math.round(((count - received) / count) * 100);
  lines.push(
    '',
    `--- ${host} ping statistics ---`,
    `${count} packets transmitted, ${received} received, ${loss}% packet loss`,
  );
  return { lines };
}

async function traceroute(
  args: string[],
  context: TerminalContext,
  locale: Locale,
): Promise<TerminalResult> {
  const host = args[0];
  if (!host) return usage('traceroute', locale);
  if (!ownIp(context)) return { lines: ['traceroute: connect: Network is unreachable'] };
  const ip = await resolve(context, host);
  if (!ip) return { lines: [`${host}: Name or service not known`] };
  const traces = await context.engine.traceroute(context.nodeId, ip);
  const lines = [`traceroute to ${host} (${ip}), 30 hops max, 60 byte packets`];
  traces.forEach((trace, index) => {
    const result = outcome(trace, context.nodeId);
    const hop = String(index + 1).padStart(2);
    if (result.kind === 'none') lines.push(`${hop}  * * *`);
    else
      lines.push(
        `${hop}  ${result.from} (${result.from})${result.kind === 'net-unreachable' ? ' !N' : result.kind === 'host-unreachable' ? ' !H' : ''}`,
      );
  });
  return { lines };
}

/** The DNS server this host asks: the one its lease named, else the network's first. */
function dnsServer(context: TerminalContext): string | undefined {
  const leased = context.engine.getDhcpLeaseState(context.nodeId)?.dnsServerIp;
  const servers = context.engine
    .getTopology()
    .nodes.filter((node) => node.data.dnsServer != null && typeof node.data.ip === 'string');
  return (servers.find((node) => node.data.ip === leased) ?? servers[0])?.data.ip;
}

/** Ask DNS; `answered` tells an NXDOMAIN (a reply came back) from no reply at all. */
async function lookup(context: TerminalContext, name: string) {
  const engine = context.engine;
  const before = engine.getState().traces.length;
  const address = await engine.simulateDns(context.nodeId, name);
  const server = dnsServer(context);
  const answered =
    address !== null ||
    engine
      .getState()
      .traces.slice(before)
      .some(
        (trace) =>
          trace.status === 'delivered' &&
          trace.hops.some((hop) => hop.srcIp === server && hop.event === 'create') &&
          trace.hops.some((hop) => hop.nodeId === context.nodeId && hop.event === 'deliver'),
      );
  return { address, server, answered };
}

async function nslookup(
  args: string[],
  context: TerminalContext,
  locale: Locale,
): Promise<TerminalResult> {
  const name = args[0];
  if (!name) return usage('nslookup', locale);
  const { address, server, answered } = await lookup(context, name);
  if (!server || !answered)
    return { lines: [';; connection timed out; no servers could be reached'] };
  const head = [`Server:\t\t${server}`, `Address:\t${server}#53`, ''];
  if (!address) return { lines: [...head, `** server can't find ${name}: NXDOMAIN`] };
  return { lines: [...head, `Name:\t${name}`, `Address: ${address}`] };
}

async function dig(
  args: string[],
  context: TerminalContext,
  locale: Locale,
): Promise<TerminalResult> {
  const name = args[0];
  if (!name) return usage('dig', locale);
  const { address, server, answered } = await lookup(context, name);
  if (!server || !answered)
    return { lines: [';; connection timed out; no servers could be reached'] };
  const fqdn = name.endsWith('.') ? name : `${name}.`;
  const lines = [
    `; <<>> DiG (netlab) <<>> ${name}`,
    ';; Got answer:',
    `;; ->>HEADER<<- opcode: QUERY, status: ${address ? 'NOERROR' : 'NXDOMAIN'}`,
    `;; flags: qr rd ra; QUERY: 1, ANSWER: ${address ? 1 : 0}, AUTHORITY: 0, ADDITIONAL: 0`,
    '',
    ';; QUESTION SECTION:',
    `;${fqdn}\t\tIN\tA`,
  ];
  if (address) lines.push('', ';; ANSWER SECTION:', `${fqdn}\t300\tIN\tA\t${address}`);
  lines.push('', `;; SERVER: ${server}#53(${server})`);
  return { lines };
}

const REASON: Record<number, string> = { 200: 'OK', 404: 'Not Found' };
/** The transfer's segment size on an ordinary 1500-byte path (DataTransferController's default). */
const SEGMENT_BYTES = 1400;

/** The most a response's head may take before curl gives up on it, in UTF-8 bytes. */
const MAX_HEAD_BYTES = 16 * 1024;

/**
 * Shows control characters as `cat -v` does (ESC as ^[, DEL as ^?, a C1 control as M-^…), tabs
 * kept: what the server sent must not clear the screen, move the cursor or make links in xterm.
 */
function visible(text: string): string {
  return text.replace(/[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code === 0x7f) return '^?';
    if (code >= 0x80) return `M-^${String.fromCharCode(code - 0x80 + 64)}`;
    return `^${String.fromCharCode(code + 64)}`;
  });
}

/** The flags curl takes a value after. */
const CURL_VALUE_FLAGS = new Set(['-X', '-H', '-d']);
let nextPort = 49152;

async function curl(
  args: string[],
  context: TerminalContext,
  locale: Locale,
): Promise<TerminalResult> {
  const verbose = args.includes('-v');
  const headOnly = args.includes('-I');
  const withHeaders = args.includes('-i');
  const valueOf = (flag: string) =>
    args.flatMap((arg, i) => (arg === flag ? [args[i + 1] ?? ''] : []));
  const typed = args.find(
    (arg, i) => !arg.startsWith('-') && !CURL_VALUE_FLAGS.has(args[i - 1] ?? ''),
  );
  // Like curl, a URL with no scheme is taken as http.
  const url = typed && !/^[a-z]+:\/\//i.test(typed) ? `http://${typed}` : typed;
  const parsed = url ? /^http:\/\/([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url) : null;
  if (!parsed) return usage('curl', locale);
  if (!ownIp(context)) return { lines: ['curl: (7) Failed to connect: Network is unreachable'] };
  const host = parsed[1] as string;
  const path = parsed[3] ?? '/';
  const port = parsed[2] ? Number(parsed[2]) : 80;

  const ip = await resolve(context, host);
  if (!ip) return { lines: [`curl: (6) Could not resolve host: ${host}`] };
  const server = context.engine.getTopology().nodes.find((node) => nodeIp(context, node) === ip);
  const app = server ? context.apps?.[server.id] : undefined;
  const site = server ? context.web?.[server.id] : undefined;
  const refused = [
    `curl: (7) Failed to connect to ${host} port ${port}: Couldn't connect to server`,
  ];
  const listening = app ? port === 80 : site !== undefined && (site.port ?? 80) === port;
  if (!server || !listening) return { lines: refused };

  const engine = context.engine;
  const srcPort = nextPort;
  nextPort = nextPort >= 65000 ? 49152 : nextPort + 1;
  const handshake = await engine.tcpConnect(context.nodeId, server.id, srcPort, port);
  if (!handshake.success || !handshake.connection) return { lines: refused };

  const data = valueOf('-d').slice(-1)[0];
  const method =
    valueOf('-X').slice(-1)[0] ?? (headOnly ? 'HEAD' : data !== undefined ? 'POST' : 'GET');
  const extraHeaders = valueOf('-H');
  const request = [
    `${method} ${path} HTTP/1.1`,
    `Host: ${host}`,
    'User-Agent: curl',
    'Accept: */*',
    ...extraHeaders,
    ...(data !== undefined
      ? [
          ...(extraHeaders.some((h) => /^content-type:/i.test(h))
            ? []
            : ['Content-Type: application/x-www-form-urlencoded']),
          `Content-Length: ${new TextEncoder().encode(data).length}`,
        ]
      : []),
  ];
  const rawRequest = `${request.join('\r\n')}\r\n\r\n${data ?? ''}`;
  await engine.sendTransfer(context.nodeId, server.id, rawRequest, {
    srcPort,
    dstPort: port,
  });

  let headers: string[];
  let bodyText: string;
  // A running app's log line for this request, echoed last: its log card may be far down the page.
  let appLog: string[] = [];
  if (app) {
    const answer = await app.handle(rawRequest);
    if (!answer.ok) {
      await engine.tcpDisconnect(handshake.connection.id);
      return answer.kind === 'timeout'
        ? {
            lines: ['curl: (28) Operation timed out after 1000 milliseconds with 0 bytes received'],
          }
        : { lines: ['curl: (52) Empty reply from server'] };
    }
    const [head = '', ...rest] = answer.raw.split('\r\n\r\n');
    headers = head.split('\r\n');
    bodyText = rest.join('\r\n\r\n');
    appLog = [
      `* ${server.data.label} log: ${method} ${path} → ${visible(String(answer.response.status))}`,
    ];
    // The app's side already caps the body, but the worker could post anything: check again.
    const bytes = (text: string) => new TextEncoder().encode(text).length;
    if (bytes(bodyText) > MAX_BODY_BYTES || bytes(head) > MAX_HEAD_BYTES) {
      await engine.tcpDisconnect(handshake.connection.id);
      return { lines: ['curl: (56) Failure when receiving data from the peer'] };
    }
  } else {
    const page: WebPage = site?.pages[path] ?? {
      status: 404,
      contentType: 'text/plain',
      body: site?.notFound ?? 'Not Found',
    };
    const status = page.status ?? 200;
    headers = [
      `HTTP/1.1 ${status} ${REASON[status] ?? ''}`.trimEnd(),
      `Content-Type: ${page.contentType ?? 'text/plain'}`,
      `Content-Length: ${new TextEncoder().encode(page.body).length}`,
    ];
    bodyText = page.body;
  }
  const response = `${headers.join('\r\n')}\r\n\r\n${headOnly ? '' : bodyText}`;
  const sent = await engine.sendTransfer(server.id, context.nodeId, response, {
    srcPort: port,
    dstPort: srcPort,
  });
  await engine.tcpDisconnect(handshake.connection.id);

  // Everything below that came from the server is printed with its control characters visible.
  const body = headOnly ? [] : bodyText.split('\n').map(visible);
  const shown = headers.map(visible);
  if (headOnly) return { lines: [...shown, ...appLog] };
  if (!verbose) return { lines: [...(withHeaders ? [...shown, '', ...body] : body), ...appLog] };
  // The transfer splits the response into segments of SEGMENT_BYTES; name them when the count agrees.
  const total = sent.payloadSizeBytes;
  const count = sent.expectedChunks;
  const sizes =
    count === Math.ceil(total / SEGMENT_BYTES)
      ? Array.from({ length: count }, (_, i) =>
          i < count - 1 ? SEGMENT_BYTES : total - SEGMENT_BYTES * (count - 1),
        )
      : null;
  const segments = sizes
    ? `* Response sent in ${count} segment${count === 1 ? '' : 's'}: ${sizes.join(' + ')} bytes`
    : `* Response sent in ${count} segments, ${total} bytes`;
  return {
    lines: [
      `*   Trying ${ip}:${port}...`,
      `* Connected to ${host} (${ip}) port ${port}`,
      ...request.map((line) => `> ${line}`),
      '>',
      ...shown.map((line) => `< ${line}`),
      '<',
      ...body,
      // As curl ends with its own "* Connection … left intact": how the response travelled.
      segments,
      ...appLog,
    ],
  };
}

async function dhclient(context: TerminalContext, locale: Locale): Promise<TerminalResult> {
  const engine = context.engine;
  const nodes = engine.getTopology().nodes;
  const self = nodes.find((node) => node.id === context.nodeId);
  if (self && !self.data.dhcpClient?.enabled && self.data.ip) {
    const other = nodes.find((node) => node.data.dhcpClient?.enabled)?.data.label;
    const name = self.data.label;
    return {
      lines: [
        say(
          locale,
          `dhclient: ${name} has a fixed address (${self.data.ip}); DHCP is off on this device.${other ? ` Try it on ${other}.` : ''}`,
          `dhclient: ${name} は固定のアドレス（${self.data.ip}）を使っていて、DHCP は使っていません。${other ? `${other} で試してください。` : ''}`,
        ),
      ],
    };
  }
  const bound = await engine.simulateDhcp(context.nodeId);
  const lease = engine.getDhcpLeaseState(context.nodeId);
  const lines = ['DHCPDISCOVER on eth0 to 255.255.255.255 port 67'];
  if (!bound || !lease?.assignedIp) return { lines: [...lines, 'No DHCPOFFERS received.'] };
  const from = lease.serverIp ?? '';
  lines.push(
    `DHCPOFFER of ${lease.offeredIp ?? lease.assignedIp} from ${from}`,
    `DHCPREQUEST for ${lease.assignedIp} on eth0 to 255.255.255.255 port 67`,
    `DHCPACK of ${lease.assignedIp} from ${from}`,
    `bound to ${lease.assignedIp}.`,
  );
  return { lines };
}

function hostSettings(context: TerminalContext) {
  const engine = context.engine;
  const topology = engine.getTopology();
  const node = topology.nodes.find((candidate) => candidate.id === context.nodeId);
  if (!node) return { node: undefined, settings: {} as ReturnType<typeof resolveHostSettings> };
  const settings = resolveHostSettings(
    node,
    topology,
    engine.getDhcpLeaseState(node.id),
    engine.getRuntimeNodeIp(node.id) ?? undefined,
  );
  return { node, settings };
}

function broadcast(ip: string, prefix: number): string {
  const host = prefix >= 32 ? 0 : 2 ** (32 - prefix) - 1;
  return intToIp((ipToInt(networkAddress(ip, prefix)) | host) >>> 0);
}

function ip(args: string[], context: TerminalContext, locale: Locale): TerminalResult {
  const { node, settings } = hostSettings(context);
  const sub = args[0];
  if (sub === 'addr' || sub === 'a' || sub === 'address') {
    const lines = [
      '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536',
      '    inet 127.0.0.1/8 scope host lo',
      '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500',
    ];
    if (node?.data.mac) lines.push(`    link/ether ${node.data.mac} brd ff:ff:ff:ff:ff:ff`);
    if (settings.ip && settings.prefix !== undefined)
      lines.push(
        `    inet ${settings.ip}/${settings.prefix} brd ${broadcast(settings.ip, settings.prefix)} scope global eth0`,
      );
    else if (settings.ip) lines.push(`    inet ${settings.ip} scope global eth0`);
    return { lines };
  }
  if (sub === 'route' || sub === 'r') {
    const lines: string[] = [];
    if (settings.gateway) lines.push(`default via ${settings.gateway} dev eth0`);
    if (settings.ip && settings.prefix !== undefined)
      lines.push(
        `${networkAddress(settings.ip, settings.prefix)}/${settings.prefix} dev eth0 proto kernel scope link src ${settings.ip}`,
      );
    return { lines };
  }
  return usage('ip', locale);
}

function arp(args: string[], context: TerminalContext, locale: Locale): TerminalResult {
  if (args[0] !== '-a') return usage('arp', locale);
  const table = context.engine.getState().nodeArpTables[context.nodeId] ?? {};
  return {
    lines: Object.entries(table).map(
      ([address, mac]) => `? (${address}) at ${mac} [ether] on eth0`,
    ),
  };
}

/** The UDP services a device's own settings say it runs, as the ports they listen on. */
const UDP_SERVICES = [
  { port: 53, runs: (node: NetlabNode) => node.data.dnsServer !== undefined },
  { port: 67, runs: (node: NetlabNode) => node.data.dhcpServer !== undefined },
] as const;

function ss(args: string[], context: TerminalContext, locale: Locale): TerminalResult {
  // Flags may be grouped (`-ltn`) or apart (`-l -t`); -n is accepted as ports are always numeric.
  if (!args.every((arg) => /^-[tulan]+$/.test(arg))) return usage('ss', locale);
  const flags = new Set(args.flatMap((arg) => [...arg.slice(1)]));
  const all = flags.has('a');
  const listening = all || flags.has('l');
  const connected = all || !flags.has('l');
  // Only TCP is kept as connections, so with no protocol named `ss` shows TCP, as `ss -t` does.
  const udp = flags.has('u');
  const tcp = flags.has('t') || !udp;

  const rows: string[][] = [];
  if (tcp && listening) {
    // What curl connects to: a running app takes the place of the static site.
    const app = context.apps?.[context.nodeId];
    const site = context.web?.[context.nodeId];
    const port = app ? 80 : site ? (site.port ?? 80) : undefined;
    if (port !== undefined)
      rows.push(['tcp', 'LISTEN', '0', '128', `0.0.0.0:${port}`, '0.0.0.0:*']);
  }
  if (tcp && connected) {
    for (const connection of context.engine.getTcpConnectionsForNode(context.nodeId)) {
      const mine = connection.srcNodeId === context.nodeId;
      const local = mine
        ? `${connection.srcIp}:${connection.srcPort}`
        : `${connection.dstIp}:${connection.dstPort}`;
      const peer = mine
        ? `${connection.dstIp}:${connection.dstPort}`
        : `${connection.srcIp}:${connection.srcPort}`;
      const state = connection.state === 'ESTABLISHED' ? 'ESTAB' : connection.state;
      rows.push(['tcp', state, '0', '0', local, peer]);
    }
  }
  if (udp && listening) {
    // UDP services are unconnected sockets, which ss shows only with -l or -a.
    const self = context.engine.getTopology().nodes.find((node) => node.id === context.nodeId);
    for (const service of UDP_SERVICES) {
      if (self && service.runs(self)) {
        rows.push(['udp', 'UNCONN', '0', '0', `0.0.0.0:${service.port}`, '0.0.0.0:*']);
      }
    }
  }

  const header = ['Netid', 'State', 'Recv-Q', 'Send-Q', 'Local Address:Port', 'Peer Address:Port'];
  // Like ss, the Netid column appears only when more than one protocol is shown.
  const table = [header, ...rows].map((row) => (tcp && udp ? row : row.slice(1)));
  const widths = (table[0] ?? []).map((_, column) =>
    Math.max(...table.map((row) => (row[column] ?? '').length)),
  );
  return {
    lines: table.map((row) =>
      row
        .map((cell, column) => cell.padEnd(widths[column] ?? 0))
        .join('  ')
        .trimEnd(),
    ),
  };
}

/** Run one command line on the host `context.nodeId`; a failure is printed, never thrown. */
export async function runCommand(line: string, context: TerminalContext): Promise<TerminalResult> {
  const [command] = tokenize(line);
  try {
    return await dispatch(line, context);
  } catch (error) {
    return { lines: [`${command}: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

async function dispatch(line: string, context: TerminalContext): Promise<TerminalResult> {
  const locale: Locale = context.locale ?? 'en';
  const [command, ...args] = tokenize(line);
  switch (command) {
    case undefined:
      return { lines: [] };
    case 'help':
      return help(locale);
    case 'clear':
      return { lines: [], clear: true };
    case 'ping':
      return ping(args, context, locale);
    case 'traceroute':
      return traceroute(args, context, locale);
    case 'nslookup':
      return nslookup(args, context, locale);
    case 'dig':
      return dig(args, context, locale);
    case 'curl':
      return curl(args, context, locale);
    case 'dhclient':
      return dhclient(context, locale);
    case 'ip':
      return ip(args, context, locale);
    case 'arp':
      return arp(args, context, locale);
    case 'ss':
      return ss(args, context, locale);
    default:
      return { lines: [`${command}: command not found`] };
  }
}

/** The command names, for completion. */
export const TERMINAL_COMMANDS = [
  'help',
  'clear',
  'ping',
  'traceroute',
  'nslookup',
  'dig',
  'curl',
  'dhclient',
  'ip',
  'arp',
  'ss',
] as const;
