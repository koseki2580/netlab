# Sandbox Introduction

> **Status**: ✅ Implemented

netlab ships one built-in onboarding flow for the Interactive Sandbox: `sandbox-intro-mtu`.

## Entry Point

Open the MTU fragmentation demo with:

```txt
/?sandbox=1&sandboxTab=node&intro=sandbox-intro-mtu#/networking/mtu-fragmentation
```

The Gallery exposes this as **Start here: Sandbox intro** in the Interactive Sandbox section.

## What It Teaches

The intro is intentionally short and uses the MTU fragmentation scenario because the effect of each edit is immediately visible.

Steps:

1. Open the `Node` tab.
2. Apply an interface MTU edit.
3. Launch synthetic traffic from the `Traffic` tab.
4. Enter `Compare`.
5. Return to `Live`.

When the intro is completed or skipped, the overlay disappears and the learner stays in the same sandbox session.

## Implementation Model

The intro reuses `TutorialRunner` from guided tutorials, but it does not mount `TutorialProvider`.

- `SandboxIntroProvider` owns a headless `TutorialRunner`.
- `SandboxIntroOverlay` renders the current intro step.
- The sandbox/tutorial mutex remains intact because `TutorialPresenceContext` is never set by the intro flow.

## Events Observed

The intro advances from sandbox hook events:

- `sandbox:panel-tab-opened`
- `sandbox:edit-applied`
- `sandbox:mode-changed`

This keeps predicates pure and restartable. No intro step depends on ambient mutable module state.
