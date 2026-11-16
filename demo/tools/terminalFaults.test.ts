/**
 * REQ-364 — each fault shows the one symptom (the page will not open) and can
 * be told apart from the others by commands, on the simulator (TC-1731).
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import { runCommand } from '../../src/terminal/terminalCommands';
import { TERMINAL_WEB_SITES, terminalNetwork } from '../../src/terminal/terminalNetwork';
import { CAUSES, FAULTS, type CauseId } from './terminalFaults';

/** What the evidence commands show, as yes/no facts. */
async function evidence(cause: CauseId) {
  const fault = FAULTS.find((candidate) => candidate.cause === cause)!;
  const engine = new MainThreadEngine(
    enrichTopology(fault.apply(terminalNetwork())),
    new HookEngine(),
  );
  const web = fault.web(TERMINAL_WEB_SITES);
  const run = async (line: string) =>
    (await runCommand(line, { engine, nodeId: 'client', web })).lines.join('\n');
  return {
    pageOpens: (await run('curl http://www.example.test/')).includes('Hello from www'),
    dnsAnswers: (await run('nslookup www.example.test')).includes('Address: 10.0.2.80'),
    wwwByName: (await run('ping -c 1 www')).includes(' 0% packet loss'),
    routerAnswers: (await run('ping -c 1 10.0.1.1')).includes(' 0% packet loss'),
    dnsServerAnswers: (await run('ping -c 1 10.0.2.53')).includes(' 0% packet loss'),
    addressOnLan: (await run('ip addr')).includes('inet 10.0.1.10/24'),
  };
}

describe('TC-1731: every fault breaks the page and shows its own evidence', () => {
  it('each cause gives the facts its explanation names', async () => {
    expect(await evidence('dns-unreachable')).toEqual({
      pageOpens: false,
      dnsAnswers: false,
      wwwByName: true,
      routerAnswers: true,
      dnsServerAnswers: false,
      addressOnLan: true,
    });
    expect(await evidence('web-down')).toEqual({
      pageOpens: false,
      dnsAnswers: true,
      wwwByName: true,
      routerAnswers: true,
      dnsServerAnswers: true,
      addressOnLan: true,
    });
    expect(await evidence('core-link')).toEqual({
      pageOpens: false,
      dnsAnswers: false,
      wwwByName: false,
      routerAnswers: true,
      dnsServerAnswers: false,
      addressOnLan: true,
    });
    expect(await evidence('client-address')).toEqual({
      pageOpens: false,
      dnsAnswers: false,
      wwwByName: false,
      routerAnswers: false,
      dnsServerAnswers: false,
      addressOnLan: false,
    });
  });

  it('no two causes show the same evidence, and every cause has a fault and both languages', async () => {
    const seen = new Set<string>();
    for (const cause of CAUSES) {
      expect(
        FAULTS.some((fault) => fault.cause === cause.id),
        cause.id,
      ).toBe(true);
      seen.add(JSON.stringify(await evidence(cause.id)));
      for (const text of [cause.label, cause.wouldShow, cause.explain]) {
        expect(text.en.trim()).not.toBe('');
        expect(text.ja).toMatch(/[ぁ-んァ-ヶ一-龯]/);
      }
    }
    expect(seen.size).toBe(CAUSES.length);
  });
});
