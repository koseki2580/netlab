# Interactive Sandbox

> **Status**: ✅ Implemented

The Interactive Sandbox lets a learner edit simulation state and immediately see the effect on the running topology. It is opt-in per demo through `NetlabProvider`.

## Opt-In Usage

```tsx
<NetlabProvider topology={topology} sandboxEnabled sandboxIntroId="sandbox-intro-mtu">
  <SimulationProvider>
    <DemoLayout />
  </SimulationProvider>
</NetlabProvider>
```

- `sandboxEnabled` mounts the sandbox surface.
- `sandboxIntroId` is optional. When present, the sandbox intro overlay is mounted on top of the sandbox.
- The sandbox is rendered inside `SimulationProvider` because it snapshots and rebuilds the active `SimulationEngine`.

## Mode Model

The sandbox has two modes:

- `alpha` / `Live`: one editable branch. This is the default.
- `beta` / `Compare`: baseline and what-if are rendered side by side.

The mode toggle lives in the panel header. When `beta` is active, the primary simulation canvas is replaced by `<BeforeAfterView>` and `<DiffTimeline>` stays visible below the main surface.

## Editing Surface

`SandboxPanel` always exposes four tabs:

- `Packet`: edit the selected packet trace hop. The current implementation supports TTL and raw payload replacement.
- `Node`: summarize node/link edits already recorded in the session. Right-click a node or link on the canvas to open the inline editor popover.
- `Parameters`: adjust global TCP, OSPF, ARP, and engine parameters. If Compare is active, parameter edits switch back to Live first.
- `Traffic`: launch synthetic ICMP/TCP/UDP flows and keep simple in-memory presets.

Entity-level edits open in `<EditPopover>`:

- Node popovers expose route, MTU, NAT, and ACL editors.
- Edge popovers expose link up/down editing.
- Packet timeline rows expose packet editing from the trace timeline context menu.

## URL Persistence

Sandbox state is shareable through query parameters:

| Param                      | Meaning                                                          |
| -------------------------- | ---------------------------------------------------------------- | ---------- | -------- | -------------------------------------------- |
| `sandbox=1`                | Enables the sandbox surface for sandbox-ready demos.             |
| `sandboxTab=packet         | node                                                             | parameters | traffic` | Selects the initial active tab in the panel. |
| `sandboxState=<base64url>` | Encodes the current ordered edit session as UTF-8 JSON.          |
| `intro=sandbox-intro-mtu`  | Starts the built-in sandbox intro on the MTU fragmentation demo. |

`SandboxProvider` keeps `sandboxState` synchronized with the current session via `history.replaceState`, so copying the current URL preserves the current edit log.

The serialized payload is:

```ts
interface SerializedSandboxState {
  version: 1;
  edits: Edit[];
}
```

Malformed or unknown edits are ignored on load instead of crashing the demo.

## Supported Demos

The Gallery renders sandbox-ready entries in a dedicated **Interactive Sandbox** section. Today these entries are wired for sandbox mode:

- `MTU & Fragmentation`
- `TCP Handshake`
- `OSPF Convergence`
- `ARP Basics`
- `All-in-One`

The first entry in that section is `Start here: Sandbox intro`, which opens the MTU fragmentation demo with the built-in intro overlay.

## Hook Events

The sandbox emits additive hook events through `hookEngine`:

- `sandbox:edit-applied`
- `sandbox:edit-rejected`
- `sandbox:mode-changed`
- `sandbox:panel-tab-opened`

These events are intended for analytics, guided onboarding, and higher-level orchestration. They are notifications, not veto points.

## Tutorial Conflict

`SandboxProvider` and `TutorialProvider` are mutually exclusive. Mounting both in the same subtree raises:

```txt
SandboxProvider cannot mount under TutorialProvider; see docs/ui/sandbox.md#tutorial-conflict
```

The sandbox surface is wrapped in `SandboxErrorBoundary`, so this conflict renders an inline warning instead of a blank subtree. The intro flow does not weaken this mutex: it reuses `TutorialRunner` headlessly and never mounts `TutorialProvider`.

## Public Surface

Library consumers can import:

- `SandboxProvider`
- `useSandbox`
- `EditSession`
- `encodeSandboxEdits`
- `decodeSandboxEdits`
- `updateSandboxSearch`
- `SandboxPanel`
- `BeforeAfterView`
- `DiffTimeline`
- `EditPopover`

## Related Docs

- [Sandbox Introduction](sandbox-intro.md)
- [Query Params](../deployment/query-params.md)
- [Hook System](../core/hooks.md)
