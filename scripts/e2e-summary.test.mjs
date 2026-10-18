import { describe, expect, it } from 'vitest';
import { formatSummary, parseJunitTotals } from './e2e-summary.mjs';

const JUNIT = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites id="" name="" tests="10" failures="2" skipped="3" errors="1" time="12.3">
<testsuite name="a.spec.ts" tests="10" failures="2" skipped="3" errors="0">
</testsuite>
</testsuites>`;

describe('e2e summary', () => {
  it('reads totals from the root testsuites element', () => {
    expect(parseJunitTotals(JUNIT)).toEqual({ tests: 10, failed: 3, skipped: 3, passed: 4 });
  });

  it('marks a run with failures as failed', () => {
    const markdown = formatSummary(parseJunitTotals(JUNIT), 'E2E (chromium)');
    expect(markdown).toContain('E2E (chromium) — :x: Failed');
    expect(markdown).toContain('| 10 | 4 | 3 | 3 |');
  });

  it('marks a clean run as passed', () => {
    const totals = parseJunitTotals('<testsuites tests="2" failures="0" skipped="0" errors="0">');
    expect(formatSummary(totals, 'E2E')).toContain(':white_check_mark: Passed');
  });

  it('says so when no report exists', () => {
    expect(parseJunitTotals('')).toBeNull();
    expect(formatSummary(null, 'E2E')).toContain('No JUnit report was produced');
  });
});
