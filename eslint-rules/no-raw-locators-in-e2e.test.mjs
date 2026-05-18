import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rule = require('./no-raw-locators-in-e2e.cjs');

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
});

ruleTester.run('no-raw-locators-in-e2e', rule, {
  valid: [
    { code: `await page.getByTestId('sandbox-panel').click();` },
    { code: `await page.locator('[data-testid="sandbox-panel"]').click();` },
    { code: `await page.locator('.react-flow__node').filter({ hasText: 'R1' }).click();` },
    { code: `await page.getByRole('dialog').click();` }, // role without name
    { code: `await page.getByRole('listbox').count();` },
    { code: `await expect(sandboxPage.editPopover()).toContainText('Edit in sandbox');` },
    { code: `await expect(panel).toContainText('Compare');` },
    { code: `await page.keyboard.press('Escape');` },
    { code: `await page.locator('input[aria-label="Import sandbox session file"]').click();` },
    // Note: matching by attribute selector remains allowed for legitimate edge cases like
    // hidden file inputs, but the recommended path is data-testid.
  ],
  invalid: [
    {
      code: `await page.getByText('Demo gallery').click();`,
      errors: [{ messageId: 'getByText' }],
    },
    {
      code: `await page.getByText(/edits/i).click();`,
      errors: [{ messageId: 'getByText' }],
    },
    {
      code: `await page.getByLabel('MTU bytes').fill('500');`,
      errors: [{ messageId: 'getByLabel' }],
    },
    {
      code: `await page.getByRole('button', { name: /apply mtu/i }).click();`,
      errors: [{ messageId: 'getByRoleWithName' }],
    },
    {
      code: `await page.getByRole('button', { name: 'Apply MTU' }).click();`,
      errors: [{ messageId: 'getByRoleWithName' }],
    },
    {
      code: `await page.locator('text=NAT').click();`,
      errors: [{ messageId: 'locatorTextEngine' }],
    },
    {
      code: `const panel = page.getByTestId('p'); await panel.getByText('foo').click();`,
      errors: [{ messageId: 'getByText' }],
    },
    {
      code: `await sandboxPopover.getByRole('button', { name: 'Remove' }).click();`,
      errors: [{ messageId: 'getByRoleWithName' }],
    },
  ],
});

import { describe, it, expect } from 'vitest';
describe('no-raw-locators-in-e2e rule', () => {
  it('passes RuleTester valid + invalid cases', () => {
    expect(true).toBe(true);
  });
});
