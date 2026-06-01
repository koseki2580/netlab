# Sandbox Embed Integration

> **Status**: Implemented

## Overview

The interactive sandbox can be embedded in an external host page, such as a
course page or textbook article, by rendering netlab inside an iframe or by
mounting `NetlabApp` inside a bounded host layout.

Sandbox embed mode adds three opt-in capabilities:

- a child-to-parent `postMessage` event stream for sandbox progress
- compact sandbox chrome for iframe-sized layouts
- a pure URL builder for constructing sandbox iframe `src` values

No embed event is emitted unless the integrator provides an explicit
`parentOrigin` whitelist. netlab never posts sandbox state with `'*'`.

## Provider Options

`NetlabProvider` accepts these embed-specific options:

```tsx
<NetlabProvider
  topology={topology}
  sandboxEnabled
  embedMode="compact"
  parentOrigin="https://teacher.example"
>
  <SimulationProvider>{/* sandbox content */}</SimulationProvider>
</NetlabProvider>
```

| Prop           | Type                          | Behavior                                             |
| -------------- | ----------------------------- | ---------------------------------------------------- |
| `embedMode`    | `'compact' \| 'minimal'`      | Enables iframe-friendly sandbox chrome               |
| `parentOrigin` | `string \| readonly string[]` | Whitelist of allowed parent origins for child events |

`embedMode="compact"` narrows the sandbox panel and keeps the collapse toggle.
`embedMode="minimal"` keeps the panel visible and removes the collapse toggle.

`NetlabApp` passes these options through to `NetlabProvider` when using the
all-in-one component.

## Child Event Protocol

All child events are posted with `window.parent.postMessage(event, origin)`,
where `origin` is one of the validated `parentOrigin` entries.

```ts
type SandboxChildEvent =
  | { type: 'sandbox-ready'; version: string; scenarioId: string; editCount: number }
  | { type: 'sandbox-edit-count-changed'; count: number; scenarioId: string }
  | { type: 'sandbox-assessment-passed'; rubricId: string; hintsUsed: number; durationMs: number }
  | { type: 'sandbox-session-exported'; sizeBytes: number; scenarioId: string };
```

Event semantics:

| Event                        | Emitted when                                    |
| ---------------------------- | ----------------------------------------------- |
| `sandbox-ready`              | The embedded sandbox bridge mounts              |
| `sandbox-edit-count-changed` | The visible sandbox edit count changes          |
| `sandbox-assessment-passed`  | An assessment transitions to the passed state   |
| `sandbox-session-exported`   | The student exports a sandbox session JSON file |

Edit-count events are debounced so a burst of edits produces one coalesced
message.

## Parent Listener

The host page listens for messages from the iframe:

```ts
const iframeOrigin = 'https://koseki2580.github.io';

window.addEventListener('message', (event) => {
  if (event.origin !== iframeOrigin) return;
  if (event.data?.type === 'sandbox-edit-count-changed') {
    progress.textContent = `Student has made ${event.data.count} edits`;
  }
});
```

The parent must still validate `event.origin`. The child-side whitelist only
controls where netlab sends messages; it does not replace parent-side checks.

## URL Builder

Use `buildSandboxEmbedUrl` when constructing iframe URLs programmatically:

```ts
import { buildSandboxEmbedUrl } from 'netlab';

const src = buildSandboxEmbedUrl({
  baseUrl: 'https://koseki2580.github.io/netlab/?#/networking/mtu-fragmentation',
  scenarioId: 'fragmented-echo',
  embedMode: 'compact',
  sandboxEnabled: true,
  edits: encodedSandboxState,
});
```

The builder preserves existing query parameters and hash routes, then applies
known sandbox parameters:

| Option           | Query parameter |
| ---------------- | --------------- |
| `scenarioId`     | `scenario`      |
| `sandboxEnabled` | `sandbox=1`     |
| `embedMode`      | `embedMode`     |
| `tutorialId`     | `tutorial`      |
| `assessmentId`   | `assessment`    |
| `replayUrl`      | `replay`        |
| `edits`          | `sandboxState`  |
| `parentOrigin`   | `parentOrigin`  |

`edits` must already be encoded with `encodeSandboxEdits`.

## Security Rules

- Do not use `'*'` as a target origin.
- Do not infer a trusted parent from `document.referrer`.
- Treat each allowed origin as an exact origin, not a suffix match.
- Keep parent-to-child commands out of this protocol.

## Caveats

Browser file picker behavior for session import/export can vary inside nested
iframes. Replay URLs continue to use normal query parameters inside the iframe
`src`.
