#!/usr/bin/env node
/**
 * Turn a Playwright JUnit report into a short Markdown pass/fail summary.
 *
 *   node scripts/e2e-summary.mjs <junit.xml> [title]
 *
 * Appends to $GITHUB_STEP_SUMMARY when set, otherwise prints to stdout.
 * Always exits 0: the test step, not the summary, decides the job result.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Read the totals from the root <testsuites> element. */
export function parseJunitTotals(xml) {
  const root = xml.match(/<testsuites\b[^>]*>/)?.[0];
  if (!root) return null;
  const attr = (name) => Number(root.match(new RegExp(`\\b${name}="(\\d+)"`))?.[1] ?? 0);
  const tests = attr('tests');
  const failures = attr('failures');
  const errors = attr('errors');
  const skipped = attr('skipped');
  return { tests, failed: failures + errors, skipped, passed: tests - failures - errors - skipped };
}

export function formatSummary(totals, title) {
  if (!totals) return `### ${title}\n\n:warning: No JUnit report was produced.\n`;
  const status = totals.failed > 0 ? ':x: Failed' : ':white_check_mark: Passed';
  return [
    `### ${title} — ${status}`,
    '',
    '| Total | Passed | Failed | Skipped |',
    '| ----- | ------ | ------ | ------- |',
    `| ${totals.tests} | ${totals.passed} | ${totals.failed} | ${totals.skipped} |`,
    '',
  ].join('\n');
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const [file, title = 'E2E'] = process.argv.slice(2);
  const totals = file && existsSync(file) ? parseJunitTotals(readFileSync(file, 'utf8')) : null;
  const markdown = formatSummary(totals, title);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  else process.stdout.write(markdown);
}
