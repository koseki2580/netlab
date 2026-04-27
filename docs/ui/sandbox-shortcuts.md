# Sandbox Keyboard Shortcuts & Screen-Reader Narration

**Plan**: plan/67  
**Status**: Shipped  
**Related**: [sandbox.md](sandbox.md), [accessibility.md](accessibility.md), [sandbox-undo.md](sandbox-undo.md)

---

## Overview

The Interactive Sandbox exposes a set of keyboard shortcuts that power users can use without reaching for the mouse, and an `aria-live` narration region that keeps screen-reader users informed of simulation state changes.

---

## Keyboard Shortcuts

### Built-in shortcut list

| Key                            | Description                       |
| ------------------------------ | --------------------------------- |
| `?`                            | Open the shortcuts help modal     |
| `Escape`                       | Close the active popover or modal |
| `Shift+S`                      | Toggle sandbox panel visibility   |
| `Shift+C`                      | Toggle compare (β) mode on/off    |
| `Cmd+Z` / `Ctrl+Z`             | Undo the last edit                |
| `Cmd+Shift+Z` / `Ctrl+Shift+Z` | Redo the last undone edit         |

> **macOS**: meta key (`Cmd`). **Windows/Linux**: ctrl key (`Ctrl`). The registry normalises both to `Cmd+`.

### Text-input exception

Shortcuts are **silently ignored** when the browser's active element is an `<input>`, `<textarea>`, `<select>`, or any `[contenteditable]` element. This prevents accidental triggering while the user is typing.

### Shortcut registry API

```ts
import { shortcutRegistry } from 'src/sandbox/shortcuts/registry';

// Register a shortcut (returns an unregister function)
const unregister = shortcutRegistry.register({
  key: 'Shift+D',
  description: 'Debug dump',
  action: () => console.log(session),
  enabled: () => session.size() > 0, // optional
});

// Later:
unregister();

// List all currently registered shortcuts
shortcutRegistry.list();
```

The registry is the **single source of truth** for all sandbox shortcuts. Plan/63's `Cmd+Z` registers through this registry. Feature code must not add separate `window.addEventListener('keydown', ...)` listeners for sandbox actions.

### Help modal

Pressing `?` (or clicking the `?` button in the sandbox panel header) opens `ShortcutsHelpModal`. The modal:

- Renders a two-column table (`Key` / `Action`) from `shortcutRegistry.list()`.
- Is `role="dialog" aria-modal="true"` with a labelled heading.
- Traps focus inside (Tab / Shift+Tab cycle).
- Closes on `Escape` or clicking the backdrop.
- Returns focus to the previously focused element on close.
- Passes axe-core with zero violations.

---

## Screen-Reader Narration

### Architecture

`<SandboxNarrationRegion>` is mounted by `<NetlabProvider sandboxEnabled>` and subscribes to sandbox hook events. Announcements are written to a visually-hidden `aria-live="polite"` `<div>`.

```
NetlabProvider (sandboxEnabled=true)
  └── SandboxNarrationRegion   ← aria-live="polite"
        ├── hookEngine.on('sandbox:edit-applied')
        ├── hookEngine.on('sandbox:edit-undone')
        ├── hookEngine.on('sandbox:edit-redone')
        ├── hookEngine.on('sandbox:mode-changed')
        └── hookEngine.on('sandbox:reset-all')
```

### Throttle

Announcements are throttled to **one per 500 ms**. If multiple events fire within the window, only the **last** event in the window is announced. This prevents screen-reader spam during fast undo/redo sequences.

### Narration strings

All strings are centralised in `src/sandbox/narration/messages.ts`. One function per event type:

| Event                                   | Example announcement                                                   |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `sandbox:edit-applied` (interface.mtu)  | `MTU set to 500 on router-1 interface eth0.`                           |
| `sandbox:edit-applied` (node.route.add) | `Static route added on router-1: 10.0.0.0/24 via 192.168.1.1.`         |
| `sandbox:edit-applied` (link.state)     | `Link link-1 set to down.`                                             |
| `sandbox:edit-applied` (param.set)      | `Parameter engine.tickMs changed to 200.`                              |
| `sandbox:edit-applied` (traffic.launch) | `Traffic flow launched from node-a to node-b.`                         |
| `sandbox:edit-undone`                   | `Undone: MTU set to 500 on router-1 interface eth0.`                   |
| `sandbox:edit-redone`                   | `Redone: MTU set to 500 on router-1 interface eth0.`                   |
| `sandbox:mode-changed` (beta)           | `Compare mode enabled; baseline and what-if are running side by side.` |
| `sandbox:mode-changed` (alpha)          | `Compare mode exited.`                                                 |
| `sandbox:reset-all`                     | `All edits reset; sandbox returned to baseline.`                       |

> **i18n**: strings are in `messages.ts` for future extraction into plan/80.

### Enabling narration

Narration is enabled whenever `<NetlabProvider sandboxEnabled>` is mounted. No extra prop is needed. The region is invisible and inert when the sandbox is inactive (`sandboxEnabled=false`).

---

## Screen-reader compatibility

| Reader    | Browser | Tested                 |
| --------- | ------- | ---------------------- |
| VoiceOver | Safari  | Manual smoke (plan/67) |
| NVDA      | Firefox | Best-effort            |
| JAWS      | Chrome  | Best-effort            |

`aria-live="polite"` with `aria-atomic="true"` is the broadest-compatibility pattern. The region is visually hidden with the standard clip/overflow technique (`clip: rect(0,0,0,0)`, `width: 1px`, `height: 1px`).

---

## Testing

### Unit

| File                                                    | What it covers                                                |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| `src/sandbox/shortcuts/registry.test.ts`                | register/unregister, list order, subscribe, \_reset           |
| `src/sandbox/shortcuts/dispatcher.test.ts`              | key matching, text-input exception, enabled predicate, stop() |
| `src/components/sandbox/ShortcutsHelpModal.test.tsx`    | render, rows, close, focus, a11y                              |
| `src/sandbox/narration/SandboxNarrationRegion.test.tsx` | aria-live, throttle, all event types                          |

### e2e

| File                            | What it covers                                                     |
| ------------------------------- | ------------------------------------------------------------------ |
| `e2e/sandbox-keyboard.spec.ts`  | `?` modal, `Shift+S`, `Shift+C`, undo/redo keyboard walk, axe-core |
| `e2e/sandbox-narration.spec.ts` | narration region presence, MTU/mode/reset/undo/redo announcements  |
