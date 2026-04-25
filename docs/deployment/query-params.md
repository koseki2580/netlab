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
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `sandbox=1`                | Enables the sandbox UI for the current demo.                                              |
| `sandboxTab=<axis>`        | Selects `packet`, `node`, `parameters`, `traffic`, or `edits`.                            |
| `sandboxState=<base64url>` | Restores the current visible edit log. Redo-tail history is not serialized.               |
| `intro=<sandbox-intro-id>` | Starts a built-in sandbox intro on its paired sandbox-ready demo.                         |
| `tutorial=<id>`            | Starts a guided tutorial on tutorial-enabled demos. Mutually exclusive with sandbox mode. |

`sandboxState` uses UTF-8 JSON encoded as URL-safe base64:

```ts
interface SerializedSandboxState {
  version: 1;
  edits: Edit[];
}
```

The sandbox keeps this value synchronized with the active visible session via `history.replaceState`, so refreshing or sharing the current URL preserves the current edits. Redo-tail history is not encoded in the URL; use the sandbox panel's JSON export when the full `EditSession.backing` plus `head` cursor must be preserved.

## Examples

Load a demo directly into sandbox mode:

```txt
/?sandbox=1&sandboxTab=packet#/simulation/tcp-handshake
```

Open the sandbox intro:

```txt
/?sandbox=1&sandboxTab=node&intro=sandbox-intro-mtu#/networking/mtu-fragmentation
```

Other built-in intro ids are `sandbox-intro-tcp`, `sandbox-intro-ospf`, and `sandbox-intro-nat`.

Restore an existing topology and sandbox session together:

```txt
/?topo=<base64url>&sandbox=1&sandboxTab=node&sandboxState=<base64url>#/comprehensive/all-in-one
```

## Fallback Behavior

- Missing or malformed `topo` silently falls back to the built-in demo topology.
- Missing or malformed `sandboxState` restores an empty sandbox session.
- Unknown sandbox edit shapes are ignored instead of crashing the demo.
