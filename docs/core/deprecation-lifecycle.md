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
