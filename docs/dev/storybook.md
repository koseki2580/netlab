# Storybook

Storybook gives every sandbox component a visual harness in isolation, with
controls (knobs) for varying props and an axe-core a11y gate that runs against
the built static output. Storybook is **dev-only** — it does not affect the
published library bundle.

## Running Storybook

```bash
# Boot the dev server on http://localhost:6006
npm run storybook

# Build the static output to ./storybook-static
npm run storybook:build

# Serve the static output and run the a11y test runner
npx http-server storybook-static --port 6006 --silent &
npx wait-on tcp:127.0.0.1:6006
npm run storybook:test
```

Storybook is configured for the project's existing Vite + React 18 stack via
[`@storybook/react-vite`](https://storybook.js.org/docs/builders/vite). All
configuration lives in [`.storybook/`](../../.storybook/):

- `main.ts` — registers `*.stories.@(ts|tsx)` files in `src/`, the
  `@storybook/addon-a11y` addon, and disables Storybook telemetry.
- `preview.ts` — global `parameters.a11y` with `test: 'error'` so axe-core
  violations fail the test runner.
- `test-runner.ts` — `preVisit` injects axe; `postVisit` runs `checkA11y`
  honouring per-story `parameters.a11y.config`.

## Adding a story

Stories live next to the component they exercise:

```text
src/components/sandbox/EditPopover.tsx
src/components/sandbox/EditPopover.stories.tsx
```

Use the [Component Story Format 3](https://storybook.js.org/docs/api/csf)
default export pattern:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Sandbox/MyComponent',
  component: MyComponent,
  args: {
    /* default props */
  },
};

export default meta;

type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {};
export const EmptyState: Story = { args: { items: [] } };
```

For β-aware sandbox components, ship one `Alpha…` and one `Beta…` story so
mode-specific visuals are reviewable side-by-side.

## When to Add a Story

Add or update a story when a component is part of a public or review-facing
surface:

- Components exported from `src/index.ts` or otherwise intended for external
  consumers.
- Sandbox UI components, including edit forms, replay controls, snapshots,
  annotations, assessments, warnings, and empty states.
- State-bearing leaf components where visual states matter, such as loading,
  empty, error, disabled, selected, or beta-mode variants.
- Components with non-trivial accessibility behavior that should run through the
  Storybook axe gate.

Do not add a story only because a private implementation detail exists. If a
component is useful solely through its parent, cover the parent state instead.

## Fixtures

Reusable fixtures live under
[`src/testing/fixtures/sandbox/`](../../src/testing/fixtures/sandbox/):

- `buildSnapshot(name)` — deterministic `SimulationSnapshot` for the named
  scenario (`mtu`, `tcp`, `ospf`, `arp`, `nat`).
- `emptySession() / singleEditSession() / threeEditsSession() /
midReplaySession() / annotationEditsSession()` — pre-built `EditSession`
  instances covering common UX states.
- `<SandboxStoryDecorator>` — wraps a story in `<NetlabContext>` +
  `<SandboxContext>` populated from the fixtures so consumers of `useSandbox()`
  render without a real provider tree.
- `buildRecording()` — `RecordedSession` fixture for replay/recording stories.
- `annotationFixtures()` — preseed data for annotation-aware stories.

These constructors are pure — no network, no Workers, no demo wiring. They
import from `src/` types directly; if a type changes, the fixtures break at
compile time.

## Accessibility (a11y) gate

Every story is run through `axe-core` via the test runner. To silence a
specific rule for a story (only when the rule's verdict is genuinely
inapplicable to the component's role), declare it in `parameters`:

```tsx
const meta: Meta<typeof Component> = {
  title: 'Sandbox/Component',
  component: Component,
  parameters: {
    a11y: {
      // The panel relies on CSS variables that resolve to real colours only
      // inside the demo shell. axe's color-contrast check is therefore not
      // meaningful here; runtime contrast is enforced by the accessibility tests.
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
};
```

Unexplained silencing is rejected at code review. If you need to disable a
rule, comment **why**.

## Storybook is not an E2E substitute

Storybook is for visual / interactive review of components in isolation. It
runs against fixtures, not real demo flows. Do **not** replace Playwright e2e
tests against real demos with story `play` functions — see lesson L040.

## Caveats

- **CSS variables** (`var(--netlab-*)`) resolve to fallback values inside the
  Storybook iframe. Stories that depend on real branding should be reviewed in
  the demo, not Storybook.
- **`@xyflow/react`-heavy components** (e.g. `<BeforeAfterView>`) render their
  canvas in Storybook but require enough viewport height — set
  `parameters.layout = 'fullscreen'`.
- **Worker context** is unavailable in some story variants. Components that
  resolve via the worker fall back to the main-thread engine path.
