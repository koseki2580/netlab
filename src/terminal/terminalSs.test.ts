/**
 * REQ-418 — `ss -l` lists the sockets a device listens on: its web site or
 * running app on TCP, its DNS or DHCP service on UDP (TC-2230..TC-2235).
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../cli/runtime';
import { HookEngine } from '../hooks/HookEngine';
import { MainThreadEngine } from '../simulation/worker/MainThreadEngine';
import { runCommand } from './terminalCommands';
import { TERMINAL_WEB_SITES, terminalNetwork } from './terminalNetwork';
import type { ServerApp, TerminalContext } from './types';

/** A running app; `ss` only asks whether one runs, so it is never sent a request here. */
const APP: ServerApp = { handle: () => Promise.reject(new Error('not used by ss')) };

function setUp(nodeId: string, extra: Partial<TerminalContext> = {}) {
  const engine = new MainThreadEngine(enrichTopology(terminalNetwork()), new HookEngine());
  const context: TerminalContext = { engine, nodeId, web: TERMINAL_WEB_SITES, ...extra };
  return { engine, run: async (line: string) => (await runCommand(line, context)).lines };
}

const HEADER = /^State\s+Recv-Q\s+Send-Q\s+Local Address:Port\s+Peer Address:Port$/;
const LISTEN_80 = /^LISTEN\s+0\s+128\s+0\.0\.0\.0:80\s+0\.0\.0\.0:\*$/;

describe('TC-2230: ss -l on the web server lists its site listening on port 80', () => {
  it('prints the header and one LISTEN row in ss’s columns', async () => {
    const { run } = setUp('www');
    const lines = await run('ss -l');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(HEADER);
    expect(lines[1]).toMatch(LISTEN_80);
    // The columns line up under the header.
    expect(lines[1]!.indexOf('0.0.0.0:80')).toBe(lines[0]!.indexOf('Local Address:Port'));
  });

  it('-lt, -tl and -ltn print the same, and a site on another port listens there', async () => {
    const { run } = setUp('www');
    const plain = await run('ss -l');
    for (const flags of ['-lt', '-tl', '-ltn', '-l -t']) {
      expect(await run(`ss ${flags}`)).toEqual(plain);
    }
    const custom = setUp('www', { web: { www: { port: 8080, pages: {} } } });
    expect((await custom.run('ss -lt'))[1]).toMatch(/^LISTEN\s+0\s+128\s+0\.0\.0\.0:8080\s/);
  });

  it('a device with nothing listening prints only the header', async () => {
    const { run } = setUp('client');
    const lines = await run('ss -lt');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(HEADER);
  });
});

describe('TC-2231: a running learner app listens on 80; after Stop nothing does', () => {
  it('lists 0.0.0.0:80 while the app runs and only the header once it is gone', async () => {
    const running = setUp('www', { web: {}, apps: { www: APP } });
    expect((await running.run('ss -lt'))[1]).toMatch(LISTEN_80);
    const stopped = setUp('www', { web: {} });
    expect(await stopped.run('ss -lt')).toHaveLength(1);
  });
});

describe('TC-2232: ss with no flags still lists established connections only', () => {
  it('shows ESTAB and no LISTEN row on the server that listens', async () => {
    const { engine, run } = setUp('www');
    expect((await engine.tcpConnect('client', 'www', 50000, 80)).success).toBe(true);
    for (const line of ['ss', 'ss -t']) {
      const lines = await run(line);
      expect(lines.join('\n')).toMatch(/^ESTAB\s+0\s+0\s+10\.0\.2\.80:80\s+10\.0\.1\.10:50000$/m);
      expect(lines.join('\n')).not.toContain('LISTEN');
    }
  });
});

describe('TC-2233: ss -a lists listening and established sockets together', () => {
  it('prints the LISTEN row first, then the ESTAB one', async () => {
    const { engine, run } = setUp('www');
    await engine.tcpConnect('client', 'www', 50000, 80);
    const lines = await run('ss -a');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toMatch(/^LISTEN\s+0\s+128\s+0\.0\.0\.0:80\s+0\.0\.0\.0:\*$/);
    expect(lines[2]).toMatch(/^ESTAB\s+0\s+0\s+10\.0\.2\.80:80\s+10\.0\.1\.10:50000$/);
    expect(await run('ss -at')).toEqual(lines);
  });
});

describe('TC-2234: UDP: the DNS server on 53 and the DHCP server on 67, from the network', () => {
  it('ss -lu prints UNCONN rows where the device serves DNS or DHCP', async () => {
    const dns = await setUp('dns').run('ss -lu');
    expect(dns).toHaveLength(2);
    expect(dns[0]).toMatch(HEADER);
    expect(dns[1]).toMatch(/^UNCONN\s+0\s+0\s+0\.0\.0\.0:53\s+0\.0\.0\.0:\*$/);
    const dhcp = await setUp('dhcp').run('ss -ul');
    expect(dhcp[1]).toMatch(/^UNCONN\s+0\s+0\s+0\.0\.0\.0:67\s+0\.0\.0\.0:\*$/);
    expect(await setUp('www').run('ss -lu')).toHaveLength(1);
  });

  it('ss -u alone lists no unconnected sockets, and -ltu adds a Netid column', async () => {
    expect(await setUp('dns').run('ss -u')).toHaveLength(1);
    const both = await setUp('dns').run('ss -ltu');
    expect(both[0]).toMatch(/^Netid\s+State\s+Recv-Q/);
    expect(both[1]).toMatch(/^udp\s+UNCONN\s+0\s+0\s+0\.0\.0\.0:53\s+0\.0\.0\.0:\*$/);
  });
});

describe('TC-2235: an unknown flag prints the usage, in the page’s language, and help names -l', () => {
  it('prints the updated usage in English and Japanese', async () => {
    expect(await setUp('www').run('ss -x')).toEqual(['Usage: ss [-t] [-u] [-l] [-a] [-n]']);
    expect(await setUp('www', { locale: 'ja' }).run('ss bogus')).toEqual([
      '使い方: ss [-t] [-u] [-l] [-a] [-n]',
    ]);
    const help = (await setUp('www').run('help')).join('\n');
    expect(help).toContain('ss [-t] [-u] [-l] [-a]');
    expect(help).toContain('listening sockets');
    const hilfe = (await setUp('www', { locale: 'ja' }).run('help')).join('\n');
    expect(hilfe).toContain('待ち受け');
  });
});
