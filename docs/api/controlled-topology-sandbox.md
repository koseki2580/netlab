# Controlled Topology + Sandbox

> **Status**: Implemented

## Overview

Interactive Sandbox edits mutate topology through `EditSession`. When an embedding application also owns topology through the controlled topology API, Netlab requires an explicit reconciliation mode so the sandbox does not silently fork from parent-owned state.

## Modes

`sandboxControlMode` accepts two values:

| Mode               | State owner         | Sandbox edit behavior                                                                                                                   |
| ------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `sandbox-proposes` | Parent application  | Sandbox emits `onSandboxEditProposed`; only accepted edits are appended to the sandbox session and reported through `onTopologyChange`. |
| `sandbox-owns`     | Sandbox after mount | Controlled `topology` is treated as a seed. Sandbox edits apply internally and `onTopologyChange` is informational only.                |

When `topology` and `sandboxEnabled` are provided without `sandboxControlMode`, Netlab defaults to `sandbox-proposes`. Development builds emit a per-mount warning; production builds skip the warning.

## Provider API

```tsx
type SandboxControlMode = 'sandbox-proposes' | 'sandbox-owns';

type TopologyChangeMeta = {
  source: 'user' | 'sandbox' | 'sandbox-informational';
};

type SandboxEditProposal = {
  readonly edit: Edit;
  readonly accept: () => void;
  readonly reject: (reason?: string) => void;
};

<NetlabProvider
  topology={topology}
  sandboxEnabled
  sandboxControlMode="sandbox-proposes"
  sandboxProposalTimeoutMs={5000}
  onSandboxEditProposed={(proposal) => proposal.accept()}
  onTopologyChange={(next, meta) => {
    if (meta.source !== 'sandbox-informational') {
      setTopology((current) => ({ ...current, ...next }));
    }
  }}
>
  {children}
</NetlabProvider>;
```

`onTopologyChange` receives a serializable `TopologySnapshot`. `routeTables`, STP runtime fields, and other computed data remain provider-owned and are recomputed from the next topology.

## `sandbox-proposes`

Use this when the parent application owns topology and needs to approve or veto sandbox edits.

```tsx
<NetlabProvider
  topology={topology}
  sandboxEnabled
  sandboxControlMode="sandbox-proposes"
  onSandboxEditProposed={(proposal) => {
    if (canApply(proposal.edit)) {
      proposal.accept();
    } else {
      proposal.reject('policy');
    }
  }}
  onTopologyChange={(next) => setTopology((current) => ({ ...current, ...next }))}
>
  <SimulationProvider>{children}</SimulationProvider>
</NetlabProvider>
```

Acceptance is one-shot. Repeated calls to `accept()` or `reject()` after the first resolution are ignored.

Rejected edits never enter `EditSession`, the sandbox snapshot, trace state, or URL persistence. The sandbox emits `sandbox:edit-rejected` with a controlled-topology reason.

## Timeout

If a proposal is not accepted or rejected within `sandboxProposalTimeoutMs`, Netlab auto-rejects it. The default is 5000 ms.

Timeouts emit:

- `sandbox:proposal-timeout`
- `sandbox:edit-rejected` with reason `controlled-timeout`

## `sandbox-owns`

Use this when the parent only wants to seed topology and then observe sandbox-local changes.

```tsx
<NetlabProvider
  topology={topology}
  sandboxEnabled
  sandboxControlMode="sandbox-owns"
  onTopologyChange={(next, meta) => {
    if (meta.source === 'sandbox-informational') {
      auditSandboxTopology(next);
    }
  }}
>
  <SimulationProvider>{children}</SimulationProvider>
</NetlabProvider>
```

After the sandbox mounts, parent writes to `topology` are not used to rewrite the active sandbox session. The callback is informational so consumers do not mistake it for a request to overwrite parent-owned topology.

## Decision Matrix

| Need                                                                 | Choose             |
| -------------------------------------------------------------------- | ------------------ |
| Parent must approve every sandbox edit                               | `sandbox-proposes` |
| Parent has persistence, policy, collaboration, or audit requirements | `sandbox-proposes` |
| Sandbox is a local what-if lab seeded by the parent                  | `sandbox-owns`     |
| Legacy sandbox behavior with explicit acknowledgement                | `sandbox-owns`     |
