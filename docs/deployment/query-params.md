# Query Parameters

> **Status**: ✅ Implemented

netlab uses URL query parameters for two independent concerns:

- loading shared topologies
- restoring sandbox state

## Topology Sharing

Use `topo=<base64url>` to encode a topology snapshot into the URL.

```txt
/?topo=<base64url>
```

The serialized structure is:

```ts
interface SerializedTopology {
  nodes: NetlabNode[];
  edges: NetlabEdge[];
  areas: NetworkArea[];
}
```

Only topology data is serialized. Route tables are recomputed on load.

## Sandbox Parameters

Sandbox-ready demos also understand these parameters:

| Param                      | Meaning                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------- |
| `sandbox=1`                | Enables the sandbox UI for the current demo.                                              |
| `sandboxTab=packet         | node                                                                                      | parameters | traffic` | Selects the initial sandbox tab. |
| `sandboxState=<base64url>` | Restores the current ordered edit log.                                                    |
| `intro=sandbox-intro-mtu`  | Starts the built-in sandbox intro on the MTU fragmentation demo.                          |
| `tutorial=<id>`            | Starts a guided tutorial on tutorial-enabled demos. Mutually exclusive with sandbox mode. |

`sandboxState` uses UTF-8 JSON encoded as URL-safe base64:

```ts
interface SerializedSandboxState {
  version: 1;
  edits: Edit[];
}
```

The sandbox keeps this value synchronized with the active session via `history.replaceState`, so refreshing or sharing the current URL preserves the current edits.

## Examples

Load a demo directly into sandbox mode:

```txt
/?sandbox=1&sandboxTab=packet#/simulation/tcp-handshake
```

Open the sandbox intro:

```txt
/?sandbox=1&sandboxTab=node&intro=sandbox-intro-mtu#/networking/mtu-fragmentation
```

Restore an existing topology and sandbox session together:

```txt
/?topo=<base64url>&sandbox=1&sandboxTab=node&sandboxState=<base64url>#/comprehensive/all-in-one
```

## Fallback Behavior

- Missing or malformed `topo` silently falls back to the built-in demo topology.
- Missing or malformed `sandboxState` restores an empty sandbox session.
- Unknown sandbox edit shapes are ignored instead of crashing the demo.
