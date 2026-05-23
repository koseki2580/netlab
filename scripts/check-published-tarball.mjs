#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MAX_PACKED_BYTES = 1_572_864;
const MAX_UNPACKED_BYTES = 4_194_304;
const MAX_ENTRY_COUNT = 1200;
const PACKAGE_JSON = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const FORBIDDEN_PATH_PATTERNS = [
  /^dist\/test\//,
  /^dist\/temp\//,
  /^dist\/.*\.test\.(js|mjs|d\.ts)$/,
  /\.map$/,
  /^\.env(\..+)?$/,
  /^src\//,
];

function packMetadata() {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('npm pack --dry-run returned no metadata');
  }
  return parsed[0];
}

function fail(messages) {
  console.error('\n  npm tarball check failed:');
  for (const message of messages) {
    console.error(`  - ${message}`);
  }
  console.error('\nReview docs/deployment/npm-publishing.md for the published-tarball contract.\n');
  process.exit(1);
}

function collectExportPaths(value, paths) {
  if (typeof value === 'string') {
    if (value.startsWith('./')) {
      paths.add(value.slice(2));
    }
    return;
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      collectExportPaths(nested, paths);
    }
  }
}

function declaredPackageEntryPaths() {
  const paths = new Set();
  for (const field of ['main', 'module', 'types']) {
    if (typeof PACKAGE_JSON[field] === 'string') {
      paths.add(PACKAGE_JSON[field]);
    }
  }
  if (PACKAGE_JSON.bin && typeof PACKAGE_JSON.bin === 'object') {
    for (const value of Object.values(PACKAGE_JSON.bin)) {
      if (typeof value === 'string') {
        paths.add(value);
      }
    }
  }
  collectExportPaths(PACKAGE_JSON.exports, paths);
  return paths;
}

const meta = packMetadata();
const errors = [];
const shippedPaths = new Set((meta.files ?? []).map((entry) => entry.path));

if (meta.size > MAX_PACKED_BYTES) {
  errors.push(`packed size ${meta.size} bytes exceeds budget ${MAX_PACKED_BYTES} bytes`);
}
if (meta.unpackedSize > MAX_UNPACKED_BYTES) {
  errors.push(
    `unpacked size ${meta.unpackedSize} bytes exceeds budget ${MAX_UNPACKED_BYTES} bytes`,
  );
}
if (meta.entryCount > MAX_ENTRY_COUNT) {
  errors.push(`entry count ${meta.entryCount} exceeds budget ${MAX_ENTRY_COUNT}`);
}

for (const entry of meta.files ?? []) {
  for (const pattern of FORBIDDEN_PATH_PATTERNS) {
    if (pattern.test(entry.path)) {
      errors.push(`forbidden path shipped: ${entry.path} (matches ${pattern})`);
      break;
    }
  }
}

for (const entryPath of declaredPackageEntryPaths()) {
  if (!shippedPaths.has(entryPath)) {
    errors.push(`package entry path is not shipped: ${entryPath}`);
  }
}

if (errors.length > 0) {
  fail(errors);
}

console.log(
  `npm tarball OK — entries=${meta.entryCount}, packed=${meta.size} bytes, unpacked=${meta.unpackedSize} bytes`,
);
