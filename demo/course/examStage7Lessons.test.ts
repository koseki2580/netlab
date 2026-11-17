/**
 * TC-1883 — the stage 7 test's questions on the newer lessons agree with
 * what those lessons compute (REQ-117).
 */
import { describe, expect, it } from 'vitest';
import { PUBLIC_NAME, SITE, firstFlight, readable } from '../networking/ech';
import { simulate } from '../networking/l4s';
import { SHARE, staysSecret } from '../networking/pqKex';
import { POLICIES, choose } from '../networking/sdwan';
import { VPC_CASES } from '../networking/vpcLesson';
import { examLevel } from './examLevels';

const pool = () => examLevel(8)!.slots!.flat();
const key = (id: string) => {
  const question = pool().find((entry) => entry.id === id)!;
  return question.options[question.answer]!.en;
};
const policy = (id: 'voice' | 'video' | 'backup') => POLICIES.find((entry) => entry.id === id)!;

describe('the stage 7 test agrees with its newer lessons (TC-1883)', () => {
  it('VPC: the user cannot reach db; db leaves as the public address; SSH is stopped', () => {
    expect(VPC_CASES.find((c) => c.id === 'db-in')!.arrives).toBe(false);
    expect(key('s7-vpc-private-in')).toMatch(/stopped/);
    expect(key('l8-vpc-db-out')).toMatch(/^198\.51\.100\.1,/);
    expect(VPC_CASES.find((c) => c.id === 'ssh-in')!.arrives).toBe(false);
    expect(key('l8-vpc-ssh')).toMatch(/stopped before/);
  });

  it('SD-WAN: in the rush voice takes LTE, video MPLS, backup stays on the internet', () => {
    expect(choose(policy('voice'), 1)).toBe('lte');
    expect(key('s7-sdwan-voice')).toMatch(/^LTE/);
    expect(choose(policy('video'), 1)).toBe('mpls');
    expect(key('l8-sdwan-video')).toMatch(/^MPLS/);
    expect(choose(policy('backup'), 1)).toBe('internet');
    expect(key('l8-sdwan-backup')).toMatch(/internet/);
  });

  it('L4S: only L4S is both full and short-queued; a shallow buffer leaves the line idle', () => {
    expect(simulate('l4s').utilisationPct).toBe(100);
    expect(simulate('l4s').drops).toBe(0);
    expect(key('s7-l4s-both')).toMatch(/^L4S/);
    expect(key('l8-l4s-signal')).toMatch(/CE/);
    expect(simulate('classic-shallow').utilisationPct).toBeLessThan(90);
    expect(key('l8-l4s-shallow')).toMatch(/unused/);
  });

  it('ECH: the observer reads only the public name', async () => {
    const seen = readable((await firstFlight(true)).onTheWire);
    expect(seen).toContain(PUBLIC_NAME);
    expect(seen).not.toContain(SITE);
    expect(key('s7-ech-observer')).toMatch(/public name/);
  });

  it('post-quantum: the hybrid always holds, its share is 1216 bytes, X25519 falls to quantum', () => {
    expect(
      ['classical', 'quantum', 'mlkem-flaw'].every((a) =>
        staysSecret('x25519mlkem768', a as never),
      ),
    ).toBe(true);
    expect(key('s7-pq-hybrid')).toMatch(/both/);
    expect(key('l8-pq-size')).toBe(String(SHARE.x25519mlkem768.client));
    expect(staysSecret('x25519', 'quantum')).toBe(false);
    expect(key('l8-pq-harvest')).toMatch(/quantum/);
  });
});
