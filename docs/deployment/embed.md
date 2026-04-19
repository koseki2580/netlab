# Embedding NetlabApp

> **Status**: ✅ Implemented

## Overview

`NetlabApp` is an all-in-one embeddable React component that renders a full netlab topology viewer inside a bounded container. Unlike the demo pages which assume full-page rendering (`height: 100vh`), `NetlabApp` respects explicit `width` and `height` props so it can be placed inside any host page layout.

All built-in OSI layer plugins (L1–L7) are automatically registered when `NetlabApp` is first imported. No manual layer setup is required.

---

## Quick Start

```tsx
import { NetlabApp } from 'netlab';
import type { NetworkTopology } from 'netlab';

const topology: NetworkTopology = { nodes: [...], edges: [...] };

// Static topology viewer, 100% wide, 500px tall
<NetlabApp topology={topology} width="100%" height={500} />

// With simulation controls and packet timeline
<NetlabApp topology={topology} width={900} height={600} simulation />
```

---

## Props Reference

| Prop         | Type                  | Default      | Description                                                                 |
| ------------ | --------------------- | ------------ | --------------------------------------------------------------------------- |
| `topology`   | `NetworkTopology`     | required     | The network topology to display                                             |
| `width`      | `number \| string`    | `'100%'`     | Container width (pixels or CSS string)                                      |
| `height`     | `number \| string`    | `500`        | Container height (pixels or CSS string)                                     |
| `simulation` | `boolean`             | `false`      | Enable simulation mode: adds toolbar, packet viewer, and timeline sidebar   |
| `timeline`   | `boolean`             | `simulation` | Show the resizable `PacketTimeline` sidebar                                 |
| `routeTable` | `boolean`             | auto         | Show the `RouteTable` overlay (auto-enabled when topology contains routers) |
| `areaLegend` | `boolean`             | auto         | Show the `AreaLegend` overlay (auto-enabled when topology has areas)        |
| `style`      | `React.CSSProperties` | —            | Additional styles merged into the outer container                           |
| `className`  | `string`              | —            | CSS class applied to the outer container                                    |

### Auto-detection

- `routeTable`: enabled by default when any node has `data.role === 'router'`
- `areaLegend`: enabled by default when `topology.areas.length > 0`

Pass an explicit `false` to override either:

```tsx
<NetlabApp topology={topology} routeTable={false} areaLegend={false} />
```

---

## Feature Flags

### `simulation={true}`

Mounts `SimulationProvider` and renders:

- A toolbar row (`SimulationControls`) with Send Packet, Play/Pause/Step/Reset buttons
- `PacketViewer` overlay on the canvas for in-flight packet animation
- A resizable `PacketTimeline` sidebar (unless `timeline={false}`)

The toolbar row has a fixed height (`flexShrink: 0`); the canvas and sidebar share the remaining height.

### `timeline={false}`

When `simulation` is `true`, the timeline sidebar is shown by default. Pass `timeline={false}` to hide it and give the canvas the full width:

```tsx
<NetlabApp topology={topology} simulation timeline={false} />
```

---

## Layout Behaviour

`NetlabApp` uses the provided `width` and `height` as its bounding box. All internal layout is percentage-based or flex-based within that container — nothing inside the component uses `100vh` or relies on the viewport.

```
┌─────────────────────────────── width ───────────────────────────────┐
│ [toolbar — simulation only]                      flexShrink: 0      │
│ ┌─────────────────────────────────────┐ ┌────────────────────────┐  │
│ │                                     │ │                        │  │
│ │           NetlabCanvas              │ │    PacketTimeline      │  │ height
│ │           (flex: 1)                 │ │    (ResizableSidebar)  │  │
│ │  [RouteTable overlay]               │ │    simulation only     │  │
│ │  [AreaLegend overlay]               │ │                        │  │
│ └─────────────────────────────────────┘ └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

The component works inside any CSS layout — block, flex, grid, or absolutely positioned containers.

---

## Layer Registration

`NetlabApp` automatically registers all five built-in layer plugins on first import via an internal side-effect module. This includes:

- L1 Physical
- L2 Datalink
- L3 Network
- L4 Transport
- L7 Application

Double-registration is safe: the `layerRegistry` will log a warning and overwrite the existing entry. If your host app also registers layers explicitly, there is no conflict.

If you use the lower-level API (`NetlabProvider` + `NetlabCanvas` directly), you are responsible for registering layers yourself:

```ts
import 'netlab/layers/l1-physical';
import 'netlab/layers/l2-datalink';
import 'netlab/layers/l3-network';
import 'netlab/layers/l4-transport';
import 'netlab/layers/l7-application';
```

---

## Examples

### Static diagram (default)

```tsx
<NetlabApp topology={topology} width="100%" height={400} />
```

### Inside a fixed-width card

```tsx
<div style={{ width: 800, padding: 24 }}>
  <h2>Network Diagram</h2>
  <NetlabApp
    topology={topology}
    width={752} // 800 - 2*24px padding
    height={450}
    style={{ borderRadius: 8, border: '1px solid #334155' }}
  />
</div>
```

### Interactive simulation embed

```tsx
<NetlabApp topology={topology} width="100%" height={560} simulation />
```

### Simulation without timeline

```tsx
<NetlabApp topology={topology} width="100%" height={480} simulation timeline={false} />
```

### Inside a CSS Grid cell

```tsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
  <NetlabApp topology={topologyA} width="100%" height={400} />
  <NetlabApp topology={topologyB} width="100%" height={400} />
</div>
```

---

## Theming

`NetlabApp` ships with a built-in dark theme. To match a host page's color scheme, pass a `theme` prop:

```tsx
import { NetlabApp, NETLAB_LIGHT_THEME } from 'netlab';

// Built-in light theme
<NetlabApp topology={topology} theme={NETLAB_LIGHT_THEME} />

// Custom overrides (unspecified tokens fall back to the dark theme)
<NetlabApp
  topology={topology}
  theme={{ bgPrimary: '#ffffff', bgSurface: '#f1f5f9', textPrimary: '#0f172a', border: '#cbd5e1' }}
/>
```

The theme is injected as CSS custom properties (`--netlab-*`) on the outermost container, so host pages can also override them via CSS without any JavaScript.

See [Theming](../ui/theming.md) for the full token reference and CSS override guide.

---

## Provider Composition

`NetlabApp` internally mounts `NetlabProvider` (and `SimulationProvider` when `simulation={true}`). Do not wrap `NetlabApp` in these providers — they are already included.

If you need to access context values from outside (e.g. to build a custom control panel alongside the embed), use the lower-level API instead:

```tsx
import { NetlabProvider, NetlabCanvas, SimulationProvider } from 'netlab';
import 'netlab/layers/l2-datalink';
import 'netlab/layers/l3-network';

<NetlabProvider topology={topology}>
  <SimulationProvider>
    <div style={{ width: 900, height: 600, display: 'flex', flexDirection: 'column' }}>
      {/* compose your own layout */}
      <NetlabCanvas />
    </div>
  </SimulationProvider>
</NetlabProvider>;
```
