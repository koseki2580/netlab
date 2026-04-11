# Query Parameter–Based Topology Loading

> **Status**: ✅ Implemented

netlab supports encoding a full network topology in the URL query string. This allows any diagram to be shared or embedded without a server.

---

## URL Format

```
https://koseki2580.github.io/netlab/?topo=<base64url>
```

The `topo` parameter contains a **URL-safe base64** encoding of a JSON-serialized topology.

---

## Serialized Structure

Only the data needed to reconstruct the diagram is included. Route tables are **not** serialized because they are computed automatically by `ProtocolRegistry.resolveRouteTable()` on load.

```typescript
interface SerializedTopology {
  nodes: NetlabNode[];   // network devices with positions and all node data
  edges: NetlabEdge[];   // connections (source/target IDs, edge type)
  areas: NetworkArea[];  // network zones with subnets and visual config
}
```

---

## Encoding

```typescript
import { encodeTopology } from 'netlab/utils/topology-url';

const url = encodeTopology({ nodes, edges, areas });
// → "?topo=eyJub2Rlcy..."
```

Internally:
1. `JSON.stringify({ nodes, edges, areas })`
2. `btoa(json)` — standard base64
3. Replace `+` → `-`, `/` → `_`, strip trailing `=` (URL-safe base64)

---

## Decoding

```typescript
import { decodeTopology } from 'netlab/utils/topology-url';

const topology = decodeTopology(window.location.search);
// → { nodes, edges, areas } | null
```

Returns `null` if:
- The `topo` parameter is absent
- The value is not valid base64
- The decoded JSON does not parse
- The parsed value is not an object with `nodes`, `edges`, and `areas` arrays

---

## Fallback Behavior

If `?topo=` is absent or invalid, the demo app silently falls back to the built-in default topology. No error is shown to the user.

---

## Demo: Copy Link

The demo toolbar includes a **Copy Link** button. Clicking it:
1. Encodes the current topology (nodes, edges, areas as loaded — not drag-updated positions) to a `?topo=` URL
2. Writes the full URL to the clipboard
3. Temporarily shows `✓ Copied!` for 2 seconds, then reverts

> **Note**: The encoded topology reflects the topology at load time. Node positions updated via drag-and-drop are not captured in the copied URL.

---

## Example

Given a minimal topology:

```json
{
  "nodes": [
    { "id": "h1", "type": "client", "position": { "x": 100, "y": 100 },
      "data": { "label": "Host", "role": "client", "layerId": "l7", "ip": "10.0.0.1" } }
  ],
  "edges": [],
  "areas": []
}
```

Encode:

```js
const json = JSON.stringify(topology);
const b64  = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const url  = `${location.origin}${location.pathname}?topo=${b64}`;
```
