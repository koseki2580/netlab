# Connection Validation

This document specifies how `NetlabCanvas` validates connections between nodes to prevent topologically meaningless edges.

---

## Purpose

Network endpoints (clients and servers) have no packet-forwarding capability. A direct link between two endpoints bypasses all network infrastructure (switches, routers) and cannot carry real traffic. Netlab blocks these connections at draw time and highlights them in red when loaded from external topology data.

---

## Validation Rule

A connection is **invalid** if and only if **both** endpoints have an L7 role (`"client"` or `"server"`). All other role combinations are valid.

| Source \ Target | client  | server  | switch | router |
|-----------------|---------|---------|--------|--------|
| **client**      | Invalid | Invalid | Valid  | Valid  |
| **server**      | Invalid | Invalid | Valid  | Valid  |
| **switch**      | Valid   | Valid   | Valid  | Valid  |
| **router**      | Valid   | Valid   | Valid  | Valid  |

Node roles are read from `node.data.role`. If a node's role is unknown or undefined (e.g., area background nodes), the connection is treated as valid to avoid false positives.

---

## Runtime Behavior

### During drag

When the user drags a connection handle toward a target node:

- React Flow invokes `isValidConnection` before the edge is created.
- If the connection is **invalid**, React Flow shows a **red line** and a blocked cursor. Releasing the drag does **not** create the edge.
- If the connection is **valid**, the line renders normally and the edge is created on release.

### Loaded from topology

If a topology passed to `NetlabProvider` already contains invalid edges (e.g., loaded from an external source or query parameter):

- The edge is still rendered so the topology is visible.
- The edge is drawn with `stroke: red` to signal the problem without blocking the view.

---

## Implementation Reference

| File | Role |
|------|------|
| `src/utils/connectionValidator.ts` | Pure validation logic (no React/React Flow deps) |
| `src/components/NetlabCanvas.tsx` | Wires `isValidConnection` prop and `styledEdges` memo |

### `src/utils/connectionValidator.ts` API

```ts
// Core predicate — role strings only, no node lookup
isValidConnection(sourceRole?: string, targetRole?: string): boolean

// Node-ID variant — looks up roles from the nodes array
isValidConnectionBetweenNodes(nodes: NetlabNode[], sourceId: string | null, targetId: string | null): boolean

// Edge classifier — convenience wrapper for batch use
isValidEdge(nodes: NetlabNode[], edge: NetlabEdge): boolean
```

---

## Extending the Rules

To add more validation rules (e.g., blocking L1 physical nodes from connecting to L3 routers), update `isValidConnection` in `src/utils/connectionValidator.ts`. The canvas wiring in `NetlabCanvas.tsx` requires no changes.
