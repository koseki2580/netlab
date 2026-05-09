import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import rule from './no-hardcoded-sandbox-string.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaFeatures: { jsx: true },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
});

ruleTester.run('no-hardcoded-sandbox-string', rule, {
  valid: [
    { code: `const x = <button>{t('foo.bar')}</button>;` },
    { code: `const x = <button aria-label={t('foo.bar')}>{t('a.b')}</button>;` },
    { code: `const x = <button>?</button>;` },
    { code: `const x = <button>{count}</button>;` },
    { code: `const x = <span data-testid="sandbox-panel">{t('a.b')}</span>;` }, // data-testid not in attr list
  ],
  invalid: [
    {
      code: `const x = <button>Sandbox</button>;`,
      errors: [{ messageId: 'hardcodedJsxText' }],
    },
    {
      code: `const x = <button aria-label="Open sandbox">Click</button>;`,
      errors: [
        { messageId: 'hardcodedAttribute' },
        { messageId: 'hardcodedJsxText' },
      ],
    },
    {
      code: `const x = <input placeholder="Search edits..." />;`,
      errors: [{ messageId: 'hardcodedAttribute' }],
    },
    {
      code: `const x = <h2>Compare mode</h2>;`,
      errors: [{ messageId: 'hardcodedJsxText' }],
    },
  ],
});

// RuleTester throws on failure; reaching here means the rule behaves as expected.
import { describe, it, expect } from 'vitest';
describe('no-hardcoded-sandbox-string rule', () => {
  it('passes RuleTester valid + invalid cases', () => {
    expect(true).toBe(true);
  });
});
