#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');

export function extractPlaceholders(text) {
  const names = [];
  const seen = new Set();
  const pattern = /{{\s*([A-Za-z0-9_]+)\s*}}/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }

  return names;
}

function sameStringList(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

export function compareCatalogs(enCatalog, targetCatalog) {
  const enKeys = Object.keys(enCatalog).sort();
  const targetKeys = Object.keys(targetCatalog).sort();
  const targetKeySet = new Set(targetKeys);
  const enKeySet = new Set(enKeys);
  const missingKeys = enKeys.filter((key) => !targetKeySet.has(key));
  const extraKeys = targetKeys.filter((key) => !enKeySet.has(key));
  const placeholderMismatches = enKeys
    .filter((key) => targetKeySet.has(key))
    .map((key) => ({
      key,
      en: extractPlaceholders(String(enCatalog[key])),
      target: extractPlaceholders(String(targetCatalog[key])),
    }))
    .filter((entry) => !sameStringList(entry.en, entry.target));

  return {
    ok: missingKeys.length === 0 && extraKeys.length === 0 && placeholderMismatches.length === 0,
    missingKeys,
    extraKeys,
    placeholderMismatches,
  };
}

export function formatI18nReport(report) {
  if (report.ok) {
    return 'i18n parity ok';
  }

  const lines = ['i18n parity failed'];
  if (report.missingKeys.length > 0) {
    lines.push('', 'Missing keys:');
    lines.push(...report.missingKeys.map((key) => `  - ${key}`));
  }
  if (report.extraKeys.length > 0) {
    lines.push('', 'Extra keys:');
    lines.push(...report.extraKeys.map((key) => `  - ${key}`));
  }
  if (report.placeholderMismatches.length > 0) {
    lines.push('', 'Placeholder mismatches:');
    for (const mismatch of report.placeholderMismatches) {
      lines.push(
        `  - ${mismatch.key}: en=[${mismatch.en.join(', ')}] target=[${mismatch.target.join(', ')}]`,
      );
    }
  }

  return lines.join('\n');
}

async function loadCatalog(entryPoint, exportName) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  });
  const output = result.outputFiles[0];
  if (!output) {
    throw new Error(`esbuild produced no output for ${entryPoint}`);
  }
  const encoded = Buffer.from(output.text).toString('base64');
  const module = await import(`data:text/javascript;base64,${encoded}`);
  const catalog = module[exportName];
  if (!catalog || typeof catalog !== 'object') {
    throw new Error(`Missing catalog export "${exportName}" from ${entryPoint}`);
  }
  return catalog;
}

/** `{ chunk: path }` for each concept-check chunk aggregator of a locale. */
function conceptChunkFiles(locale) {
  const dir = path.join(repoRoot, 'src/i18n/locales', locale, 'concept');
  const pattern = new RegExp(`^concept-${locale}-([a-z0-9]+)\\.ts$`);
  return Object.fromEntries(
    readdirSync(dir).flatMap((name) => {
      const match = pattern.exec(name);
      return match ? [[match[1], path.join(dir, name)]] : [];
    }),
  );
}

async function main() {
  const enCatalog = await loadCatalog(path.join(repoRoot, 'src/i18n/locales/en.ts'), 'en');
  const jaCatalog = await loadCatalog(path.join(repoRoot, 'src/i18n/locales/ja.ts'), 'ja');
  // The concept checks' strings load in chunks of their own (src/i18n/locales/<locale>/concept/,
  // one aggregator per chunk over per-deck files), outside the assembled en/ja. Each chunk must
  // match its counterpart in the other locale, so a key sits in the same chunk in both.
  const enChunks = conceptChunkFiles('en');
  const jaChunks = conceptChunkFiles('ja');
  const enConcept = {};
  const jaConcept = {};
  const chunkReports = [];
  for (const chunk of new Set([...Object.keys(enChunks), ...Object.keys(jaChunks)])) {
    if (!enChunks[chunk] || !jaChunks[chunk]) {
      console.error(`i18n parity failed: concept chunk "${chunk}" exists in only one locale`);
      process.exitCode = 1;
      return;
    }
    const en = await loadCatalog(enChunks[chunk], 'catalog');
    const ja = await loadCatalog(jaChunks[chunk], 'catalog');
    Object.assign(enConcept, en);
    Object.assign(jaConcept, ja);
    const chunkReport = compareCatalogs(en, ja);
    if (!chunkReport.ok) chunkReports.push([chunk, chunkReport]);
  }
  for (const [chunk, chunkReport] of chunkReports) {
    console.error(`concept chunk "${chunk}":\n${formatI18nReport(chunkReport)}`);
  }
  if (chunkReports.length > 0) {
    process.exitCode = 1;
    return;
  }
  const enMerged = { ...enCatalog, ...enConcept };
  const jaMerged = { ...jaCatalog, ...jaConcept };
  const report = compareCatalogs(enMerged, jaMerged);

  if (!report.ok) {
    console.error(formatI18nReport(report));
    process.exitCode = 1;
    return;
  }

  console.log(
    `i18n parity ok: ${Object.keys(enMerged).length} keys (${Object.keys(enChunks).length} concept chunks)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
