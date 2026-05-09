import { check, type Options } from 'prettier';
import { describe, expect, it } from 'vitest';
import { formatScenarioTsSource, toScenarioConstName } from './ts-formatter';

const prettierOptions: Options = {
  parser: 'typescript',
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'always',
};

describe('scenario TypeScript formatter', () => {
  it('converts kebab-case scenario ids to camelCase export names', () => {
    expect(toScenarioConstName('ospf-backup-lab')).toBe('ospfBackupLab');
  });

  it('sorts imports and preserves a trailing newline', async () => {
    const formatted = formatScenarioTsSource(
      "import { z } from './z';\nimport type { Scenario } from './types';\n\nexport const x: Scenario = {\n  metadata: {\n    id: 'x',\n    title: 'X',\n    summary: 'X',\n    objective: 'X',\n    difficulty: 'intro',\n    protocols: [],\n    prerequisiteIds: [],\n  },\n  topology: { nodes: [], edges: [], areas: [], routeTables: new Map() },\n};",
    );

    expect(formatted.startsWith("import type { Scenario } from './types';\nimport { z }")).toBe(
      true,
    );
    expect(formatted.endsWith('\n')).toBe(true);
    await expect(check(formatted, prettierOptions)).resolves.toBe(true);
  });
});
