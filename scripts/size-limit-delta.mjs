#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const MARKER = '<!-- netlab-size-limit-delta -->';

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) {
      throw new Error(`Unexpected argument: ${key}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    args.set(key.slice(2), value);
    index += 1;
  }
  return args;
}

function parseSizeLimitJson(text, source) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON array found in ${source}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function readResults(file) {
  const text = await readFile(file, 'utf8');
  return parseSizeLimitJson(text, file);
}

function byName(results) {
  return new Map(results.map((entry) => [entry.name, entry]));
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number') return 'n/a';
  return `${(bytes / 1000).toFixed(2)} kB`;
}

function formatDelta(bytes) {
  if (typeof bytes !== 'number') return 'n/a';
  const sign = bytes > 0 ? '+' : '';
  return `${sign}${formatBytes(bytes)}`;
}

function formatPercent(current, base) {
  if (typeof current !== 'number' || typeof base !== 'number' || base === 0) return 'n/a';
  const delta = ((current - base) / base) * 100;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}%`;
}

function status(entry) {
  if (!entry) return 'missing';
  return entry.passed ? 'pass' : 'fail';
}

function buildRows(baseResults, currentResults) {
  const base = byName(baseResults);
  const current = byName(currentResults);
  const names = [...new Set([...base.keys(), ...current.keys()])].sort();
  return names.map((name) => {
    const baseEntry = base.get(name);
    const currentEntry = current.get(name);
    const baseSize = baseEntry?.size;
    const currentSize = currentEntry?.size;
    return {
      name,
      baseSize,
      currentSize,
      deltaBytes:
        typeof baseSize === 'number' && typeof currentSize === 'number'
          ? currentSize - baseSize
          : null,
      deltaPercent: formatPercent(currentSize, baseSize),
      sizeLimit: currentEntry?.sizeLimit ?? baseEntry?.sizeLimit ?? null,
      status: status(currentEntry),
    };
  });
}

function buildMarkdown(rows) {
  const lines = [
    MARKER,
    '## Size Limit Delta',
    '',
    '| Entry | Base | Current | Delta | Delta % | Limit | Status |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ];

  for (const row of rows) {
    lines.push(
      [
        `\`${row.name}\``,
        formatBytes(row.baseSize),
        formatBytes(row.currentSize),
        formatDelta(row.deltaBytes),
        row.deltaPercent,
        formatBytes(row.sizeLimit),
        row.status,
      ].join(' | '),
    );
  }

  return `${lines.join('\n')}\n`;
}

const args = parseArgs(process.argv.slice(2));
const baseFile = args.get('base');
const currentFile = args.get('current');
if (!baseFile || !currentFile) {
  throw new Error('Usage: node scripts/size-limit-delta.mjs --base main.json --current pr.json');
}

const rows = buildRows(await readResults(baseFile), await readResults(currentFile));
const markdown = buildMarkdown(rows);

const markdownFile = args.get('markdown');
if (markdownFile) {
  await writeFile(markdownFile, markdown);
}

const jsonFile = args.get('json');
if (jsonFile) {
  await writeFile(jsonFile, `${JSON.stringify({ rows }, null, 2)}\n`);
}

console.log(markdown);

if (rows.some((row) => row.status === 'fail')) {
  process.exitCode = 1;
}
