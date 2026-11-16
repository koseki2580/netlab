/**
 * REQ-365 — the "Reading command output" deck quotes lines the terminal
 * really prints on the simulator, so what is drilled is what is seen (TC-1733).
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../cli/runtime';
import { HookEngine } from '../../hooks/HookEngine';
import { conceptCheck as en } from '../../i18n/locales/en/conceptCheck';
import { MainThreadEngine } from '../../simulation/worker/MainThreadEngine';
import { runCommand } from '../../terminal/terminalCommands';
import { TERMINAL_WEB_SITES, terminalNetwork } from '../../terminal/terminalNetwork';
import type { WebSites } from '../../terminal/types';
import type { NetworkTopology } from '../../types/topology';
import { CONCEPT_DECKS } from './decks';

async function printed(
  lines: string[],
  topology: NetworkTopology = terminalNetwork(),
  web: WebSites = TERMINAL_WEB_SITES,
) {
  const engine = new MainThreadEngine(enrichTopology(topology), new HookEngine());
  const out: string[] = [];
  for (const line of lines)
    out.push(...(await runCommand(line, { engine, nodeId: 'client', web })).lines);
  return out;
}

/** The text between “ and ” in a prompt: the line it quotes. */
const quoted = (key: string) => /“(.+?)”/.exec((en as Record<string, string>)[key] ?? '')?.[1];

const noDnsRecord: NetworkTopology = {
  ...terminalNetwork(),
  nodes: terminalNetwork().nodes.map((node) =>
    node.id === 'dns' ? { ...node, data: { ...node.data, dnsServer: { zones: [] } } } : node,
  ),
};
const cutPastRouter: NetworkTopology = {
  ...terminalNetwork(),
  edges: terminalNetwork().edges.map((edge) =>
    edge.id === 'e-up-b' ? { ...edge, data: { ...edge.data, state: 'down' as const } } : edge,
  ),
};

describe('TC-1733: the command-output deck quotes what the terminal prints', () => {
  it('has six questions', () => {
    expect(CONCEPT_DECKS.find((deck) => deck.id === 'commands')?.questions).toHaveLength(6);
  });

  it('every quoted line is printed by the terminal in the situation the question describes', async () => {
    const q = (id: string) => quoted(`learning.concept.commands.${id}.prompt`);
    expect(await printed(['ping -c 1 10.0.2.80'])).toContain(q('q1'));
    expect(await printed(['ping -c 1 192.0.2.99'])).toContain(q('q2'));
    expect(await printed(['curl http://www.example.test/'], noDnsRecord)).toContain(q('q3'));
    expect(
      (await printed(['curl http://www.example.test/'], terminalNetwork(), {})).join('\n'),
    ).toContain(q('q4'));
    const trace = await printed(['traceroute 10.0.2.80'], cutPastRouter);
    expect(trace).toContain(q('q5'));
    expect(trace.slice(2).every((line) => line.endsWith('* * *'))).toBe(true);
    expect(await printed(['ping -c 1 10.0.2.80', 'arp -a'])).toContain(q('q6'));
  });
});
