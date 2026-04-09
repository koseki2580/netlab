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
/#/services/dhcp-dns        → Services: DHCP & DNS
/#/simulation/step           → Simulation: Step-by-Step
/#/simulation/failure        → Simulation: Failure Injection
/#/simulation/trace-inspector → Simulation: Trace Inspector
/#/simulation/interface-aware → Simulation: Interface-Aware Forwarding
/#/simulation/session        → Simulation: Session Inspector
/#/topology/controlled       → Editor: Controlled Topology
/#/editor                    → Editor: Topology Editor
/#/embed                     → Integration: Embed
/#/comprehensive/all-in-one  → Comprehensive: All-in-One Demo
```

---

## Site Structure

```
demo/
  main.tsx                    Entry point: HashRouter + all route definitions
  Gallery.tsx                 Home page: card grid grouped by category
  DemoShell.tsx               Shared layout: back button + title/description + GitHub source link
  basic/
    MinimalDemo.tsx           2 nodes (client ↔ server), no areas
    ThreeTierDemo.tsx         client → switch → server, L2 switch with ports
    StarDemo.tsx              1 switch + 4 clients + 1 server (hub-and-spoke)
  routing/
    ClientServerDemo.tsx      Full stack: private/public areas, router, packet log
    MultiHopDemo.tsx          client → R1 → R2 → server (chained routers)
  areas/
    DmzDemo.tsx               3 zones: private → DMZ → public (classic DMZ)
  services/
    DhcpDnsDemo.tsx           DHCP lease assignment + DNS lookup before HTTP
  simulation/
    StepSimDemo.tsx           Auto-running step-by-step routing walkthrough
    FailureSimDemo.tsx        Failure toggle panel + simulation trace controls
    TraceInspectorDemo.tsx    Packet timeline + hop inspector + trace summary
    InterfaceAwareDemo.tsx    Interface ingress/egress inspection walkthrough
    SessionDemo.tsx           Request/response session lifecycle inspector
  editor/
    EditorDemo.tsx            Full topology editor with JSON inspector and share link
  topology/
    ControlledTopologyDemo.tsx Controlled topology state with URL restore/share
  embed/
    EmbedDemo.tsx             Host-page embed showcase
  comprehensive/
    AllInOneDemo.tsx          Tabbed editor/simulation/failure/trace showcase
```

---

## Route Registry

`demo/main.tsx` contains the concrete `<Route>` definitions for the demo site. `demo/Gallery.tsx` maintains a parallel category/card registry that links to those routes.

When adding a new demo, update both files:

- register the route in `demo/main.tsx`
- add the corresponding gallery card/category entry in `demo/Gallery.tsx`

---

## Gallery Page

The Gallery (`demo/Gallery.tsx`) displays all demos as cards grouped by category. Each card shows the demo title and a one-line description, and links to the demo's hash route. Categories are rendered as labeled sections.

The header also exposes a direct `GitHub` link to `https://github.com/koseki2580/netlab` so users can jump from the landing page to the source repository.

---

## DemoShell

`demo/DemoShell.tsx` provides a shared wrapper for every demo page:

- Header bar with a **← Gallery** back link, the demo title, a subtitle description, and a right-aligned `GitHub` source link
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

### services/dhcp-dns
- **Purpose**: Demonstrates DHCP DORA and DNS resolution as explicit packet-trace sessions before HTTP traffic.
- **Extras**: Flat switched LAN topology, DHCP runtime lease state, DNS cache inspection, and multi-trace step walkthrough.

### simulation/step
- **Purpose**: Step-by-step routing walkthrough with hop controls and packet structure inspection.
- **Extras**: Auto-sends a packet on mount and renders `StepControls` in a resizable sidebar.

### simulation/failure
- **Purpose**: Failure injection walkthrough for node, link, and interface failures.
- **Extras**: `FailureTogglePanel`, packet send overlay, and `StepControls` stacked in a resizable sidebar.

### simulation/trace-inspector
- **Purpose**: Dedicated trace inspection view for packet timeline, hop-level routing details, and final trace status.
- **Extras**: Auto-sends a packet on mount and composes `TraceSummary`, `PacketTimeline`, `HopInspector`, and `SimulationControls`.

### simulation/interface-aware
- **Purpose**: Demonstrates ingress and egress interface selection at each forwarding hop.

### simulation/session
- **Purpose**: Demonstrates request/response correlation and lifecycle grouping in the session inspector.

### topology/controlled
- **Purpose**: Controlled topology demo that keeps topology state outside the editor/canvas and supports URL serialization.

### editor
- **Purpose**: Full topology editor with add/remove/connect/edit workflows, JSON inspection, and shareable encoded URLs.

### embed
- **Purpose**: Shows how `NetlabApp` can be embedded inside a host page with fixed dimensions.

### comprehensive/all-in-one

A tabbed demo that shares one editable topology across four views:

- **Editor** tab: topology editing via `TopologyEditor`
- **Step Simulation** tab: auto-running simulation with `StepControls`
- **Failure Injection** tab: failure toggles plus packet send workflow
- **Trace Inspector** tab: `TraceSummary`, `PacketTimeline`, `HopInspector`, and `SimulationControls`

Topology changes made in the Editor tab carry over to the other tabs. Each simulation-oriented tab remounts its providers on tab switch so every view starts from a fresh simulation session over the latest topology.

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
