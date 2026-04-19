# Accessibility (WCAG 2.1 AA)

This document describes the accessibility standard, keyboard model, testing approach, and known exclusions for Netlab.

---

## Standard & Scope

Netlab targets **WCAG 2.1 Level AA** compliance for all UI components rendered inside `<NetlabThemeScope>`.

| Criterion                                   | Requirement                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| Color contrast (normal text)                | ≥ 4.5 : 1                                                                       |
| Color contrast (large text / UI components) | ≥ 3 : 1                                                                         |
| Keyboard navigation                         | All interactive controls reachable via Tab / arrow keys                         |
| Focus visibility                            | `:focus-visible` ring on every interactive element                              |
| ARIA roles                                  | All custom widgets carry appropriate `role`, `aria-label`, and state attributes |

---

## Color Tokens

The theme tokens in `src/theme/index.ts` are chosen so every text/background pair meets WCAG AA.

### Dark theme (`NETLAB_DARK_THEME`)

| Token           | Value     | Contrast on `#0f172a` |
| --------------- | --------- | --------------------- |
| `textPrimary`   | `#e2e8f0` | ~14 : 1 ✅            |
| `textSecondary` | `#94a3b8` | ~6.5 : 1 ✅           |
| `textMuted`     | `#94a3b8` | ~6.5 : 1 ✅           |
| `accentBlue`    | `#38bdf8` | ~8.4 : 1 ✅           |
| `accentGreen`   | `#22c55e` | ~5.4 : 1 ✅           |

### Light theme (`NETLAB_LIGHT_THEME`)

| Token           | Value     | Contrast on `#f8fafc`                               |
| --------------- | --------- | --------------------------------------------------- |
| `textPrimary`   | `#0f172a` | ~18 : 1 ✅                                          |
| `textSecondary` | `#475569` | — (secondary role, used with `textPrimary` context) |
| `textMuted`     | `#5a6a7e` | ~5.1 : 1 ✅                                         |

Contrast ratios are verified automatically by `src/theme/contrast.test.ts` (Vitest).

---

## Keyboard Model

### Tab order

Tab moves through the page in DOM order. The primary interactive regions are:

1. Simulation control toolbar (`SimulationControls`)
2. Canvas (React Flow — see Exclusions below)
3. Resizable sidebar drag handle
4. Sidebar scroll container
5. Panel lists (`PacketTimeline`, `SessionList`, `SessionDetail`, etc.)
6. Node / edge detail panels

### List widgets (listbox pattern)

`PacketTimeline` and `SessionList` use `role="listbox"` on the scroll container with individual `role="option"` items. The container receives `tabIndex={0}` so keyboard users can scroll without a pointer device.

### Toggle switches

Failure injection toggles (`FailureTogglePanel`) use `role="switch"` with `aria-checked`. They respond to Space / Enter.

### Icon-only buttons

All icon-only buttons carry an explicit `aria-label` describing their action (e.g., `aria-label="Play"`).

---

## Focus Ring

`NetlabThemeScope` injects a global CSS rule that renders a visible focus ring on every `:focus-visible` element:

```css
.netlab-focus-ring:focus-visible {
  outline: 2px solid var(--netlab-accent-blue);
  outline-offset: 2px;
}
```

Apply the `netlab-focus-ring` class to interactive elements that need the ring style.

---

## Verification

### Vitest contrast tests

```bash
npm test -- --grep contrast
# or run all unit tests
npm test
```

Tests live in `src/theme/contrast.test.ts`.

### axe-core E2E smoke tests

```bash
npm run e2e -- e2e/a11y.spec.ts
```

Each demo page registered in `demo/Gallery.tsx` is visited and audited with `@axe-core/playwright`. A zero-violation result is required.

### Manual checklist

1. Tab through the full page — every interactive element must be reachable and show a focus ring.
2. Activate toggle switches with Space; activate buttons with Enter.
3. Scroll list panels (`PacketTimeline`, `SessionList`) with keyboard after clicking into the container.

---

## Exclusions

The following regions are **excluded** from the axe audit because they are third-party or non-interactive:

| Selector                   | Reason                                                                           |
| -------------------------- | -------------------------------------------------------------------------------- |
| `.react-flow__renderer`    | React Flow canvas — SVG edges and node wrappers are not interactive text content |
| `.react-flow__attribution` | Third-party attribution link with fixed styling outside our control              |

Disabled UI components (e.g., grayed-out buttons when no simulation is running) are also exempt from contrast requirements per WCAG 2.1 SC 1.4.3 Note 1.

---

## ARIA Reference

| Component                    | Role                | Key attributes                |
| ---------------------------- | ------------------- | ----------------------------- |
| `SimulationControls` buttons | `button`            | `aria-label`, `aria-disabled` |
| `SimulationControls` status  | `status`            | live region                   |
| `FailureTogglePanel` toggles | `switch`            | `aria-checked`                |
| `RouteTable`                 | `table` + `caption` | semantic HTML                 |
| `AreaLegend`                 | `list` / `listitem` | color swatches `aria-hidden`  |
| `PacketTimeline`             | `listbox`           | `aria-label`, `tabIndex={0}`  |
| `SessionList`                | `listbox`           | `aria-label`, `tabIndex={0}`  |
