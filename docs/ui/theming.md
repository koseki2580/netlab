# Theming

## Overview

NetlabApp ships with a built-in dark theme. The theming system lets you customize color tokens so the component blends seamlessly into a host page's design — for example, a light-mode documentation site.

Theming is implemented via **CSS custom properties (CSS variables)**:

- `NetlabApp` accepts an optional `theme` prop that is converted to CSS variables and injected on the outermost container `div`.
- Host pages can also override these variables via their own CSS stylesheets — no JavaScript required.
- Two preset themes are exported: `NETLAB_DARK_THEME` (default) and `NETLAB_LIGHT_THEME`.

---

## Theme Interface

```typescript
import type { NetlabTheme } from 'netlab';

interface NetlabTheme {
  // Backgrounds
  bgPrimary: string;      // Main container background
  bgSurface: string;      // Toolbar, raised surfaces
  bgElevated: string;     // Hover / elevated elements
  bgPanel: string;        // Floating overlay panels (supports rgba)

  // Borders
  border: string;         // Solid borders
  borderSubtle: string;   // Semi-transparent borders (supports rgba)

  // Text
  textPrimary: string;    // Main text
  textSecondary: string;  // Secondary / label text
  textMuted: string;      // Muted / hint text
  textFaint: string;      // Very dim text

  // Semantic accents (network-specific)
  accentBlue: string;     // Action buttons, primary highlights
  accentGreen: string;    // Routers, forward events
  accentRed: string;      // Drop / error events
  accentYellow: string;   // MAC addresses
  accentCyan: string;     // IP addresses, primary text accents

  // Node backgrounds
  nodeRouterBg: string;   // Router node container background
  nodeSwitchBg: string;   // Switch node container background
  nodeClientBg: string;   // Client node container background
  nodeServerBg: string;   // Server node container background
}
```

---

## CSS Variable Names

Each `NetlabTheme` field maps to a CSS custom property scoped to the component container:

| Field | CSS Variable |
|---|---|
| `bgPrimary` | `--netlab-bg-primary` |
| `bgSurface` | `--netlab-bg-surface` |
| `bgElevated` | `--netlab-bg-elevated` |
| `bgPanel` | `--netlab-bg-panel` |
| `border` | `--netlab-border` |
| `borderSubtle` | `--netlab-border-subtle` |
| `textPrimary` | `--netlab-text-primary` |
| `textSecondary` | `--netlab-text-secondary` |
| `textMuted` | `--netlab-text-muted` |
| `textFaint` | `--netlab-text-faint` |
| `accentBlue` | `--netlab-accent-blue` |
| `accentGreen` | `--netlab-accent-green` |
| `accentRed` | `--netlab-accent-red` |
| `accentYellow` | `--netlab-accent-yellow` |
| `accentCyan` | `--netlab-accent-cyan` |
| `nodeRouterBg` | `--netlab-node-router-bg` |
| `nodeSwitchBg` | `--netlab-node-switch-bg` |
| `nodeClientBg` | `--netlab-node-client-bg` |
| `nodeServerBg` | `--netlab-node-server-bg` |

---

## Built-in Themes

### Dark theme (default)

```typescript
import { NETLAB_DARK_THEME } from 'netlab';

// {
//   bgPrimary:     '#0f172a',
//   bgSurface:     '#1e293b',
//   bgElevated:    '#263144',
//   bgPanel:       'rgba(15, 23, 42, 0.95)',
//   border:        '#334155',
//   borderSubtle:  'rgba(100, 116, 139, 0.4)',
//   textPrimary:   '#e2e8f0',
//   textSecondary: '#94a3b8',
//   textMuted:     '#64748b',
//   textFaint:     '#475569',
//   accentBlue:    '#2563eb',
//   accentGreen:   '#4ade80',
//   accentRed:     '#f87171',
//   accentYellow:  '#fbbf24',
//   accentCyan:    '#7dd3fc',
//   nodeRouterBg:  '#0f2a1a',
//   nodeSwitchBg:  '#0d1f3c',
//   nodeClientBg:  '#0d1a2e',
//   nodeServerBg:  '#0a1f14',
// }
```

### Light theme

```typescript
import { NETLAB_LIGHT_THEME } from 'netlab';

// {
//   bgPrimary:     '#f8fafc',
//   bgSurface:     '#f1f5f9',
//   bgElevated:    '#e2e8f0',
//   bgPanel:       'rgba(248, 250, 252, 0.95)',
//   border:        '#cbd5e1',
//   borderSubtle:  'rgba(148, 163, 184, 0.4)',
//   textPrimary:   '#0f172a',
//   textSecondary: '#475569',
//   textMuted:     '#94a3b8',
//   textFaint:     '#cbd5e1',
//   accentBlue:    '#2563eb',
//   accentGreen:   '#16a34a',
//   accentRed:     '#dc2626',
//   accentYellow:  '#d97706',
//   accentCyan:    '#0284c7',
//   nodeRouterBg:  '#f0fdf4',
//   nodeSwitchBg:  '#eff6ff',
//   nodeClientBg:  '#f0f9ff',
//   nodeServerBg:  '#f0fdf4',
// }
```

---

## Usage

### Via `theme` prop (React)

Pass a full or partial `NetlabTheme` object to `NetlabApp`. Unspecified fields fall back to `NETLAB_DARK_THEME`.

```tsx
import { NetlabApp, NETLAB_LIGHT_THEME } from 'netlab';

// Use the built-in light theme
<NetlabApp
  topology={topology}
  theme={NETLAB_LIGHT_THEME}
/>

// Override only specific tokens
<NetlabApp
  topology={topology}
  theme={{ bgPrimary: '#ffffff', bgSurface: '#f0f0f0' }}
/>
```

### Via CSS (no JavaScript)

Because the variables are set on the container element, a host page can override them with a CSS rule that targets any ancestor of the container, or directly on the container via `className`:

```css
/* In your host page stylesheet */
.my-netlab-wrapper {
  --netlab-bg-primary: #ffffff;
  --netlab-bg-surface: #f1f5f9;
  --netlab-text-primary: #0f172a;
  --netlab-border: #cbd5e1;
}
```

```tsx
<div className="my-netlab-wrapper">
  <NetlabApp topology={topology} />
</div>
```

> CSS overrides take precedence over variables injected by the `theme` prop because inline styles are overridden by external stylesheets that set variables on an ancestor. If you mix both, prefer one approach per use case.

---

## `themeToVars` utility

The helper used internally is also exported, in case you want to apply theme variables to a custom wrapper element:

```typescript
import { themeToVars, NETLAB_LIGHT_THEME } from 'netlab';

const vars = themeToVars(NETLAB_LIGHT_THEME);
// → { '--netlab-bg-primary': '#f8fafc', '--netlab-bg-surface': '#f1f5f9', ... }

<div style={vars}>...</div>
```

---

## Scope

The theming system covers UI chrome and node rendering. Container backgrounds, overlay panels, toolbars, text, borders, node backgrounds, node icons, node handles, and edge state colors all consume `--netlab-*` variables. See [Node Theming](./node-theming.md) for the node-specific token and styling rules.
