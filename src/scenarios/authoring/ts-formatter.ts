function importRank(line: string): number {
  return line.startsWith('import type ') ? 0 : 1;
}

export function toScenarioConstName(scenarioId: string): string {
  return scenarioId.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

export function formatScenarioTsSource(source: string): string {
  const trimmed = source.trim();
  const lines = trimmed.split('\n');
  const imports: string[] = [];
  const body: string[] = [];
  let inImports = true;

  for (const line of lines) {
    if (inImports && line.startsWith('import ')) {
      imports.push(line);
      continue;
    }
    if (inImports && line.trim() === '') {
      continue;
    }
    inImports = false;
    body.push(line);
  }

  const sortedImports = [...imports].sort((left, right) => {
    const rank = importRank(left) - importRank(right);
    return rank === 0 ? left.localeCompare(right) : rank;
  });

  return `${[...sortedImports, '', ...body].join('\n')}\n`;
}
