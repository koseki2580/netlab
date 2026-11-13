// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { judgeRead } from '../../packet-lab/judge';
import type { ReadExercise } from '../../packet-lab/model';
import { p1Which } from '../../packet-lab/templates/level1/p1-which';
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
