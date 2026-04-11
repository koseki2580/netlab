# Connection Validation

> **Status**: ✅ Implemented

This document specifies how `NetlabCanvas` validates connections between nodes to prevent topologically meaningless or physically invalid edges.

---

## Purpose

Network endpoints (clients and servers) have no packet-forwarding capability. A direct link between two endpoints bypasses all network infrastructure (switches, routers) and cannot carry real traffic. Netlab blocks these connections at draw time and highlights them in red when loaded from external topology data.

---

## Validation Rules

`validateConnection()` returns both blocking errors and non-blocking warnings.
The canvas blocks the connection only when `errors.length > 0`.

| Type | Code | Condition | Message |
|------|------|-----------|---------|
| Error | `self-loop` | `sourceId === targetId` | `Self-loop: a node cannot connect to itself` |
| Error | `duplicate-edge` | an existing edge already connects the same two nodes | `Duplicate edge: nodes are already connected` |
| Error | `interface-in-use` | the selected interface handle is already attached to another edge | `Interface already in use: {ifName}` |
| Error | `endpoint-to-endpoint` | both nodes are L7 endpoints (`client` / `server`) | `Endpoint-to-endpoint connections are not allowed` |
| Warning | `subnet-mismatch` | router-to-router link uses interface CIDRs from different subnets | `Subnet mismatch: {cidr1} and {cidr2} are in different subnets` |
| Warning | `missing-ip` | a router, client, or server is missing IP configuration needed for L3 forwarding | `Missing IP configuration on {nodeName}` |

Unknown or missing roles still default to non-blocking behavior unless one of the explicit
rules above applies.

---

## Runtime Behavior

### During drag

When the user drags a connection handle toward a target node:

- React Flow invokes `validateConnection()` before the edge is created.
- If the result contains one or more **errors**, React Flow shows a **red line** and a blocked cursor. Releasing the drag does **not** create the edge.
- If the result contains only **warnings**, the connection is still allowed.

### Loaded from topology

If a topology passed to `NetlabProvider` already contains invalid edges (e.g., loaded from an external source or query parameter):

- The edge is still rendered so the topology is visible.
- The edge is drawn with `stroke: red` to signal the problem without blocking the view.

---

## Implementation Reference

| File | Role |
|------|------|
| `src/utils/connectionValidator.ts` | Pure validation logic (no React/React Flow deps) |
| `src/utils/cidr.ts` | Subnet comparison helpers used by router-to-router validation |
| `src/components/NetlabCanvas.tsx` | Wires `validateConnection()` into React Flow's `isValidConnection` callback |

### `src/utils/connectionValidator.ts` API

```ts
// Core predicate — role strings only, no node lookup
isValidConnection(sourceRole?: string, targetRole?: string): boolean

// Structured validation for UI and topology checks
validateConnection(
  nodes: NetlabNode[],
  edges: NetlabEdge[],
  sourceId: string,
  targetId: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): ValidationResult

// Node-ID variant — looks up roles from the nodes array
isValidConnectionBetweenNodes(nodes: NetlabNode[], sourceId: string | null, targetId: string | null): boolean

// Edge classifier — convenience wrapper for batch use
isValidEdge(nodes: NetlabNode[], edge: NetlabEdge): boolean
```

### `ValidationResult`

```ts
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: 'self-loop' | 'duplicate-edge' | 'interface-in-use' | 'endpoint-to-endpoint';
  message: string;
}

interface ValidationWarning {
  code: 'subnet-mismatch' | 'missing-ip';
  message: string;
}
```

---

## Extending the Rules

To add more validation rules, extend `validateConnection()` and keep the legacy boolean
helpers as compatibility wrappers. Blocking behavior should stay in `errors`; advisory
checks should stay in `warnings`.
