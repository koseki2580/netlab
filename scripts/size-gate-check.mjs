#!/usr/bin/env node
/** Fails `npm run size` when a learn tier reaches an eager closure (docs/dev/size-gate.md). */
import { globSync } from 'node:fs';
import checks from '../.size-limit.mjs';
import { findLearnTierLeaks } from './size-gate.mjs';

const entries = checks
  .filter((check) => !check.name?.startsWith('pack:'))
  .flatMap((check) => globSync(check.path));
const leaks = findLearnTierLeaks(entries);
for (const { entry, chunk } of leaks) {
  console.error(`learn tier in an eager closure: ${entry} reaches ${chunk}`);
}
if (leaks.length > 0 || entries.length === 0) process.exit(1);
console.log(`size gate: no learn tier in ${entries.length} eager closures`);
