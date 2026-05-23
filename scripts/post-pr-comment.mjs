#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const DEFAULT_MARKER = '<!-- netlab-size-limit-delta -->';

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

async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method ?? 'GET'} ${url} failed: ${response.status} ${body}`);
  }

  return response.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bodyFile = args.get('body');
  const marker = args.get('marker') ?? DEFAULT_MARKER;

  if (!bodyFile) {
    throw new Error('Usage: node scripts/post-pr-comment.mjs --body comment.md');
  }

  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !repository || !eventPath) {
    console.log('Skipping PR comment: GitHub Actions pull request environment is unavailable.');
    return;
  }

  const event = JSON.parse(await readFile(eventPath, 'utf8'));
  const pullRequestNumber = event.pull_request?.number;
  if (!pullRequestNumber) {
    console.log('Skipping PR comment: event is not a pull request.');
    return;
  }

  const body = await readFile(bodyFile, 'utf8');
  const [owner, repo] = repository.split('/');
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
  const comments = await request(`${apiBase}/issues/${pullRequestNumber}/comments?per_page=100`, {
    method: 'GET',
  });
  const existing = comments.find(
    (comment) => comment.user?.type === 'Bot' && comment.body?.includes(marker),
  );

  if (existing) {
    await request(existing.url, { method: 'PATCH', body: JSON.stringify({ body }) });
    console.log(`Updated size delta comment ${existing.id}.`);
    return;
  }

  const created = await request(`${apiBase}/issues/${pullRequestNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  console.log(`Created size delta comment ${created.id}.`);
}

main().catch((error) => {
  console.warn(error.message);
  process.exitCode = 0;
});
