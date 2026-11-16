/**
 * REQ-363 — each task of the terminal page is met by the command that reaches
 * its goal, run on the simulator, and not by one that does not (TC-1722).
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import { runCommand } from '../../src/terminal/terminalCommands';
import { TERMINAL_WEB_SITES, terminalNetwork } from '../../src/terminal/terminalNetwork';
import { MISSIONS, completedBy } from './terminalMissions';

function session() {
  const engine = new MainThreadEngine(enrichTopology(terminalNetwork()), new HookEngine());
  return async (nodeId: string, line: string) => {
    const result = await runCommand(line, { engine, nodeId, web: TERMINAL_WEB_SITES });
    return completedBy({ nodeId, line, lines: result.lines }, new Set());
  };
}

describe('TC-1722: the tasks are met by the commands that reach them', () => {
  it('meets each task from its command, on the simulator', async () => {
    const run = session();
    expect(await run('client', 'ping -c 1 www')).toEqual(['reach']);
    expect(await run('client', 'dig www.example.test')).toEqual(['dns']);
    expect(await run('client', 'curl www.example.test')).toEqual(['web']);
    expect(await run('laptop', 'dhclient')).toEqual(['dhcp']);
    expect(await run('client', 'arp -a')).toEqual(['arp']);
    expect(await run('client', 'ping -c 1 192.0.2.99')).toEqual(['unreachable']);
    expect(await run('client', 'traceroute www')).toEqual(['path']);
  });

  it('does not meet a task from a command that misses its goal', async () => {
    const run = session();
    // Before anything is sent the ARP cache is empty.
    expect(await run('client', 'arp -a')).toEqual([]);
    expect(await run('client', 'nslookup www')).toEqual([]);
    expect(await run('client', 'ping -c 1 10.0.1.1')).toEqual([]);
    expect(await run('client', 'dhclient')).toEqual([]);
    expect(await run('client', 'curl http://dns/')).toEqual([]);
  });

  it('gives every task an English and a Japanese goal, hint and explanation', () => {
    for (const mission of MISSIONS) {
      for (const text of [mission.goal, mission.hint, mission.explain]) {
        expect(text.en.trim(), mission.id).not.toBe('');
        expect(text.ja, mission.id).toMatch(/[ぁ-んァ-ヶ一-龯]/);
      }
    }
  });
});
