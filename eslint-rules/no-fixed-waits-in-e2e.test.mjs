import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { createRequire } from 'node:module';
import { describe, it } from 'vitest';

const require = createRequire(import.meta.url);
const rule = require('./no-fixed-waits-in-e2e.cjs');

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
});

// RuleTester registers the rule under `rule-to-test/`, so disable comments name it so.
ruleTester.run('no-fixed-waits-in-e2e', rule, {
  valid: [
    { code: `await page.getByTestId('demo-primary-action').click();` },
    { code: `await button.click({ trial: true });` },
    { code: `await button.click({ position: { x: 6, y: 6 } });` },
    { code: `await expect(next).toBeDisabled({ timeout: 500 });` },
    { code: `await expect.poll(read, { timeout: 1500 }).toBe('x');` },
    { code: `await lesson.stepOnce();` },
    {
      code: `// eslint-disable-next-line rule-to-test/no-fixed-waits-in-e2e -- nothing may appear in this window
await page.waitForTimeout(300);`,
    },
  ],
  invalid: [
    {
      code: `await page.waitForTimeout(400);`,
      errors: [{ messageId: 'waitForTimeout' }],
    },
    {
      code: `await page.getByTestId('demo-primary-action').click({ timeout: 2_000 });`,
      errors: [{ messageId: 'clickTimeout' }],
    },
    {
      code: `await next.click({ timeout: 2_000 }).catch(() => undefined);`,
      errors: [{ messageId: 'clickTimeout' }],
    },
    {
      code: `await button.click({ trial: true, 'timeout': 2_000 });`,
      errors: [{ messageId: 'clickTimeout' }],
    },
    {
      // Disabled, but without saying why: the comment itself is reported.
      code: `// eslint-disable-next-line rule-to-test/no-fixed-waits-in-e2e
await page.waitForTimeout(300);`,
      errors: [{ messageId: 'explainDisable' }],
    },
  ],
});
