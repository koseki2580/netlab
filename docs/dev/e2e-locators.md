# E2E Locator Policy

Playwright e2e specs in [`e2e/`](../../e2e/) target a **single locator
convention**: stable `data-testid` attributes wired up through
[`e2e/selectors.ts`](../../e2e/selectors.ts) and Page Object Models (POMs)
under [`e2e/pages/`](../../e2e/pages/).

This policy retires the historical mix of regex role queries
(`getByRole('button', { name: /change tunnel key/i })`), `getByLabel`-based
form lookups, and `getByText` assertions, which coupled tests to UI microcopy.
Three regressions in a single sprint (`0d07474`, `6b47196`, `68f1308`) were
all caused by label rename or DOM-structure churn — testid-only resolves that
brittleness class.

## What e2e specs MUST use

Inside `e2e/**/*.spec.ts` (with the [exceptions](#exceptions) listed below):

- `page.getByTestId('<testid>')` — preferred for stable widget identity.
- `page.locator('[data-testid="<testid>"]')` — equivalent; pick one per file.
- Helpers from `e2e/pages/<Page>.ts` — POM methods that return `Locator`.
- Importing string constants from `e2e/selectors.ts` rather than hand-typing
  the id in a spec.

## What e2e specs MUST NOT use

- `page.getByText(...)` — couples to copy.
- `page.locator('text=...')` — same.
- `page.getByRole(role, { name: /.../i })` — regex role-name queries.
- `page.getByRole(role, { name: '...' })` — exact role-name queries that
  exist only to find a button by its visible label.
- `page.getByLabel('...')` for clicks/fills, when the field is reachable by
  a testid.

The lint rule [`netlab/no-raw-locators-in-e2e`](./eslint-rules.md#no-raw-locators-in-e2e)
flags these patterns automatically.

## Naming convention

Testids are kebab-case strings using `<area>-<element>` (or
`<area>-<feature>-<element>`):

```
sandbox-panel
sandbox-panel-resize-handle
sandbox-nat-rule-kind
sandbox-nat-rule-add
gallery-locale-toggle-ja
command-palette-search
```

Rules:

- ASCII lowercase letters, digits, and `-` only.
- Start with the bounded UI area: `sandbox`, `gallery`, `command-palette`,
  `node-detail`, `progress`, `tutorial`, `sandbox-intro`, `assessment`,
  `sandbox-pcap`, etc.
- Pre-existing kebab-case ids without an area prefix (e.g. `gre-outer`,
  `wireless-loss`) are grandfathered in; do not rename them.
- Co-locate string constants in `e2e/selectors.ts`. New testids land both in
  the component **and** in that file, in the same change.

## Adding a testid

1. Add the string constant to `e2e/selectors.ts` under the matching area.
2. Apply `data-testid={…}` (or a literal string) on the interactive element
   in the component — preserve existing `aria-label`, `aria-labelledby`, and
   `role`. Testids are additive to a11y, not a replacement.
3. Surface the locator in the relevant POM under `e2e/pages/` as a method or
   getter that returns a `Locator`.
4. Use the POM method (not the raw testid) from the spec.

## POMs

The four core POMs are:

- [`SandboxPage`](../../e2e/pages/SandboxPage.ts) — sandbox panel, tabs,
  edit popovers, parameters, traffic, undo/reset, PCAP downloads, intro.
- [`GalleryPage`](../../e2e/pages/GalleryPage.ts) — gallery shell, locale
  toggle, learner-progress panel, assessment entry points.
- [`NodeDetailPage`](../../e2e/pages/NodeDetailPage.ts) — node-detail panel
  open/close, sandbox edit popover anchored to a node, NAT and route forms.
- [`CommandBarPage`](../../e2e/pages/CommandBarPage.ts) — global command
  palette open/close, search box, option selection.

Methods return `Locator` (so the spec can chain `expect(...).toHaveText(...)`),
or perform an interaction (e.g. `applyMtuEdit(value)`). POMs never expose
raw selector strings.

## Exceptions

Three carve-outs allow role-based queries by design:

| Case                                                                                              | Reason                                                         | How to opt out                                                          |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `e2e/a11y.spec.ts`                                                                                | axe-core run; no role queries.                                 | n/a (rule not triggered).                                               |
| Specs ending in `-a11y.spec.ts` (`sandbox-a11y-flow.spec.ts`, `sandbox-annotations-a11y.spec.ts`) | Deliberately exercise the role/aria tree.                      | Whole file is exempt by the rule.                                       |
| One-off role assertion that _tests_ the role tree                                                 | Document why the role check is the actual subject of the test. | `// eslint-disable-next-line netlab/no-raw-locators-in-e2e -- <reason>` |

Dialogs and tab-list role queries that test focus or aria semantics also
belong in the `-a11y.spec.ts` files; move them there rather than disabling
the rule line-by-line.

## Why not labels/roles by default?

- Microcopy changes (translators, i18n parity work, command-bar rewrites)
  rename labels frequently. Testids stay put.
- React Aria components change their internal DOM structure between minor
  releases; role trees shift, testids don't.
- Greppable: `grep "sandbox-pcap-branch"` lands you in one component and one
  spec. `getByRole('button', { name: /pcap/i })` matches three buttons.
- a11y assertions still happen — they belong in the `-a11y.spec.ts` files,
  where the role tree IS the test subject.

## Fix recipe

Migrate one spec at a time, in a tight loop:

1. Open the spec and the matching POM file.
2. For each raw locator: identify the underlying element in the component,
   add a testid + constant, expose a POM method, update the spec to call it.
3. Run `npx playwright test <spec> --project=chromium` to confirm green.
4. Run `npm run lint -- e2e/<spec>` to confirm the rule no longer fires.
