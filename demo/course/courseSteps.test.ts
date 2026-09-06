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
          if (value.trim().length === 0) missing.push(`${step.id}.${locale}.${field}`);
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
