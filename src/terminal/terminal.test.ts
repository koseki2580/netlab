/**
 * REQ-358, REQ-359 — commands typed in a terminal run on the simulator and
 * print what the real tools print (TC-1700..TC-1709).
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../cli/runtime';
import { HookEngine } from '../hooks/HookEngine';
import { MainThreadEngine } from '../simulation/worker/MainThreadEngine';
import type { NetworkTopology } from '../types/topology';
import { runCommand, tokenize } from './terminalCommands';
import { TERMINAL_WEB_SITES, terminalNetwork } from './terminalNetwork';
import type { TerminalContext } from './types';

function setUp(topology: NetworkTopology = terminalNetwork(), nodeId = 'client') {
  const engine = new MainThreadEngine(enrichTopology(topology), new HookEngine());
  const context: TerminalContext = { engine, nodeId, web: TERMINAL_WEB_SITES };
  const run = (line: string, extra: Partial<TerminalContext> = {}) =>
    runCommand(line, { ...context, ...extra });
  return { engine, run };
}

const text = (result: { lines: readonly string[] }) => result.lines.join('\n');

describe('TC-1700: a line is split into words', () => {
  it('keeps quoted words whole and ignores extra spaces', () => {
    expect(tokenize('  curl   "http://www.example.test/a b"  -v ')).toEqual([
      'curl',
      'http://www.example.test/a b',
      '-v',
    ]);
    expect(tokenize("dig 'www.example.test'")).toEqual(['dig', 'www.example.test']);
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('TC-1701: ping a server one router away', () => {
  it('prints a reply per request and no loss, and the pings are traces', async () => {
    const { engine, run } = setUp();
    const before = engine.getState().traces.length;
    const result = await run('ping -c 2 10.0.2.80');
    expect(result.lines[0]).toBe('PING 10.0.2.80 (10.0.2.80) 56(84) bytes of data.');
    expect(result.lines).toContain('64 bytes from 10.0.2.80: icmp_seq=1 ttl=63');
    expect(result.lines).toContain('64 bytes from 10.0.2.80: icmp_seq=2 ttl=63');
    expect(result.lines).toContain('--- 10.0.2.80 ping statistics ---');
    expect(result.lines).toContain('2 packets transmitted, 2 received, 0% packet loss');
    expect(engine.getState().traces.length).toBeGreaterThanOrEqual(before + 2);
  });
});

describe('TC-1702: ping an address no route covers', () => {
  it('prints the router’s Destination Net Unreachable and 100% loss', async () => {
    const { run } = setUp();
    const result = await run('ping -c 1 192.0.2.99');
    expect(result.lines).toContain('From 10.0.1.1 icmp_seq=1 Destination Net Unreachable');
    expect(result.lines).toContain('1 packets transmitted, 0 received, 100% packet loss');
  });
});

describe('TC-1703: a name resolves by device name first, then by DNS', () => {
  it('reaches www by its device name with no DNS query', async () => {
    const { engine, run } = setUp();
    const result = await run('ping -c 1 www');
    expect(result.lines[0]).toBe('PING www (10.0.2.80) 56(84) bytes of data.');
    expect(text(result)).toContain('0% packet loss');
    const dnsTraces = engine
      .getState()
      .traces.filter((trace) =>
        trace.hops.some((hop) => hop.protocol === 'UDP' && hop.dstIp === '10.0.2.53'),
      );
    expect(dnsTraces).toHaveLength(0);
  });

  it('asks DNS for www.example.test first, then reaches it', async () => {
    const { engine, run } = setUp();
    const result = await run('ping -c 1 www.example.test');
    expect(result.lines[0]).toBe('PING www.example.test (10.0.2.80) 56(84) bytes of data.');
    expect(text(result)).toContain('0% packet loss');
    expect(
      engine.getState().traces.some((trace) => trace.hops.some((hop) => hop.dstIp === '10.0.2.53')),
    ).toBe(true);
  });
});

describe('TC-1704: traceroute lists each hop', () => {
  it('prints the router, then the server', async () => {
    const { run } = setUp();
    const result = await run('traceroute 10.0.2.80');
    expect(result.lines[0]).toBe(
      'traceroute to 10.0.2.80 (10.0.2.80), 30 hops max, 60 byte packets',
    );
    expect(result.lines.slice(1)).toEqual([' 1  10.0.1.1 (10.0.1.1)', ' 2  10.0.2.80 (10.0.2.80)']);
  });
});

describe('TC-1705: nslookup and dig', () => {
  it('nslookup prints the server and the address, or NXDOMAIN', async () => {
    const { run } = setUp();
    const found = await run('nslookup www.example.test');
    expect(found.lines).toEqual([
      'Server:\t\t10.0.2.53',
      'Address:\t10.0.2.53#53',
      '',
      `Name:\twww.example.test`,
      'Address: 10.0.2.80',
    ]);
    const missing = await run('nslookup nope.example.test');
    expect(missing.lines).toContain("** server can't find nope.example.test: NXDOMAIN");
  });

  it('dig prints an ANSWER SECTION, or status NXDOMAIN', async () => {
    const { run } = setUp();
    const found = text(await run('dig www.example.test'));
    expect(found).toContain('status: NOERROR');
    expect(found).toContain(';; ANSWER SECTION:');
    expect(found).toMatch(/www\.example\.test\.\s+\d+\s+IN\s+A\s+10\.0\.2\.80/);
    expect(found).toContain(';; SERVER: 10.0.2.53#53(10.0.2.53)');
    const missing = text(await run('dig nope.example.test'));
    expect(missing).toContain('status: NXDOMAIN');
    expect(missing).not.toContain(';; ANSWER SECTION:');
  });
});

describe('TC-1706: curl', () => {
  it('prints the page, after DNS and a TCP handshake that are traces', async () => {
    const { engine, run } = setUp();
    const result = await run('curl http://www.example.test/');
    expect(text(result)).toBe('<!doctype html>\n<title>example</title>\n<h1>Hello from www</h1>');
    const traces = engine.getState().traces;
    expect(traces.some((trace) => trace.hops.some((hop) => hop.dstIp === '10.0.2.53'))).toBe(true);
    expect(
      traces.some((trace) =>
        trace.hops.some((hop) => hop.protocol === 'TCP' && hop.dstIp === '10.0.2.80'),
      ),
    ).toBe(true);
  });

  it('-v shows the request and the status line; -I only the headers', async () => {
    const { run } = setUp();
    const verbose = await run('curl -v http://www/about');
    expect(verbose.lines).toContain('> GET /about HTTP/1.1');
    expect(verbose.lines).toContain('> Host: www');
    expect(verbose.lines).toContain('< HTTP/1.1 200 OK');
    expect(verbose.lines).toContain('A web server inside the simulator.');
    const head = await run('curl -I http://www/');
    expect(head.lines[0]).toBe('HTTP/1.1 200 OK');
    expect(head.lines).toContain('Content-Type: text/html');
    expect(text(head)).not.toContain('<h1>');
  });

  it('a missing page is 404, and an unknown name cannot be resolved', async () => {
    const { run } = setUp();
    const missing = await run('curl -I http://www/missing');
    expect(missing.lines[0]).toBe('HTTP/1.1 404 Not Found');
    const unknown = await run('curl http://nope.example.test/');
    expect(unknown.lines).toEqual(['curl: (6) Could not resolve host: nope.example.test']);
  });
});

describe('TC-1707: dhclient', () => {
  it('prints the lease, and ip addr then shows the address', async () => {
    const { run } = setUp(terminalNetwork(), 'laptop');
    const result = await run('dhclient');
    const lines = text(result);
    expect(lines).toContain('DHCPDISCOVER');
    expect(lines).toContain('DHCPACK');
    expect(lines).toMatch(/bound to 10\.0\.1\.10[0-3]/);
    const addr = text(await run('ip addr'));
    expect(addr).toMatch(/inet 10\.0\.1\.10[0-3]\/24/);
  });
});

describe('TC-1708: ip addr, ip route, arp -a, ss -t', () => {
  it('shows the host’s address, routes, neighbours and connections', async () => {
    const { engine, run } = setUp();
    const addr = text(await run('ip addr'));
    expect(addr).toContain('inet 10.0.1.10/24');
    expect(addr).toContain('link/ether 02:00:00:00:01:10');
    const route = (await run('ip route')).lines;
    expect(route).toContain('default via 10.0.1.1 dev eth0');
    expect(route).toContain('10.0.1.0/24 dev eth0 proto kernel scope link src 10.0.1.10');

    await run('ping -c 1 10.0.2.80');
    const arp = text(await run('arp -a'));
    expect(arp).toMatch(/\? \(10\.0\.1\.1\) at 02:00:00:00:00:01 \[ether\] on eth0/);

    const opened = await engine.tcpConnect('client', 'www', 50000, 80);
    expect(opened.success).toBe(true);
    const ss = text(await run('ss -t'));
    expect(ss).toContain('ESTAB');
    expect(ss).toMatch(/10\.0\.1\.10:50000\s+10\.0\.2\.80:80/);
  });
});

describe('TC-1709: help, clear, unknown commands, and the page’s language', () => {
  it('lists every command, clears, and says an unknown one is not found', async () => {
    const { run } = setUp();
    const help = text(await run('help'));
    for (const name of [
      'ping',
      'traceroute',
      'nslookup',
      'dig',
      'curl',
      'dhclient',
      'ip',
      'arp',
      'ss',
      'clear',
    ]) {
      expect(help).toContain(name);
    }
    expect((await run('clear')).clear).toBe(true);
    expect((await run('foo')).lines).toEqual(['foo: command not found']);
    expect((await run('')).lines).toEqual([]);
  });

  it('says usage, errors and help in Japanese on a Japanese page', async () => {
    const { run } = setUp();
    expect(text(await run('help', { locale: 'ja' }))).toContain('使えるコマンド');
    expect(text(await run('ping', { locale: 'ja' }))).toContain('使い方: ping');
    expect((await run('foo', { locale: 'ja' })).lines).toEqual(['foo: command not found']);
  });
});

describe('TC-1716: a host with no address, and an engine that throws', () => {
  it('says the network is unreachable instead of stopping', async () => {
    const { run } = setUp(terminalNetwork(), 'laptop');
    expect((await run('ping -c 1 www')).lines).toEqual(['ping: connect: Network is unreachable']);
    expect((await run('traceroute www')).lines).toEqual([
      'traceroute: connect: Network is unreachable',
    ]);
    expect((await run('curl http://www/')).lines).toEqual([
      'curl: (7) Failed to connect: Network is unreachable',
    ]);
  });

  it('prints what went wrong when the engine throws, and does not reject', async () => {
    const { engine, run } = setUp();
    const broken = {
      ...engine,
      getTopology: () => engine.getTopology(),
      getRuntimeNodeIp: (id: string) => engine.getRuntimeNodeIp(id),
      ping: () => Promise.reject(new Error('engine stopped')),
    } as unknown as TerminalContext['engine'];
    expect((await run('ping -c 1 10.0.2.80', { engine: broken })).lines).toContain(
      'ping: engine stopped',
    );
  });
});

describe('TC-1717: curl without http://, and ss without -t', () => {
  it('fetches a URL typed without its scheme, and lists TCP with plain ss', async () => {
    const { run } = setUp();
    expect(text(await run('curl www.example.test'))).toContain('<h1>Hello from www</h1>');
    expect((await run('ss')).lines[0]).toMatch(/^State\s+Recv-Q/);
  });
});

describe('TC-1718: dhclient on a host with a fixed address', () => {
  it('says DHCP is off on this host, in the page’s language', async () => {
    const { run } = setUp();
    expect((await run('dhclient')).lines).toEqual([
      'dhclient: client has a fixed address (10.0.1.10); DHCP is off on this device. Try it on laptop.',
    ]);
    expect(text(await run('dhclient', { locale: 'ja' }))).toContain('DHCP は使っていません');
  });
});

describe('TC-1775: nobody on the router’s LAN has the address', () => {
  it('ping prints the router’s Destination Host Unreachable, and traceroute ends with !H', async () => {
    const { run } = setUp();
    expect((await run('ping -c 1 10.0.2.99')).lines).toContain(
      'From 10.0.1.1 icmp_seq=1 Destination Host Unreachable',
    );
    const trace = (await run('traceroute 10.0.2.99')).lines;
    expect(trace[trace.length - 1]).toBe(' 2  10.0.1.1 (10.0.1.1) !H');
  });
});
