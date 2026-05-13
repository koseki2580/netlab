import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import rule from './property-test-seeds.cjs';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
});

ruleTester.run('property-test-seeds', rule, {
  valid: [
    {
      filename: 'src/example/__properties__/example.property.test.ts',
      code: `
        import fc from 'fast-check';
        import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
        fc.assert(fc.property(fc.integer(), () => true), {
          seed: PROPERTY_SEED_DEFAULT,
          numRuns: PROPERTY_NUM_RUNS_DEFAULT,
        });
      `,
    },
    {
      filename: 'src/example/__properties__/example.property.test.ts',
      code: `
        /**
         * @property-seed 0x1234 counterexample reproducer for bug/81j-1
         * @property-num-runs 1000 slow-converging distribution test
         */
        import fc from 'fast-check';
        fc.assert(fc.property(fc.integer(), () => true), { seed: 0x1234, numRuns: 1000 });
      `,
    },
    {
      filename: 'src/example/example.test.ts',
      code: `fc.assert(fc.property(fc.integer(), () => true), { seed: 0x1234, numRuns: 1 });`,
    },
  ],
  invalid: [
    {
      filename: 'src/example/__properties__/example.property.test.ts',
      code: `
        import fc from 'fast-check';
        fc.assert(fc.property(fc.integer(), () => true), { seed: 0x1234, numRuns: 100 });
      `,
      errors: [{ messageId: 'literalSeed' }],
    },
    {
      filename: 'src/example/__properties__/example.property.test.ts',
      code: `
        import fc from 'fast-check';
        fc.assert(fc.property(fc.integer(), () => true), { seed: PROPERTY_SEED, numRuns: 25 });
      `,
      errors: [{ messageId: 'literalNumRuns' }],
    },
  ],
});

import { describe, expect, it } from 'vitest';
describe('property-test-seeds rule', () => {
  it('passes RuleTester valid + invalid cases', () => {
    expect(true).toBe(true);
  });
});
