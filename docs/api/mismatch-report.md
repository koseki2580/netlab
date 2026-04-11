# API Documentation Audit Report

> **Status**: ✅ Implemented

Date: `2026-04-11`

This report records the mismatches found while comparing `docs/` against the public package
surface defined by `src/index.ts` and `package.json` exports.

## Summary

- Root-export coverage in [`../core/api.md`](../core/api.md) was incomplete and heavily skewed
  toward the original canvas surface.
- Several examples used unpublished import paths that fail against the current package exports.
- Status markers across `docs/` were inconsistent: some files used no status line, and some used
  an older `**Status: ...**` format instead of the repository-wide badge convention.
- A few examples were not copy-paste runnable without additional imports or caveats.

## Incorrect Import Paths (Fixed)

| # | File | Original Line | Wrong Path | Correct Path |
|---|------|---------------|------------|--------------|
| 1 | `docs/deployment/embed.md` | 112 | `netlab/src/layers/l1-physical/index` | `netlab/layers/l1-physical` |
| 2 | `docs/deployment/embed.md` | 113 | `netlab/src/layers/l2-datalink/index` | `netlab/layers/l2-datalink` |
| 3 | `docs/deployment/embed.md` | 114 | `netlab/src/layers/l3-network/index` | `netlab/layers/l3-network` |
| 4 | `docs/deployment/embed.md` | 115 | `netlab/src/layers/l4-transport/index` | `netlab/layers/l4-transport` |
| 5 | `docs/deployment/embed.md` | 116 | `netlab/src/layers/l7-application/index` | `netlab/layers/l7-application` |
| 6 | `docs/deployment/query-params.md` | 34 | `netlab/utils/topology-url` | `netlab` |
| 7 | `docs/deployment/query-params.md` | 50 | `netlab/utils/topology-url` | `netlab` |

## Documented But Not Yet Exported

| API | File | Current Resolution |
|-----|------|--------------------|
| `installFetchInterceptor()` | `docs/core/api.md`, `docs/networking/layers/l7-application.md` | Kept as planned-only API and explicitly marked as not exported |

## Export Coverage Gaps In `docs/core/api.md` (Now Resolved)

The API reference was reorganized so every root export from `src/index.ts` now appears in
`docs/core/api.md`.

| Group | Representative exports now documented |
|-------|---------------------------------------|
| App and composition surface | `NetlabApp`, `NetlabAppProps`, `NetlabProvider`, `NetlabCanvas`, `NetlabThemeScope`, `ResizableSidebar` |
| Simulation context and state | `SimulationProvider`, `SimulationContext`, `useSimulation`, `SimulationProviderProps`, `SimulationContextValue`, `PacketTrace`, `SimulationState` |
| Failure context and UI | `FailureProvider`, `FailureContext`, `useFailure`, `useOptionalFailure`, `EMPTY_FAILURE_STATE`, `FailureTogglePanel`, `FailureState` |
| Session management | `SessionTracker`, `SessionProvider`, `SessionContext`, `useSession`, `NetworkSession`, `SessionEvent` |
| Simulation UI components | `SimulationControls`, `PacketViewer`, `PacketTimeline`, `HopInspector`, `NatTableViewer`, `StepControls`, `PacketStructureViewer`, `TraceSummary`, `TraceSelector`, `SessionList`, `SessionDetail` |
| Step simulation and packet inspection | `StepSimulationController`, `StepSimStatus`, `StepSimState`, `serializePacket`, `serializeArpFrame`, `LayerTag`, `SerializedPacket` |
| Registries, hooks, routing exports, constants | `registerLayerPlugin`, `layerRegistry`, `protocolRegistry`, `HookEngine`, `hookEngine`, `StaticProtocol`, `staticProtocol`, `ospfProtocol`, `bgpProtocol`, `ripProtocol`, `ADMIN_DISTANCES`, `ICMP_TYPE`, `ICMP_CODE` |
| Editor surface and node factories | `TopologyEditor`, `TopologyEditorProvider`, `useTopologyEditorContext`, `TopologyEditorProps`, `EditorTopology`, `createRouterNode`, `createSwitchNode`, `createClientNode`, `createServerNode`, `randomPosition` |
| Utility surface | `isInSubnet`, `parseCidr`, `isInSameSubnet`, `deriveDeterministicMac`, `extractHostname`, `isIpAddress`, `encodeTopology`, `decodeTopology`, `validateConnection`, `isValidConnectionBetweenNodes` |
| Supporting type inventory | Packet, routing, NAT, ACL, area, topology, service, validation, and hook type exports |

## Example Quality Fixes

| File | Problem | Fix |
|------|---------|-----|
| `docs/core/overview.md` | Quick example referenced `NetworkDevice[]`, which is not a public type | Updated comment to `NetlabNode[]` |
| `docs/core/overview.md` | Supported-layers link pointed to a non-existent relative path | Updated link to `../networking/layers/index.md` |
| `docs/deployment/embed.md` | Lower-level provider-composition example omitted required imports | Added `NetlabProvider`, `NetlabCanvas`, `SimulationProvider`, and published layer imports |
| `docs/networking/layers/l7-application.md` | Example implied `installFetchInterceptor()` is currently usable | Added a planned-only warning comment above the snippet |

## Status Badge Audit

Status markers were normalized to the repository convention:

```markdown
> **Status**: ✅ Implemented
```

This included both adding missing badges and converting older `**Status: ...**` lines to the
standard blockquote form.

| Badge | Count |
|-------|-------|
| `✅ Implemented` | 39 |
| `⚠️ Experimental` | 4 |
| `🧪 Spec only — not yet implemented` | 3 |
| Total non-index docs | 46 |

## Verification

The following checks were used during the audit:

- `grep -RIn "netlab/src/" docs` → `0` matches
- `grep -RIn "netlab/utils/" docs` → `0` matches
- Root export audit: `src/index.ts` symbol names vs. `docs/core/api.md` → `0` missing exports

## Result

The documentation now matches the published import surface for the current package build, and the
main API reference covers the full root export list instead of only the original core canvas APIs.
