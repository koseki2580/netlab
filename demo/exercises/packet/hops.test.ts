// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { judgeRead } from '../../packet-lab/judge';
import type { ReadExercise } from '../../packet-lab/model';
import { p1Which } from '../../packet-lab/templates/level1/p1-which';
import { exerciseById } from '../../packet-lab/templates';
import { diagramFacts } from './diagramFacts';
import { packetPaths } from './hops';

describe('each packet shows its own path (TC-1405)', () => {
  it('lists one named path per packet of a two-packet exercise, each its own', async () => {
    for (let seed = 0; seed < 6; seed += 1) {
      const exercise = p1Which.generate(seed) as ReadExercise;
      const grade = await judgeRead(exercise, { picks: {} });
      const paths = packetPaths(exercise, grade);
      expect(
        paths.map((path) => path.name?.en),
        `seed ${seed}`,
      ).toEqual(['Packet A', 'Packet B']);
      exercise.packets.forEach((packet, index) => {
        const first = paths[index]?.lines[0];
        expect(first?.nodeId, `seed ${seed} packet ${index}`).toBe(packet.from);
        const trace = grade.traces?.[index];
        expect(trace?.hops[0]?.dstIp, `seed ${seed} packet ${index}`).toBe(packet.dstIp);
      });
    }
  });
});

// TC-1476 (REQ-353): in a tunnel the outer packet is the sender's own, and each end says what it did.
describe('the replay of a tunnel and of labels, in words (TC-1476)', () => {
  const lines = async (id: string) => {
    const exercise = exerciseById(id) as ReadExercise;
    const grade = await judgeRead(exercise, { picks: {} });
    return packetPaths(exercise, grade)[0]?.lines ?? [];
  };

  it.each([
    ['p5-gre-read~0', 'GRE'],
    ['p5-vxlan-read~0', 'VXLAN'],
  ])('%s: no hop of the outer packet is called a note sent back', async (id, proto) => {
    const path = await lines(id);
    expect(path.some((line) => line.note)).toBe(false);
    expect(path.map((line) => line.what.en)).toContainEqual(
      expect.stringMatching(new RegExp(`^wraps it in a ${proto} packet to `)),
    );
    expect(path.map((line) => line.what.ja)).toContainEqual(
      expect.stringMatching(new RegExp(`^${proto} のパケットで包み`)),
    );
  });

  it('MPLS: the labels put on are named', async () => {
    const path = await lines('p5-mpls-read~0');
    expect(path.map((line) => line.what.en)).toContainEqual(
      expect.stringMatching(/^puts the labels \d+ \/ \d+ on it$/),
    );
  });

  it('beside the diagram: each end of a tunnel, its key or VNI, and the label tables', () => {
    const gre = diagramFacts(exerciseById('p5-gre-read~0')!).tunnels.map((fact) => fact.text.en);
    expect(gre.join('\n')).toMatch(/GRE tunnel from [\d.]+ to [\d.]+, key \d+/);
    const vxlan = diagramFacts(exerciseById('p5-vxlan-read~0')!).tunnels.map((f) => f.text.ja);
    expect(vxlan.join('\n')).toMatch(/VXLAN の端 [\d.]+（向こうの端 [\d.]+、VNI \d+）/);
    const mpls = diagramFacts(exerciseById('p5-mpls-read~0')!).tunnels.map((f) => f.text.en);
    expect(mpls.join('\n')).toMatch(/VPN label \d+, to the PE at [\d.]+/);
    expect(mpls.join('\n')).toMatch(/push \d+ and send to /);
  });
});
