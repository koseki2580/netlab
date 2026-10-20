'use strict';

/**
 * netlab/no-fixed-waits-in-e2e
 *
 * In Playwright specs under `e2e/**`, forbid the two ways a test waits on the
 * clock instead of on the page:
 *
 *   - `waitForTimeout(...)` on any receiver — a fixed sleep is too long on a
 *     fast machine and too short on a loaded one.
 *   - `click({ timeout })` — a shortened click timeout is how a test races a
 *     button that disables itself a render later. Wait for the state instead
 *     (`LessonPage.stepOnce()` for step buttons).
 *
 * A wait that is the point of the test — asserting that something does NOT
 * happen within a window — may stay, behind a disable comment that says why:
 *
 *   // eslint-disable-next-line netlab/no-fixed-waits-in-e2e -- <reason>
 *
 * A disable comment for this rule without a `-- <reason>` is itself reported.
 *
 * See `docs/dev/eslint-rules.md`.
 */
const RULE_NAME = 'netlab/no-fixed-waits-in-e2e';
const BARE_NAME = 'no-fixed-waits-in-e2e';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid fixed sleeps and shortened click timeouts in Playwright e2e specs; wait on page state instead.',
    },
    schema: [],
    messages: {
      waitForTimeout:
        'Avoid `waitForTimeout(...)` in e2e specs. Wait for the state the test needs (`expect(...)`, `expect.poll`, `settled()` from e2e/fixtures/settle.ts). If the wait is the point of the test, disable this rule on the line and say why.',
      clickTimeout:
        'Avoid `click({ timeout })` in e2e specs. Wait for the control to be ready instead (`LessonPage.stepOnce()` for step buttons). If the timeout is the point of the test, disable this rule on the line and say why.',
      explainDisable: `Say why \`${RULE_NAME}\` is disabled here: \`-- <reason>\` after the rule name.`,
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    function calleeName(node) {
      const callee = node.callee;
      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        return callee.property.name;
      }
      return callee.type === 'Identifier' ? callee.name : null;
    }

    function hasTimeoutOption(node) {
      return node.arguments.some(
        (arg) =>
          arg.type === 'ObjectExpression' &&
          arg.properties.some(
            (prop) =>
              prop.type === 'Property' &&
              ((prop.key.type === 'Identifier' && prop.key.name === 'timeout') ||
                (prop.key.type === 'Literal' && prop.key.value === 'timeout')),
          ),
      );
    }

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          const text = comment.value.trim();
          // Matched without its plugin prefix, which differs under RuleTester.
          if (!/^eslint-disable/.test(text) || !text.includes(BARE_NAME)) continue;
          const [, reason = ''] = text.split(/\s--\s/);
          if (reason.trim().length === 0) {
            context.report({ loc: comment.loc, messageId: 'explainDisable' });
          }
        }
      },
      CallExpression(node) {
        const name = calleeName(node);
        if (name === 'waitForTimeout') {
          context.report({ node, messageId: 'waitForTimeout' });
        } else if (name === 'click' && node.callee.type === 'MemberExpression') {
          if (hasTimeoutOption(node)) context.report({ node, messageId: 'clickTimeout' });
        }
      },
    };
  },
};
