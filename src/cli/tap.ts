import type { AssertionResult } from './assertions/types';

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function diagnosticLines(result: AssertionResult): string[] {
  const lines = ['  ---'];
  if (result.message) {
    lines.push(`  message: ${yamlString(result.message)}`);
  }
  if (result.diagnostics) {
    for (const [key, value] of Object.entries(result.diagnostics)) {
      lines.push(`  ${key}: ${yamlString(JSON.stringify(value))}`);
    }
  }
  lines.push('  ...');
  return lines;
}

export function emitTap(results: readonly AssertionResult[]): string {
  const lines = ['TAP version 13', `1..${results.length}`];

  results.forEach((result, index) => {
    const prefix = result.pass ? 'ok' : 'not ok';
    lines.push(`${prefix} ${index + 1} - ${clean(result.description)}`);
    if (!result.pass && (result.message || result.diagnostics)) {
      lines.push(...diagnosticLines(result));
    }
  });

  return `${lines.join('\n')}\n`;
}
