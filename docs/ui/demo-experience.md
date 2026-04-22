# Demo Experience

> **Status**: ✅ Implemented (`plan/55.md`)

Specification for the next demo-surface improvements:

1. full-path communication highlighting during simulation playback
2. opt-in inline topology editing from `NodeDetailPanel`
3. a realistic enterprise "corporate ↔ internet" demo

---

## Goals

- Make packet flow legible at a glance by highlighting the full route, not only the current hop.
- Let learners change topology values from the demo itself and immediately observe different outcomes.
- Provide one integrated scenario that combines DHCP, DNS, NAT, ACL, and HTTP in a single walkthrough.

---

## 1. Communication Path Highlighting

### Behavior

- Simulation playback keeps the existing current-hop highlight, but also stores the full set of edge IDs traversed by the selected trace.
- A highlight mode toggle switches between:
  - `path`: emphasize the full route and brighten the current hop
  - `hop`: legacy single-edge highlight
- The default mode is `path`.
- Each committed trace is assigned a stable accent color so the selected trace uses the same color throughout playback and selection changes.

### State Contract

`SimulationState` expands with:

```ts
type HighlightMode = 'hop' | 'path';

interface SimulationState {
  activeEdgeIds: string[];
  activePathEdgeIds: string[];
  highlightMode: HighlightMode;
  traceColors: Record<string, string>;
}
```

- `activeEdgeIds` remains the current-hop highlight for compatibility.
- `activePathEdgeIds` is the ordered, deduplicated path for the selected trace.
- `traceColors[packetId]` stores the color assigned when the trace is committed.

### Rendering Rules

- In `path` mode:
  - edges in `activePathEdgeIds` render with an animated, dimmed stroke
  - edges in `activeEdgeIds` render with the same color at stronger emphasis
- In `hop` mode:
  - only `activeEdgeIds` render as active
- Down links and validation colors still take precedence over highlight styling.

### Scope

- Applies to all protocols that already produce `PacketTrace.hops[].activeEdgeId`.
- Applies to multi-trace demos through the currently selected trace.
- Does not introduce free-running multi-packet physics or per-port packet animation.

---

## 2. Inline NodeDetailPanel Editing

### Behavior

- `NodeDetailPanel` stays read-only by default.
- When `editable={true}` and `onTopologyChange` is supplied, supported fields render as inline inputs.
- Field edits commit on blur using the existing controlled-topology snapshot pattern.
- Invalid edits show inline error text and do not call `onTopologyChange`.

### Component Contract

```tsx
interface NodeDetailPanelProps {
  editable?: boolean;
  onTopologyChange?: (topology: TopologySnapshot) => void;
}
```

### Editable Fields in v1

Current data-model-backed fields only:

- host nodes: `ip`, `mac`
- router interfaces: `name`, `ipAddress`, `prefixLength`, `macAddress`, `nat`
- router static routes: `destination`, `nextHop`
- DHCP server config: `leasePool`, `subnetMask`, `defaultGateway`, `dnsServer`, `leaseTime`
- DNS server zones: `zones[].name`, `zones[].address`
- switch ports: `name`, `vlanMode`, `accessVlan`, `trunkAllowedVlans`, `nativeVlan`

### Validation

- field-level validation:
  - IPv4 format
  - MAC format
  - prefix range `0..32`
  - positive lease time
  - VLAN IDs and trunk VLAN lists are numeric and non-negative
- topology-level validation:
  - duplicate IPv4 addresses are rejected
- runtime-derived state remains read-only:
  - DHCP lease status
  - DNS cache
  - NAT table / conntrack state
  - multicast runtime tables

### Current-Code Deviation

- Host `defaultGateway` is not a persisted topology field in the current data model, so v1 does not add a separate host default-gateway editor.
- ACL rule editing is out of scope for this wave; existing ACL configuration remains visible through router/interface details and demo inspectors.

---

## 3. Enterprise Demo

### Route and Gallery

- Add a new demo route at `/#/simulation/enterprise`.
- Register the demo in `demo/Gallery.tsx` under the simulation-oriented demos.

### Scenario

One topology demonstrates:

1. client boot via DHCP
2. internal DNS resolution of `www.example.com`
3. outbound HTTP request across NAT
4. return traffic flowing back through the NAT state
5. an ACL-denied outbound SSH probe for contrast

### Topology Capabilities

- internal clients on a switched LAN
- DHCP server and internal DNS server
- edge router with inside/outside NAT interfaces
- ACL-protected routing boundary
- ISP/external router, external DNS, and HTTP server

### Current-Code Deviation

- The current DNS service stack does not support recursive forwarding between DNS servers.
- The implemented enterprise demo keeps `www.example.com` on the internal DNS server so the staged DNS action remains deterministic.
- The external DNS node remains present in the topology for realism and inline editing, but is not in the active resolution path for the stock walkthrough.

### Demo UX

- action buttons drive DHCP, DNS, HTTP, and an ACL-deny probe, plus one full-scenario shortcut
- the canvas uses path highlighting
- `NodeDetailPanel` is opened in editable mode so learners can adjust the scenario
- timeline/inspector sidebars remain available for packet-level inspection

---

## Testing Expectations

- unit tests cover new simulation state and path extraction behavior
- React tests cover canvas highlight styling and inline edit validation/commit rules
- demo registration tests cover the new gallery card and route wiring

---

## Docs Consistency

After implementation, this spec must stay aligned with:

- `docs/ui/packet-visualization.md`
- `docs/deployment/demo-structure.md`
- any new or updated tests that assert the documented behavior
