import { describe, expect, it } from 'vitest';
import {
  analyse,
  errorCount,
  extractTcRefs,
  normaliseLevel,
  parseSpecRows,
  splitRow,
} from './tc-check.mjs';

const SPEC = `# Spec

| Term | Meaning |
| ---- | ------- |
| TC   | not a test case table |

| Test case | Related AC | Level      | Given | Automated test |
| --------- | ---------- | ---------- | ----- | -------------- |
| TC-001    | AC-001     | E2E        | a     | \`e2e/a.spec.ts\` |
| TC-002    | AC-002     | unit + e2e | b \\| c | \`src/b.test.ts\` |
| TC-003    | AC-003     | Smoke      | c     | none           |
| TC-004    | AC-004     | Unit       | d     |

Regression:

| Test case | Level | Defect |
| --------- | ----- | ------ |
| TC-001    | Unit  | again  |
| TC-005    | AC-9  | E2E    | shifted | extra |

| Requirement | Test case |
| ----------- | --------- |
| REQ-001     | TC-001    |
`;

describe('tc-check parser', () => {
  it('splits cells on unescaped pipes only', () => {
    expect(splitRow('| a | b \\| c |  |')).toEqual(['a', 'b \\| c', '']);
  });

  it('reads only tables headed "Test case" with a Level column', () => {
    const rows = parseSpecRows(SPEC);
    expect(rows.map((row) => row.id)).toEqual([
      'TC-001',
      'TC-002',
      'TC-003',
      'TC-004',
      'TC-001',
      'TC-005',
    ]);
    expect(rows[0]).toMatchObject({ level: 'E2E', cellCount: 5, expectedCellCount: 5, line: 9 });
    expect(rows[4]).toMatchObject({ level: 'Unit', expectedCellCount: 3 });
  });

  it('normalises Level case and order, and rejects unknown tokens', () => {
    expect(normaliseLevel('E2E + Unit')).toBe('unit + e2e');
    expect(normaliseLevel('Unit + E2E')).toBe('unit + e2e');
    expect(normaliseLevel('unit/behavior')).toBe('unit/behavior');
    expect(normaliseLevel('Smoke')).toBeNull();
    expect(normaliseLevel('')).toBeNull();
  });

  it('extracts each TC id once, ignoring non-numeric ids', () => {
    expect(extractTcRefs("it('TC-010: x', ...) // TC-010, TC-UX, TC-011")).toEqual([
      'TC-010',
      'TC-011',
    ]);
  });
});

describe('tc-check analysis', () => {
  const refs = new Map([
    ['TC-002', ['src/b.test.ts']],
    ['TC-999', ['e2e/z.spec.ts']],
  ]);
  const result = analyse(parseSpecRows(SPEC), refs);

  it('reports each category', () => {
    expect(result.duplicates).toEqual([{ id: 'TC-001', lines: [9, 18] }]);
    expect(result.missingFromSpec).toEqual([{ id: 'TC-999', files: ['e2e/z.spec.ts'] }]);
    expect(result.badLevels).toEqual([{ id: 'TC-003', line: 11, level: 'Smoke' }]);
    expect(result.badCellCounts).toEqual([
      { id: 'TC-004', line: 12, cells: 4, expected: 5 },
      { id: 'TC-005', line: 19, cells: 5, expected: 3 },
    ]);
    expect(result.unreferencedE2e).toEqual(['TC-001']);
  });

  it('counts the error categories but not the E2E warning', () => {
    expect(errorCount(result)).toBe(5);
  });
});
