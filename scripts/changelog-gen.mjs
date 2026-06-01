#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SECTION_ORDER = [
  ['Breaking', (commit) => commit.breaking],
  ['Features', (commit) => commit.type === 'feat' && !commit.breaking],
  ['Fixes', (commit) => commit.type === 'fix' && !commit.breaking],
  ['Docs', (commit) => commit.type === 'docs' && !commit.breaking],
  [
    'Internal',
    (commit) =>
      ['chore', 'refactor', 'test', 'perf', 'ci'].includes(commit.type) && !commit.breaking,
  ],
];

export function parseCommitLine(line) {
  const match = line.match(
    /^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(?:(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*:\s*)?(.*)$/u,
  );
  if (!match) {
    return null;
  }

  const [, type, scope = '', bang = '', summary = ''] = match;
  const planMatch =
    scope.match(/^plan[-/](\d+[a-z]?)$/i) ??
    scope.match(/^(\d+[a-z]?)$/i) ??
    summary.match(/plan\/(\d+[a-z]?)/i);
  return {
    type,
    scope,
    breaking: bang === '!' || scope.toUpperCase() === 'BREAKING',
    summary: summary.trim(),
    planId: planMatch?.[1],
  };
}

function formatEntry(commit) {
  const plan = commit.planId ? ` (plan/${commit.planId})` : '';
  const scope = commit.scope && !commit.planId ? ` (${commit.scope})` : '';
  return `- ${commit.summary}${plan}${scope}`;
}

export function generateChangelog({ version, commits }) {
  const parsed = commits.map(parseCommitLine).filter(Boolean);
  const lines = [`## ${version}`, ''];

  for (const [heading, predicate] of SECTION_ORDER) {
    const entries = parsed.filter(predicate);
    if (entries.length === 0) {
      continue;
    }
    lines.push(`### ${heading}`, '');
    lines.push(...entries.map(formatEntry), '');
  }

  return `${lines.join('\n').trim()}\n`;
}

function readPackageVersion() {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  return packageJson.version ?? 'Unreleased';
}

function commitsSinceLastTag() {
  const tag = spawnSync('git', ['describe', '--tags', '--abbrev=0'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const range = tag.status === 0 && tag.stdout.trim() ? `${tag.stdout.trim()}..HEAD` : 'HEAD';
  const result = spawnSync('git', ['log', range, '--pretty=%s'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'git log failed');
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function main() {
  const version = readPackageVersion();
  const commits = commitsSinceLastTag();
  process.stdout.write(generateChangelog({ version, commits }));
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  main();
}
