import { describe, expect, it } from 'vitest';
import { COURSE_STEPS, type CourseLocale } from './courseSteps';

const LOCALES: CourseLocale[] = ['en', 'ja'];

describe('the getting-started course', () => {
  /** TC-118 — a beginner is never shown a step they cannot read. */
  it('says every step in both languages', () => {
    const missing: string[] = [];
    for (const step of COURSE_STEPS) {
      for (const locale of LOCALES) {
        const copy = step.copy[locale];
        for (const [field, value] of Object.entries(copy)) {
          const lines: readonly string[] = typeof value === 'string' ? [value] : value;
          if (lines.length === 0 || lines.some((line) => line.trim().length === 0)) {
            missing.push(`${step.id}.${locale}.${field}`);
          }
        }
      }
      // Japanese that is only English with the punctuation changed is not a
      // translation, so the two must actually differ.
      if (step.copy.ja.task === step.copy.en.task) missing.push(`${step.id}.ja.task-untranslated`);
    }
    expect(missing).toEqual([]);
  });

  /** TC-119 — every step's two named machines are in its own network. */
  it('names a sender and a destination that exist in each step', () => {
    const broken: string[] = [];
    for (const step of COURSE_STEPS) {
      const ids = new Set(step.topology.nodes.map((node) => node.id));
      if (!ids.has(step.from)) broken.push(`${step.id}: no ${step.from}`);
      if (!ids.has(step.to)) broken.push(`${step.id}: no ${step.to}`);
      const source = step.topology.nodes.find((node) => node.id === step.from);
      const destination = step.topology.nodes.find((node) => node.id === step.to);
      if (!source?.data.ip) broken.push(`${step.id}: ${step.from} has no address`);
      if (!destination?.data.ip) broken.push(`${step.id}: ${step.to} has no address`);
    }
    expect(broken).toEqual([]);
  });

  /**
   * TC-120 — the course grows. A course whose third network is no larger than
   * its first is a list, not a progression, and the progression is the point.
   */
  it('starts at two machines and adds to them', () => {
    const sizes = COURSE_STEPS.map((step) => step.topology.nodes.length);
    expect(sizes[0]).toBe(2);
    expect(Math.max(...sizes)).toBeGreaterThan(sizes[0] ?? 0);
    for (const [index, size] of sizes.entries()) {
      if (index === 0) continue;
      expect(size).toBeGreaterThanOrEqual(sizes[index - 1] ?? 0);
    }
  });

  /** TC-121 — at least one step teaches a failure, and says so beforehand. */
  it('includes a step whose packet is meant to fail', () => {
    const failing = COURSE_STEPS.filter((step) => step.expect === 'drop');
    expect(failing.length).toBeGreaterThan(0);
    for (const step of failing) {
      expect(step.copy.ja.task).toMatch(/失敗/);
      expect(step.copy.en.task).toMatch(/fail/i);
    }
  });
});

describe('what step 3 says, on the real simulator', () => {
  /**
   * TC-871 — the switch of step 3 has just started and PC-B only receives:
   * each send is also copied to PC-C, which throws it away, until PC-B has
   * sent something, as TC-622's text says.
   */
  it('copies each packet to PC-C until PC-B has sent something', async () => {
    await import('../../src/layers/l2-datalink');
    await import('../../src/layers/l3-network');
    await import('../../src/layers/l7-application');
    const { HookEngine } = await import('../../src/hooks/HookEngine');
    const { SimulationEngine } = await import('../../src/simulation/SimulationEngine');
    const { buildUdpPacket } = await import('../../src/layers/l4-transport/udpPacketBuilder');
    const step = COURSE_STEPS.find((candidate) => candidate.id === 'three-machines')!;
    const ip = (id: string) => step.topology.nodes.find((node) => node.id === id)!.data.ip!;
    const engine = new SimulationEngine(step.topology, new HookEngine());
    // What the course's send button sends.
    const send = async () => {
      await engine.send(
        buildUdpPacket({
          srcNodeId: step.from,
          dstNodeId: step.to,
          srcIp: ip(step.from),
          dstIp: ip(step.to),
          srcPort: 40000,
          dstPort: 7,
          payload: { layer: 'raw', data: 'course' },
        }),
      );
      const traces = engine.getState().traces;
      return traces[traces.length - 1]!;
    };
    const copies = (trace: Awaited<ReturnType<typeof send>>) =>
      trace.hops.flatMap((hop) =>
        (hop.flood?.copies ?? []).map((copy) => [copy.toNodeId, copy.outcome, copy.reason]),
      );
    const first = await send();
    expect(first.status).toBe('delivered');
    expect(copies(first)).toEqual([['pc-c', 'discarded', 'not-for-me']]);
    // PC-B has sent nothing, so the switch still does not know its port.
    expect(copies(await send())).toEqual([['pc-c', 'discarded', 'not-for-me']]);
    // Once PC-B has sent something, the switch knows where it is.
    await engine.ping('pc-b', ip(step.from));
    expect(copies(await send())).toEqual([]);
  });
});
