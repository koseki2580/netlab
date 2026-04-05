# Demo Site Structure

The netlab demo site is a single-page React application deployed to GitHub Pages at `https://koseki2580.github.io/netlab/`. It serves as a living showcase of the library's features organized into a browsable gallery.

---

## Navigation Model

The site uses **React Router (HashRouter)** for client-side navigation. Hash-based URLs require no server-side routing configuration, making them fully compatible with static hosting.

```
/#/                          → Gallery (home)
/#/basic/minimal             → Basic: Minimal Topology
/#/basic/three-tier          → Basic: Three-Tier LAN
/#/basic/star                → Basic: Star Topology
/#/routing/client-server     → Routing: Client–Server
/#/routing/multi-hop         → Routing: Multi-Hop Routing
/#/areas/dmz                 → Areas: DMZ Segmentation
```

---

## Site Structure

```
demo/
  main.tsx                    Entry point: HashRouter + all route definitions
  Gallery.tsx                 Home page: card grid grouped by category
  DemoShell.tsx               Shared layout: back button + demo title/description
  basic/
    MinimalDemo.tsx           2 nodes (client ↔ server), no areas
    ThreeTierDemo.tsx         client → switch → server, L2 switch with ports
    StarDemo.tsx              1 switch + 4 clients + 1 server (hub-and-spoke)
  routing/
    ClientServerDemo.tsx      Full stack: private/public areas, router, packet log
    MultiHopDemo.tsx          client → R1 → R2 → server (chained routers)
  areas/
    DmzDemo.tsx               3 zones: private → DMZ → public (classic DMZ)
```

---

## Route Registry

A single `DEMOS` array in `demo/main.tsx` is the source of truth for all routes. The Gallery page reads this array to render navigation cards.

```typescript
interface DemoMeta {
  path: string;       // relative path, e.g. 'basic/minimal'
  category: string;   // display category, e.g. 'basic'
  title: string;
  desc: string;
  component: React.ComponentType;
}
```

---

## Gallery Page

The Gallery (`demo/Gallery.tsx`) displays all demos as cards grouped by category. Each card shows the demo title and a one-line description, and links to the demo's hash route. Categories are rendered as labeled sections.

---

## DemoShell

`demo/DemoShell.tsx` provides a shared wrapper for every demo page:

- Header bar with a **← Gallery** back link, the demo title, and a subtitle description
- Renders `children` below the header (full remaining viewport height)

Individual demos are responsible for their own internal layout and any additional controls (packet log, copy-link button, etc.).

---

## Demos

### basic/minimal
- **Nodes**: `client-1` (10.0.0.1), `server-1` (10.0.0.2)
- **Edges**: direct connection
- **Areas**: none
- **Purpose**: Simplest possible topology to illustrate the bare minimum API surface.

### basic/three-tier
- **Nodes**: `client-1`, `switch-1` (L2, 2 ports), `server-1`
- **Edges**: client → switch → server
- **Areas**: none
- **Purpose**: Demonstrates L2 switching with port configuration and MAC addresses.

### basic/star
- **Nodes**: `switch-1` (L2, 5 ports), `client-1..4`, `server-1`
- **Edges**: all nodes connected to the central switch
- **Areas**: none
- **Purpose**: Hub-and-spoke topology; shows how a single switch serves multiple hosts.

### routing/client-server
- **Nodes**: `client-1`, `switch-1`, `router-1`, `switch-2`, `server-1`
- **Edges**: linear chain
- **Areas**: `private` (10.0.0.0/24), `public` (203.0.113.0/24)
- **Extras**: Packet log panel, Copy Link button, Send Request button
- **Purpose**: Full-stack demo; the primary showcase of the library. Extracted from the original single-page demo.

### routing/multi-hop
- **Nodes**: `client-1`, `router-1`, `router-2`, `server-1`
- **Edges**: linear chain
- **Subnets**: 10.0.0.0/24 (client side), 172.16.0.0/30 (inter-router link), 203.0.113.0/24 (server side)
- **Areas**: none
- **Purpose**: Shows multi-hop routing; traffic traverses two routers before reaching its destination.

### areas/dmz
- **Nodes**: `client-1`, `switch-1`, `fw-1` (router), `switch-dmz`, `web-server`, `fw-2` (router), `switch-pub`, `internet` (server)
- **Edges**: linear chain through both firewalls
- **Areas**: `private` (10.0.0.0/24), `dmz` (172.16.1.0/24), `public` (203.0.113.0/24)
- **Purpose**: Classic three-zone DMZ topology; demonstrates the `dmz` area type.

---

## Build

The demo is built as a static site via:

```sh
npm run build:demo
# → vite build --config vite.demo.config.ts
# → dist-demo/
```

Config (`vite.demo.config.ts`):
- Base path: `/netlab/`
- Single HTML entry: `index.html` → `demo/main.tsx`
- Output: `dist-demo/`

Deployed automatically to GitHub Pages on push to `main`.
