'use strict';

/**
 * netlab/no-raw-locators-in-e2e
 *
 * In Playwright specs under `e2e/**`, forbid locator patterns that couple
 * tests to microcopy or DOM-structure churn:
 *
 *   - `getByText(...)` on any receiver
 *   - `getByLabel(...)` on any receiver
 *   - `getByRole(role, { name: ... })` — string or regex
 *   - `locator('text=...')` and `locator("text=...")`
 *
 * Auto-fix is intentionally not provided. The fix path is to add a
 * `data-testid` (catalogued in `e2e/selectors.ts`) and call it via the POM.
 *
 * Exempt specs (axe / role-tree intentional) ignore the rule whole-file via
 * the file globs configured in `eslint.config.js`.
 *
 * See `docs/dev/e2e-locators.md`.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid raw text / role-name / label locators in Playwright e2e specs; require data-testid via e2e/selectors.ts.',
    },
    schema: [],
    messages: {
      getByText:
        'Avoid `getByText(...)` in e2e specs. Add a `data-testid` and use `getByTestId(SEL.<area>.<element>)` (see docs/dev/e2e-locators.md).',
      getByLabel:
        'Avoid `getByLabel(...)` in e2e specs. Add a `data-testid` to the field and use `getByTestId(SEL.<area>.<element>)`.',
      getByRoleWithName:
        'Avoid `getByRole(..., { name: ... })` in e2e specs. The role-name approach couples to microcopy; add a `data-testid` and use `getByTestId(SEL.<area>.<element>)`. Role assertions belong in `*-a11y.spec.ts`.',
      locatorTextEngine:
        'Avoid `locator(\'text=...\')` in e2e specs. Use `getByTestId(SEL.<area>.<element>)` and `toContainText(...)` to scope text assertions.',
    },
  },
  create(context) {
    function isCalleeMethod(node, methodName) {
      return (
        node.callee &&
        node.callee.type === 'MemberExpression' &&
        node.callee.property &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === methodName
      );
    }

    function hasNameOption(node) {
      const arg = node.arguments[1];
      if (!arg || arg.type !== 'ObjectExpression') return false;
      return arg.properties.some(
        (prop) =>
          prop.type === 'Property' &&
          prop.key &&
          ((prop.key.type === 'Identifier' && prop.key.name === 'name') ||
            (prop.key.type === 'Literal' && prop.key.value === 'name')),
      );
    }

    function isTextEngineString(literalValue) {
      return typeof literalValue === 'string' && literalValue.trimStart().startsWith('text=');
    }

    return {
      CallExpression(node) {
        if (isCalleeMethod(node, 'getByText')) {
          context.report({ node, messageId: 'getByText' });
          return;
        }
        if (isCalleeMethod(node, 'getByLabel')) {
          context.report({ node, messageId: 'getByLabel' });
          return;
        }
        if (isCalleeMethod(node, 'getByRole') && hasNameOption(node)) {
          context.report({ node, messageId: 'getByRoleWithName' });
          return;
        }
        if (isCalleeMethod(node, 'locator')) {
          const arg = node.arguments[0];
          if (arg && arg.type === 'Literal' && isTextEngineString(arg.value)) {
            context.report({ node, messageId: 'locatorTextEngine' });
          }
        }
      },
    };
  },
};
