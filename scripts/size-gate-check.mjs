#!/usr/bin/env node
/**
 * Fails `npm run size` when a learn tier, or a locale loaded on demand (TC-1496)
 * (`dist/locales/*`, REQ-356), reaches another eager closure (docs/dev/size-gate.md).
 */
import { globSync } from 'node:fs';
import checks from '../.size-limit.mjs';
import { eagerClosure, findLearnTierLeaks } from './size-gate.mjs';

const entries = checks
  .filter((check) => !check.name?.startsWith('pack:'))
  .flatMap((check) => globSync(check.path));
const leaks = findLearnTierLeaks(entries);
for (const { entry, chunk } of leaks) {
  console.error(`learn tier in an eager closure: ${entry} reaches ${chunk}`);
}
const LOCALE = /[\\/]locales[\\/][a-z-]+\.(?:js|mjs|cjs)$/;
const localeLeaks = entries
  .filter((entry) => !LOCALE.test(entry))
  .flatMap((entry) =>
    eagerClosure(entry)
      .filter((file) => LOCALE.test(file))
      .map((chunk) => ({ entry, chunk })),
  );
for (const { entry, chunk } of localeLeaks) {
  console.error(`locale in an eager closure: ${entry} reaches ${chunk}`);
}
if (leaks.length > 0 || localeLeaks.length > 0 || entries.length === 0) process.exit(1);
console.log(`size gate: no learn tier or locale in ${entries.length} eager closures`);
