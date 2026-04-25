# Sandbox Introduction

> **Status**: ✅ Implemented

netlab ships four built-in onboarding flows for the Interactive Sandbox.

| Intro id             | Demo route                      | Default tab | Teaches                                                                                    |
| -------------------- | ------------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `sandbox-intro-mtu`  | `/networking/mtu-fragmentation` | `node`      | Lower an interface MTU, launch traffic, and compare baseline vs what-if.                   |
| `sandbox-intro-tcp`  | `/simulation/tcp-handshake`     | `packet`    | Launch TCP sandbox traffic, flip SYN to RST, and inspect the packet edit.                  |
| `sandbox-intro-ospf` | `/routing/ospf-convergence`     | `node`      | Fail the primary path, launch traffic, add a static backup route, and confirm convergence. |
| `sandbox-intro-nat`  | `/simulation/nat`               | `node`      | Add a DNAT rule, launch outside traffic, inspect translation, then remove the rule.        |

## Entry Points

Each intro is selected with `sandbox=1`, a starting `sandboxTab`, and an `intro` id:

```txt
/?sandbox=1&sandboxTab=node&intro=sandbox-intro-mtu#/networking/mtu-fragmentation
/?sandbox=1&sandboxTab=packet&intro=sandbox-intro-tcp#/simulation/tcp-handshake
/?sandbox=1&sandboxTab=node&intro=sandbox-intro-ospf#/routing/ospf-convergence
/?sandbox=1&sandboxTab=node&intro=sandbox-intro-nat#/simulation/nat
```

The Gallery exposes these as the first four cards in **Interactive Sandbox**, followed by the regular sandbox-ready demo cards.

## Implementation Model

The intro overlay reuses `TutorialRunner` from guided tutorials, but it does not mount `TutorialProvider`.

- `SandboxIntroProvider` owns a headless `TutorialRunner`.
- `SandboxIntroOverlay` renders the current intro step.
- The sandbox/tutorial mutex remains intact because `TutorialPresenceContext` is never set by the intro flow.
- Each intro is independent; completing one intro does not unlock or alter any other intro.

## Predicate Contract

Intro predicates are pure functions of the current sandbox what-if `SimulationState` plus the bounded hook-event log. They are covered by per-intro unit tests and a cross-intro property test for totality, determinism, and input immutability.

The provider records these sandbox hook events:

- `sandbox:panel-tab-opened`
- `sandbox:edit-applied`
- `sandbox:mode-changed`

When a demo has no dedicated protocol hook, the intro uses existing sandbox state or edit events instead of widening the provider. For example, the OSPF intro observes the backup-path workflow through sandbox traffic/edit events rather than subscribing to a new LSA hook.
