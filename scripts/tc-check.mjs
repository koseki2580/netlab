#!/usr/bin/env node
/**
 * Traceability check between the specification's TC tables and the tests.
 *
 * Reports duplicate TC ids, TC ids referenced by tests but absent from the
 * spec, Level cells outside the vocabulary, rows with the wrong cell count,
 * and (as a warning) E2E-level ids no test references.
 *
 * Exits 0 unless `--strict` is given and an error category is non-empty.
 * See docs/dev/tc-check.md.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');

export const SPEC_PATH = 'docs/user-guide/specifications/specification.md';

/** Canonical Level tokens, in the order a normalised Level lists them. */
export const LEVEL_TOKENS = ['unit', 'unit/behavior', 'unit/performance', 'integration', 'e2e'];

const TC_ID = /^TC-\d+$/;
const TC_REF = /\bTC-\d+\b/g;

/** Split a Markdown table row into trimmed cells, honouring `\|` escapes. */
export function splitRow(line) {
  const body = line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '');
  return body.split(/(?<!\\)\|/).map((cell) => cell.trim());
}

const isTableLine = (line) => line.trim().startsWith('|');
const isSeparator = (cells) => cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));

/**
 * Find every table whose header starts with "Test case" and has a "Level"
 * column, and return one entry per data row.
 */
export function parseSpecRows(markdown) {
  const lines = markdown.split('\n');
  const rows = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (!isTableLine(lines[i]) || (i > 0 && isTableLine(lines[i - 1]))) continue;

    const header = splitRow(lines[i]);
    const levelIndex = header.findIndex((cell) => cell.toLowerCase() === 'level');
    if (header[0]?.toLowerCase() !== 'test case' || levelIndex === -1) continue;

    for (let j = i + 1; j < lines.length && isTableLine(lines[j]); j += 1) {
      const cells = splitRow(lines[j]);
      if (isSeparator(cells)) continue;
      rows.push({
        id: cells[0],
        level: cells[levelIndex] ?? '',
        cellCount: cells.length,
        expectedCellCount: header.length,
        line: j + 1,
      });
    }
  }

  return rows;
}

/** Lower-case, split on "+", order canonically. Returns null if any token is unknown. */
export function normaliseLevel(level) {
  const tokens = level
    .split('+')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0 || tokens.some((token) => !LEVEL_TOKENS.includes(token))) return null;
  return [...new Set(tokens)]
    .sort((a, b) => LEVEL_TOKENS.indexOf(a) - LEVEL_TOKENS.indexOf(b))
    .join(' + ');
}

/** All TC ids mentioned in a source text, de-duplicated. */
export function extractTcRefs(text) {
  return [...new Set(text.match(TC_REF) ?? [])];
}

/**
 * @param {ReturnType<typeof parseSpecRows>} rows
 * @param {Map<string, string[]>} refs TC id -> files that reference it
 */
export function analyse(rows, refs) {
  const byId = new Map();
  for (const row of rows) {
    if (!TC_ID.test(row.id)) continue;
    byId.set(row.id, [...(byId.get(row.id) ?? []), row]);
  }

  const duplicates = [...byId]
    .filter(([, list]) => list.length > 1)
    .map(([id, list]) => ({ id, lines: list.map((row) => row.line) }));

  const missingFromSpec = [...refs]
    .filter(([id]) => !byId.has(id))
    .map(([id, files]) => ({ id, files }));

  const badLevels = rows
    .filter((row) => row.cellCount === row.expectedCellCount && normaliseLevel(row.level) === null)
    .map((row) => ({ id: row.id, line: row.line, level: row.level }));

  const badCellCounts = rows
    .filter((row) => row.cellCount !== row.expectedCellCount)
    .map((row) => ({
      id: row.id,
      line: row.line,
      cells: row.cellCount,
      expected: row.expectedCellCount,
    }));

  const unreferencedE2e = [...byId]
    .filter(([id, list]) =>
      list.some((row) => (normaliseLevel(row.level) ?? '').split(' + ').includes('e2e'))
        ? !refs.has(id)
        : false,
    )
    .map(([id]) => id);

  return { duplicates, missingFromSpec, badLevels, badCellCounts, unreferencedE2e };
}

const byTcNumber = (a, b) => Number(a.slice(3)) - Number(b.slice(3));

export function formatReport(result) {
  const out = [];
  const section = (title, items, render) => {
    out.push(`${title}: ${items.length}`);
    for (const item of items) out.push(`  ${render(item)}`);
  };

  section(
    '(a) duplicate TC ids in the spec',
    result.duplicates,
    (d) => `${d.id} at lines ${d.lines.join(', ')}`,
  );
  section(
    '(b) TC ids referenced by tests but missing from the spec',
    [...result.missingFromSpec].sort((a, b) => byTcNumber(a.id, b.id)),
    (m) => `${m.id} in ${m.files.join(', ')}`,
  );
  section(
    '(c) Level outside the vocabulary',
    result.badLevels,
    (b) => `${b.id} (line ${b.line}): "${b.level}"`,
  );
  section(
    '(d) rows with the wrong cell count',
    result.badCellCounts,
    (b) => `${b.id} (line ${b.line}): ${b.cells} cells, expected ${b.expected}`,
  );
  out.push(
    `(e) warning — E2E-level ids no test references: ${result.unreferencedE2e.length}`,
    ...(result.unreferencedE2e.length
      ? [`  ${[...result.unreferencedE2e].sort(byTcNumber).join(', ')}`]
      : []),
  );
  return out.join('\n');
}

export const errorCount = (result) =>
  result.duplicates.length +
  result.missingFromSpec.length +
  result.badLevels.length +
  result.badCellCounts.length;

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** Every file under e2e/, and test files under src/ and demo/. */
function collectRefs(root) {
  const refs = new Map();
  const add = (file) => {
    const rel = path.relative(root, file).split(path.sep).join('/');
    for (const id of extractTcRefs(readFileSync(file, 'utf8'))) {
      refs.set(id, [...(refs.get(id) ?? []), rel]);
    }
  };
  for (const file of walk(path.join(root, 'e2e'))) {
    if (/\.[cm]?[jt]sx?$/.test(file)) add(file);
  }
  for (const dir of ['src', 'demo']) {
    for (const file of walk(path.join(root, dir))) if (TEST_FILE.test(file)) add(file);
  }
  return refs;
}

function main(argv) {
  const strict = argv.includes('--strict');
  const rows = parseSpecRows(readFileSync(path.join(repoRoot, SPEC_PATH), 'utf8'));
  const result = analyse(rows, collectRefs(repoRoot));
  console.log(formatReport(result));
  const errors = errorCount(result);
  if (errors > 0 && strict) {
    console.error(`\ntc:check failed: ${errors} problem(s) (--strict).`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main(process.argv.slice(2));
}
