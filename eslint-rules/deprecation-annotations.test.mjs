import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import rule from './deprecation-annotations.cjs';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
});

ruleTester.run('deprecation-annotations', rule, {
  valid: [
    {
      code: `
        /**
         * @deprecated Use newHelper instead.
         * @removeAt v0.2.0
         * @migrate newHelper
         */
        export function oldHelper() {}
      `,
    },
    {
      code: `export function stableHelper() {}`,
    },
  ],
  invalid: [
    {
      code: `
        /**
         * @deprecated Use newHelper instead.
         * @migrate newHelper
         */
        export function oldHelper() {}
      `,
      errors: [{ messageId: 'missingRemoveAt' }],
    },
    {
      code: `
        /**
         * @deprecated Use newHelper instead.
         * @removeAt v0.2.0
         */
        export function oldHelper() {}
      `,
      errors: [{ messageId: 'missingMigrate' }],
    },
    {
      code: `
        /**
         * @deprecated Use newHelper instead.
         */
        export function oldHelper() {}
      `,
      errors: [{ messageId: 'missingRemoveAt' }, { messageId: 'missingMigrate' }],
    },
  ],
});

import { describe, expect, it } from 'vitest';
describe('deprecation-annotations rule', () => {
  it('passes RuleTester valid + invalid cases', () => {
    expect(true).toBe(true);
  });
});
