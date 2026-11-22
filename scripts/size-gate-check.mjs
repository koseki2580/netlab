#!/usr/bin/env node
/**
 * Fails `npm run size` when a learn tier, a locale loaded on demand (TC-1496,
 * `dist/locales/*`, REQ-356), a concept-check string chunk (`dist/concept-<locale>-<chunk>-*`,
 * REQ-365) or xterm.js (TC-1715, REQ-361) reaches another
 * eager closure (docs/dev/size-gate.md).
 */
import { globSync, readFileSync } from 'node:fs';
import checks from '../.size-limit.mjs';
import { eagerClosure, findLearnTierLeaks } from './size-gate.mjs';

const entries = checks
  .filter((check) => !check.name?.startsWith('pack:'))
  .flatMap((check) => globSync(check.path));
const leaks = findLearnTierLeaks(entries);
for (const { entry, chunk } of leaks) {
  console.error(`learn tier in an eager closure: ${entry} reaches ${chunk}`);
}
const LOCALE = /[\\/](?:locales[\\/][a-z-]+|concept-(?:en|ja)-[a-z0-9]+-[\w-]+)\.(?:js|mjs|cjs)$/;
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
// xterm.js is the demo's terminal, never the library's (REQ-361, TC-1715).
const XTERM_MARKER = 'xterm-helper-textarea';
const xtermLeaks = entries.flatMap((entry) =>
  eagerClosure(entry)
    .filter((file) => readFileSync(file, 'utf8').includes(XTERM_MARKER))
    .map((chunk) => ({ entry, chunk })),
);
for (const { entry, chunk } of xtermLeaks) {
  console.error(`xterm.js in a library closure: ${entry} reaches ${chunk}`);
}
if (leaks.length > 0 || localeLeaks.length > 0 || xtermLeaks.length > 0 || entries.length === 0)
  process.exit(1);
console.log(`size gate: no learn tier, locale or xterm.js in ${entries.length} eager closures`);
