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
