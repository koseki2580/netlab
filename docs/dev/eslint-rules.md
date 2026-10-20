# Local ESLint Rules

Netlab keeps project-specific lint rules in [`eslint-rules/`](../../eslint-rules/).
They are loaded from [`eslint.config.js`](../../eslint.config.js) under the
local `netlab/*` rule namespace.

## Rule Catalog

| Rule                                 | Source                                                                                               | Applies to                                                        | Purpose                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `netlab/deprecation-annotations`     | [`eslint-rules/deprecation-annotations.cjs`](../../eslint-rules/deprecation-annotations.cjs)         | `src/**/*.ts`, `src/**/*.tsx`                                     | Requires every `@deprecated` JSDoc block to name both `@removeAt v<minor>` and `@migrate <replacement>`. |
| `netlab/no-hardcoded-sandbox-string` | [`eslint-rules/no-hardcoded-sandbox-string.mjs`](../../eslint-rules/no-hardcoded-sandbox-string.mjs) | Files listed in `I18N_ENFORCED_FILES`                             | Keeps swept sandbox and assessment UI text behind `useI18n().t()`.                                       |
| `netlab/property-test-seeds`         | [`eslint-rules/property-test-seeds.cjs`](../../eslint-rules/property-test-seeds.cjs)                 | `src/**/__properties__/**/*.test.ts`, `src/**/*.property.test.ts` | Keeps property-test seeds and run counts reproducible through the shared defaults.                       |
| `netlab/no-fixed-waits-in-e2e`       | [`eslint-rules/no-fixed-waits-in-e2e.cjs`](../../eslint-rules/no-fixed-waits-in-e2e.cjs)             | `e2e/**/*.ts`                                                     | Bans `waitForTimeout` and `click({ timeout })`; e2e waits on page state, not on the clock.               |

## Deprecation Annotations

Use this rule when changing public API. A deprecated export must tell consumers
when it can disappear and how to migrate.

```ts
/**
 * @deprecated use NewTraceInspector instead.
 * @removeAt v0.3
 * @migrate import { NewTraceInspector } from 'netlab'
 */
export const LegacyTraceInspector = NewTraceInspector;
```

Fix recipe:

1. Add `@removeAt v<minor>` with the first minor version where deletion is
   allowed.
2. Add `@migrate <replacement>` with a concrete import, prop, or behavior change.
3. Update [`docs/core/deprecation-lifecycle.md`](../core/deprecation-lifecycle.md)
   when the deprecation affects public consumers.

Escape hatch:

```ts
// eslint-disable-next-line netlab/deprecation-annotations -- internal generated docs block
```

## Hardcoded Sandbox Strings

Use this rule when migrating sandbox or assessment UI into the i18n catalog.
It flags JSX text and translatable JSX attributes such as `aria-label`, `title`,
`placeholder`, and `aria-roledescription`.

```tsx
const { t } = useI18n();

return (
  <button aria-label={t('sandbox.panel.openButton.label')}>
    {t('sandbox.panel.openButton.text')}
  </button>
);
```

Fix recipe:

1. Add the English source string to the relevant file under
   [`src/i18n/locales/en/`](../../src/i18n/locales/en/).
2. Aggregate new sub-catalog files from
   [`src/i18n/locales/en.ts`](../../src/i18n/locales/en.ts).
3. Replace visible text and supported attributes with `t('<key>')`.
4. Add the migrated component path to `I18N_ENFORCED_FILES` in
   [`eslint.config.js`](../../eslint.config.js).

Escape hatch:

```tsx
// eslint-disable-next-line netlab/no-hardcoded-sandbox-string -- protocol token, not translatable UI copy
```

## Property Test Seeds

Use this rule for property tests so a failing seed can be replayed consistently.
Property tests should import the shared defaults unless a specific seed or run
count is part of the test's purpose.

```ts
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';

fc.assert(property, {
  seed: PROPERTY_SEED_DEFAULT,
  numRuns: PROPERTY_NUM_RUNS_DEFAULT,
});
```

Fix recipe:

1. Replace literal `seed` values with `PROPERTY_SEED_DEFAULT`.
2. Replace non-default literal `numRuns` values with `PROPERTY_NUM_RUNS_DEFAULT`.
3. If a literal is intentional, add a nearby comment with `@property-seed` or
   `@property-num-runs` that explains why the deviation exists.

Escape hatch:

```ts
// @property-seed fixed regression seed from issue 123
fc.assert(property, { seed: 8675309 });
```

## No Fixed Waits In E2E

A fixed sleep is too long on a fast machine and too short on a loaded one, and
a shortened click timeout is how a test races a button that disables itself a
render later. The rule flags both in `e2e/**/*.ts`, a11y specs included:

- `page.waitForTimeout(...)` (any receiver)
- `locator.click({ timeout })`

Fix recipe:

1. Wait for the state the test needs: `expect(...)`, `expect.poll(...)`.
2. To step a lesson, use [`LessonPage`](../../e2e/pages/LessonPage.ts)
   (`stepOnce`, `stepUntil`, `stepToEnd`), which waits for each press to render.
3. For motion with no "done" state (a canvas easing to its fit, a pan coming to
   rest), use `settled()` from [`e2e/fixtures/settle.ts`](../../e2e/fixtures/settle.ts).

Escape hatch, only when the wait is the point of the test (asserting that
something does NOT happen within a window). The reason is required: a disable
comment for this rule without `-- <reason>` is itself reported.

```ts
// eslint-disable-next-line netlab/no-fixed-waits-in-e2e -- nothing may animate in this window
await page.waitForTimeout(500);
```
