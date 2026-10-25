# API Deprecation Lifecycle

Netlab treats `src/index.ts` and documented package exports as the public API surface. Public removals must be visible before they happen.

## Lifecycle

| Phase      | Meaning                                            | Requirements                                                                                                                                                             |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stable     | Public API is supported.                           | No warning is emitted.                                                                                                                                                   |
| Deprecated | API remains public but has a planned replacement.  | JSDoc includes `@deprecated`, `@removeAt v<minor>`, and `@migrate <symbol-or-path>`. Runtime warnings may be added once per process when the deprecated path is invoked. |
| Internal   | API is no longer exported from the public surface. | Removal is allowed only after the documented `@removeAt` minor has elapsed and the changelog records the migration.                                                      |
| Deleted    | Implementation is removed.                         | Tests and docs no longer reference the deleted API.                                                                                                                      |

## Lint Contract

Every `@deprecated` JSDoc block in `src/` must include both:

```ts
/**
 * @deprecated Use createNewEngine instead.
 * @removeAt v0.2.0
 * @migrate createNewEngine
 */
```

The `@removeAt` tag records the earliest minor release where removal is allowed. The `@migrate` tag gives the concrete replacement so downstream users are not left with a warning that cannot be acted on.

This lifecycle document defines how later changes can intentionally deprecate and eventually remove public symbols without silent consumer breakage.

## Root Export Boundary Migration

Starting with the per-layer tree-shake work, concrete layer/protocol values are no longer exported
from the root `netlab` entry. The root entry stays focused on facade components, contexts,
registries, shared types, and core utilities. Consumers should switch to these subpaths:

| Former root values                     | Replacement import path        |
| -------------------------------------- | ------------------------------ |
| Wireless and WPA helpers               | `netlab/layers/l1-physical`    |
| Switching, STP, VLAN, and LACP helpers | `netlab/layers/l2-datalink`    |
| Routing protocols, HA, and tunneling   | `netlab/layers/l3-network`     |
| TCP, UDP, and QUIC helpers             | `netlab/layers/l4-transport`   |
| HTTP/2 and HTTP/3 helpers              | `netlab/layers/l7-application` |
| `TlsOrchestrator` and TLS ALPN helpers | `netlab/protocols/tls`         |
| Standalone QUIC helpers                | `netlab/protocols/quic`        |
| Standalone HTTP/2 helpers              | `netlab/protocols/http2`       |
| Standalone HTTP/3 helpers              | `netlab/protocols/http3`       |

Type-only exports that describe packets, topology, traces, TLS annotations, and tunneling shapes
remain available from `netlab`.

`NetlabApp` also follows this boundary: it remains exported from `netlab`, but it no longer imports
all built-in layers at module load time. Applications that render `NetlabApp` should import the
needed `netlab/layers/<id>` side-effect entries once at startup.

## Behaviour migrations

A change of behaviour that keeps every signature is recorded here, with how to keep the earlier
behaviour. The release that makes it is a breaking entry in the changelog (`feat!:`), which
`npm run changelog:gen` lists under **Breaking**.

### ARP answers are remembered for the life of the engine

**What changed.** A `SimulationEngine` now keeps what devices learn by ARP between sends
(`arpCache: 'persist'`, the default). A host that pinged an address once shows no ARP exchange the
second time, and a TCP handshake asks only before its first segment. `reset()` keeps what was
learned; `clearTraces()` and `clear()` empty it; a new topology is a new engine and starts empty.

**How to keep the earlier behaviour.** Create the engine with `arpCache: 'per-send'`; every send
then starts with nothing learned, exactly as before:

```ts
const engine = new SimulationEngine(topology, hookEngine, { arpCache: 'per-send' });
```

Nothing stored changes, so there is nothing to migrate in saved topologies or progress records.
