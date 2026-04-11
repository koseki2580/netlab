# Node Theming

> **Status**: ✅ Implemented

This document defines how node colors participate in the Netlab theme system so node rendering stays visually consistent in both dark and light embeds.

## Scope

The following components MUST use theme CSS variables instead of hardcoded hex colors:

- `RouterNode`
- `SwitchNode`
- `ClientNode`
- `ServerNode`
- `NetlabCanvas` edge state styling

`NodeDetailPanel` and the surrounding UI already consume theme variables and are out of scope for this spec.

## Theme Tokens

`NetlabTheme` includes four node-specific background tokens:

- `nodeRouterBg`
- `nodeSwitchBg`
- `nodeClientBg`
- `nodeServerBg`

Default values:

| Token | Dark theme | Light theme |
| --- | --- | --- |
| `nodeRouterBg` | `#0f2a1a` | `#f0fdf4` |
| `nodeSwitchBg` | `#0d1f3c` | `#eff6ff` |
| `nodeClientBg` | `#0d1a2e` | `#f0f9ff` |
| `nodeServerBg` | `#0a1f14` | `#f0fdf4` |

These map to CSS custom properties on the `NetlabApp` container:

- `--netlab-node-router-bg`
- `--netlab-node-switch-bg`
- `--netlab-node-client-bg`
- `--netlab-node-server-bg`

## Token Reuse Rules

Node components MUST reuse existing semantic theme tokens for non-background colors:

- Router and server borders, handles, and primary icon strokes use `--netlab-accent-green`
- Switch borders, handles, and primary icon strokes use `--netlab-accent-blue`
- Client borders, handles, and primary icon strokes use `--netlab-accent-cyan`
- Node labels use `--netlab-text-primary`
- Router interface-down badges use `--netlab-accent-red`
- Switch status indicators use:
  - `--netlab-accent-green` for active
  - `--netlab-accent-yellow` for warning
  - `--netlab-text-faint` for unused
- Client monitor interior and server drive-bay interiors use `--netlab-bg-primary`

## SVG Styling Rules

SVG fills and strokes inside node icons MUST use theme variables.

- Decorative tinted fills should use the matching accent token with low opacity so they work in both dark and light themes.
- Icon foreground lines and outlines should use the matching accent token directly.
- Node components SHOULD prefer inline SVG `style` props for `fill` and `stroke` when consuming CSS variables.

## Edge Styling Rules

`NetlabCanvas` edge state styling MUST use theme variables:

- Failed edges use `--netlab-accent-red`
- Active edges use `--netlab-accent-cyan`
- Invalid edges use `--netlab-accent-red`

The edge logic itself does not change; only the color source changes.

## Hardcoded Color Rule

Node rendering components MUST NOT use hardcoded hex color strings for theme-sensitive colors.

Allowed exceptions:

- Pure white text such as `#fff` on the router error badge where the background remains semantic red
- Non-color numeric values such as opacity, border radius, and sizing

## Compatibility

The built-in themes MUST provide defaults for all four node background tokens.

`NetlabApp` resolves custom themes by merging user overrides on top of `NETLAB_DARK_THEME`, so partial theme overrides continue to inherit valid node colors from the default dark theme.
