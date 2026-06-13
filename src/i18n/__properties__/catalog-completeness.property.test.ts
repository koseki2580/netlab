import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '../locales/en';

const SRC_ROOT = resolve(__dirname, '../..');

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx']);
const SKIP_FILE_SUFFIXES = ['.test.ts', '.test.tsx', '.stories.tsx'];
const SKIP_DIR_NAMES = new Set(['__properties__', 'i18n']);

interface KeyReference {
  readonly key: string;
  readonly file: string;
}

function shouldSkipFile(name: string): boolean {
  return SKIP_FILE_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

function walkSource(dir: string, files: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry)) continue;
      walkSource(full, files);
      continue;
    }
    const ext = entry.includes('.') ? entry.slice(entry.lastIndexOf('.')) : '';
    if (!SCAN_EXTENSIONS.has(ext)) continue;
    if (shouldSkipFile(entry)) continue;
    files.push(full);
  }
}

const T_CALL_RE = /\bt\(\s*(['"])([\w.\-:/]+)\1/g;

function extractKeyReferences(file: string): KeyReference[] {
  const source = readFileSync(file, 'utf8');
  const refs: KeyReference[] = [];
  for (const match of source.matchAll(T_CALL_RE)) {
    const key = match[2];
    if (key) refs.push({ key, file });
  }
  return refs;
}

describe('i18n catalog completeness', () => {
  const sourceFiles: string[] = [];
  walkSource(SRC_ROOT, sourceFiles);
  const allReferences = sourceFiles.flatMap(extractKeyReferences);
  const uniqueKeys = Array.from(new Set(allReferences.map((r) => r.key))).sort();

  it('finds at least one t() call site (sanity check)', () => {
    expect(uniqueKeys.length).toBeGreaterThan(0);
  });

  it.each(uniqueKeys)('en catalog covers t-call key: %s', (key) => {
    expect(en).toHaveProperty(key);
    expect(typeof en[key]).toBe('string');
  });

  it('all keys use the dot-separated namespace convention', () => {
    const offenders = Object.keys(en).filter(
      (key) => !/^[a-z][a-z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/.test(key),
    );
    expect(offenders).toEqual([]);
  });

  it('all keys start with a known top-level namespace', () => {
    const allowedNamespaces = new Set(['sandbox', 'learning']);
    const offenders = Object.keys(en).filter((key) => {
      const top = key.split('.')[0];
      return top === undefined || !allowedNamespaces.has(top);
    });
    expect(offenders).toEqual([]);
  });
});
