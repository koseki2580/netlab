// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { gradeExercise } from '../grade/gradeExercise';
import { applyChanges } from '../model/settings';
import { DEV_TILL_ID } from '../devFixtures';
import { exerciseById } from '../exerciseSource';
import { CHIP_COUNT, hostCandidates, ifaceCandidates } from './candidates';
import { fixture } from './testSupport';

const till = fixture(DEV_TILL_ID);
const passesWith = async (ip: string) =>
  (await gradeExercise(till, applyChanges(till.start, [{ kind: 'host-ip', nodeId: 'pc1', ip }])))
    .passed;

// TC-500
describe('address chips for a host', () => {
  it('offers one address that works and mistakes that do not', async () => {
    const parts = hostCandidates(till.start, 'pc1', 'salt');
    if (!parts) throw new Error('no chips');
    const chips = [parts.right, ...parts.wrong];
    expect(chips.length).toBeGreaterThanOrEqual(4);
    expect(chips.length).toBeLessThanOrEqual(CHIP_COUNT);
    expect(new Set(chips).size).toBe(chips.length);
    expect(await passesWith(parts.right)).toBe(true);
    for (const wrong of parts.wrong) expect(await passesWith(wrong), wrong).toBe(false);
  });

  it('includes the mistakes a rule of thumb makes: an address in use, the router’s own, a network one number off', () => {
    const parts = hostCandidates(till.start, 'pc1', 'salt');
    const wrong = parts?.wrong ?? [];
    // The simulator accepts the network's own address for a host, so it is not offered as wrong.
    expect(wrong).not.toContain('192.168.1.0');
    expect(wrong).toContain('192.168.1.1');
    expect(wrong).toContain('192.168.1.11');
    // The same first two numbers, a different third.
    expect(wrong.some((chip) => /^192\.168\.(?!1\.)\d+\./.test(chip))).toBe(true);
    // Never the address the host has now: that is the one known not to work.
    expect([parts?.right, ...wrong]).not.toContain('192.168.2.50');
  });

  // TC-580
  it('is the same for the same exercise, and differs between exercises that share an address plan', () => {
    expect(hostCandidates(till.start, 'pc1', 'a')).toEqual(hostCandidates(till.start, 'pc1', 'a'));
    const rights = new Set(
      Array.from(
        { length: 12 },
        (_, index) => hostCandidates(till.start, 'pc1', `exercise-${index}`)?.right,
      ),
    );
    expect(rights.size).toBeGreaterThan(3);
  });

  it('offers nothing where the network of the host cannot be told', () => {
    expect(hostCandidates({ nodes: till.start.nodes, edges: [], areas: [] }, 'pc1', 'salt')).toBe(
      null,
    );
  });
});

// TC-581
describe('address chips for a side of a router', () => {
  const exercise = exerciseById('l1-router-address~0', 'ja');
  if (!exercise) throw new Error('no l1-router-address~0');
  const [fix] = exercise.reference;
  if (fix?.kind !== 'iface-address') throw new Error('the fix is not a router address');
  const parts = ifaceCandidates(exercise.start, fix.nodeId, fix.ifaceId, 'salt');

  it('offers a free address on the network the devices on that side share, and it works', async () => {
    if (!parts) throw new Error('no chips');
    const network = fix.ipAddress.split('.').slice(0, 3).join('.');
    expect(parts.right.startsWith(`${network}.`)).toBe(true);
    const hosts = exercise.start.nodes.flatMap((node) => node.data.ip ?? []);
    expect(hosts).not.toContain(parts.right);
    const grade = await gradeExercise(
      exercise,
      applyChanges(exercise.start, [{ ...fix, ipAddress: parts.right }]),
    );
    expect(grade.passed).toBe(true);
  });

  it('offers as mistakes a device’s own address there, the network next door and an address from the other side', () => {
    const wrong = parts?.wrong ?? [];
    const network = fix.ipAddress.split('.').slice(0, 3).join('.');
    const hosts = exercise.start.nodes.flatMap((node) => node.data.ip ?? []);
    expect(wrong.length).toBeGreaterThanOrEqual(4);
    expect(wrong.some((chip) => hosts.includes(chip))).toBe(true);
    expect(wrong.filter((chip) => !chip.startsWith(`${network}.`)).length).toBeGreaterThanOrEqual(
      2,
    );
    const now = exercise.start.nodes
      .find((node) => node.id === fix.nodeId)
      ?.data.interfaces?.find((side) => side.id === fix.ifaceId)?.ipAddress;
    expect([parts?.right, ...wrong]).not.toContain(now);
  });
});
