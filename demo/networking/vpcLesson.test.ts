/** REQ-374 — the VPC's four connections, on the simulator, end as the lesson says (TC-1800). */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import { VPC_CASES, readVpcTrace, vpcSyn, vpcTopology } from './vpcLesson';

async function run(id: string) {
  const engine = new MainThreadEngine(enrichTopology(vpcTopology()), new HookEngine());
  const situation = VPC_CASES.find((candidate) => candidate.id === id)!;
  const packet = vpcSyn(situation);
  await engine.send(packet);
  return readVpcTrace(engine.getState().traces.find((trace) => trace.packetId === packet.id)!);
}

describe('TC-1800: each connection ends as the lesson says', () => {
  it('web-in: the gateway maps the public address to web', async () => {
    expect(await run('web-in')).toMatchObject({
      arrived: true,
      endedAt: 'web',
      rewrites: ['internet GW: 198.51.100.1 → 10.0.1.10'],
    });
  });
  it('db-out: the NAT gateway, then the internet gateway, put their addresses on it', async () => {
    expect(await run('db-out')).toMatchObject({
      arrived: true,
      rewrites: ['NAT GW: 10.0.2.10 → 10.0.1.30', 'internet GW: 10.0.1.30 → 198.51.100.1'],
    });
  });
  it('db-in: nothing comes in to a private address', async () => {
    expect(await run('db-in')).toMatchObject({
      arrived: false,
      endedAt: 'internet GW',
      reason: 'no-nat-entry',
    });
  });
  it('ssh-in: the security group stops TCP 22', async () => {
    expect(await run('ssh-in')).toMatchObject({
      arrived: false,
      endedAt: 'internet GW',
      reason: 'acl-deny',
    });
  });
  it('the lesson says each one’s fate as the simulator gives it', async () => {
    for (const situation of VPC_CASES)
      expect((await run(situation.id)).arrived, situation.id).toBe(situation.arrives);
  });
});

/**
 * TC-2362 — the subnets' node labels are in the page's language and fit their
 * boxes. A switch box is 80 px wide with 8 px padding a side, its label 11 px
 * monospace: a Latin character takes 0.6 em, a full-width one 1 em.
 */
describe('TC-2362: the subnet labels are localized and fit their boxes', () => {
  const LABEL_ROOM_PX = 80 - 2 * 8;
  const widthPx = (label: string) =>
    [...label].reduce((sum, char) => sum + (char.charCodeAt(0) > 0xff ? 11 : 11 * 0.6), 0);
  const labelOf = (locale: 'en' | 'ja', id: string) =>
    String(vpcTopology(locale).nodes.find((node) => node.id === id)?.data.label);

  it('in English they read public and private', () => {
    expect(labelOf('en', 'sw-public')).toBe('public');
    expect(labelOf('en', 'sw-private')).toBe('private');
  });

  it('in Japanese they read 公開 and 非公開, as the lesson’s terms do', () => {
    expect(labelOf('ja', 'sw-public')).toBe('公開');
    expect(labelOf('ja', 'sw-private')).toBe('非公開');
  });

  it('in Japanese the user is 利用者; the gateways keep their short names, which fit', () => {
    expect(labelOf('ja', 'user')).toBe('利用者');
    expect(labelOf('en', 'user')).toBe('user');
    expect(labelOf('ja', 'igw')).toBe('internet GW');
    expect(labelOf('ja', 'natgw')).toBe('NAT GW');
  });

  it('each fits inside its box in both languages', () => {
    for (const locale of ['en', 'ja'] as const)
      for (const id of ['sw-public', 'sw-private'])
        expect(widthPx(labelOf(locale, id)), `${locale} ${id}`).toBeLessThanOrEqual(LABEL_ROOM_PX);
  });

  it('the simulator still runs the lesson with the Japanese labels', async () => {
    const engine = new MainThreadEngine(enrichTopology(vpcTopology('ja')), new HookEngine());
    const situation = VPC_CASES.find((candidate) => candidate.id === 'db-out')!;
    const packet = vpcSyn(situation);
    await engine.send(packet);
    const trace = engine.getState().traces.find((candidate) => candidate.packetId === packet.id)!;
    expect(readVpcTrace(trace).arrived).toBe(true);
  });
});
