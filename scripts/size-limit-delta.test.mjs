import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('size-limit delta report', () => {
  it('compares base and current size-limit JSON', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'netlab-size-delta-'));
    const base = join(dir, 'base.json');
    const current = join(dir, 'current.json');
    const markdown = join(dir, 'delta.md');

    await writeFile(
      base,
      JSON.stringify([{ name: 'facade', passed: true, size: 1000, sizeLimit: 2000 }]),
    );
    await writeFile(
      current,
      JSON.stringify([{ name: 'facade', passed: true, size: 1500, sizeLimit: 2000 }]),
    );

    const { stdout } = await execFileAsync('node', [
      resolve('scripts/size-limit-delta.mjs'),
      '--base',
      base,
      '--current',
      current,
      '--markdown',
      markdown,
    ]);
    const saved = await readFile(markdown, 'utf8');

    expect(stdout).toContain('<!-- netlab-size-limit-delta -->');
    expect(saved).toContain('`facade` | 1.00 kB | 1.50 kB | +0.50 kB | +50.00%');
  });
});
