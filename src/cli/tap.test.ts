import { describe, expect, it } from 'vitest';
import { emitTap } from './tap';
import type { AssertionResult } from './assertions/types';

const PASS: AssertionResult = {
  pass: true,
  description: 'packet reached destination',
};

const FAIL: AssertionResult = {
  pass: false,
  description: 'ARP cache contains entry',
  message: 'missing ARP entry',
};

describe('emitTap', () => {
  it('emits a TAP 13 plan and numbered ok lines', () => {
    expect(emitTap([PASS])).toBe('TAP version 13\n1..1\nok 1 - packet reached destination\n');
  });

  it('emits not ok with diagnostics when an assertion fails', () => {
    expect(emitTap([FAIL])).toContain('not ok 1 - ARP cache contains entry');
    expect(emitTap([FAIL])).toContain('message: "missing ARP entry"');
  });

  it('escapes newlines in descriptions', () => {
    expect(emitTap([{ pass: true, description: 'first\nsecond' }])).toContain(
      'ok 1 - first second',
    );
  });

  it('keeps output parseable with a simple TAP line parser', () => {
    const lines = emitTap([PASS, FAIL]).trim().split('\n');
    expect(lines[0]).toBe('TAP version 13');
    expect(lines[1]).toBe('1..2');
    expect(lines.filter((line) => /^(ok|not ok) \d+ - /.test(line))).toHaveLength(2);
  });
});
