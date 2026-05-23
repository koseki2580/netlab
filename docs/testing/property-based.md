# Property-Based Testing

Netlab uses `fast-check` for invariants that are broader than example tests. All
property tests live in `__properties__/` folders and run with explicit seeds from
`src/testing/seeds.ts`.

## Shared Helpers

`src/testing/properties/arbitraries.ts` provides reusable generators for:

- IPv4 addresses, MAC addresses, ports, CIDRs, router interfaces, topologies, and
  in-flight packets.
- Simulation and tutorial predicate inputs used by sandbox, assessment, and
  tutorial properties.

`src/testing/properties/oracles.ts` provides invariant checkers for ARP table
consistency, IPv4 fragment reassembly, longest-prefix routing, STP tree shape, and
TCP state reachability. Oracles throw `NetlabError` with `property/*` codes so a
shrunk counter-example includes machine-readable context.

## Property Catalogue

| File                                                                       | Invariant                                                                                    |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/simulation/__properties__/arp.property.test.ts`                       | ARP tables only contain directly reachable neighbor interface mappings.                      |
| `src/simulation/__properties__/fragmentation.property.test.ts`             | IPv4 fragments preserve payload bytes, ascending offsets, and MF flag placement.             |
| `src/simulation/__properties__/routing.property.test.ts`                   | Route lookup selects the longest matching prefix with deterministic tie breaks.              |
| `src/simulation/__properties__/stp.property.test.ts`                       | Active STP switch edges form a connected, acyclic tree.                                      |
| `src/simulation/__properties__/tcp-handshake.property.test.ts`             | TCP handshake traces only contain state-machine-reachable transitions.                       |
| `src/simulation/__properties__/shaper.bounds.property.test.ts`             | DSCP shaper queues respect configured class bounds and deterministic classification.         |
| `src/simulation/__properties__/shaper.weight.property.test.ts`             | DSCP shaper output follows configured relative weights.                                      |
| `src/simulation/__properties__/rip.property.test.ts`                       | RIP connected-chain convergence, metric-16 unreachable ceiling, and learned next-hop sanity. |
| `src/simulation/__properties__/reassembly.property.test.ts`                | Reassembly is byte-equivalent across fragment orderings and stream eviction is key-scoped.   |
| `src/simulation/__properties__/mpls-ldp.property.test.ts`                  | LDP label assignment is deterministic and push/swap/pop preserves lower stack bytes.         |
| `src/simulation/__properties__/evpn-ecmp.property.test.ts`                 | EVPN VTEP selection is deterministic per flow and non-degenerate across a port sweep.        |
| `src/routing/__properties__/ecmp.stickiness.property.test.ts`              | ECMP keeps a fixed flow in the same bucket for a fixed seed.                                 |
| `src/routing/__properties__/ecmp.distribution.property.test.ts`            | ECMP uses every bucket across a deterministic flow sweep.                                    |
| `src/simulation/worker/__properties__/thread-equivalence.property.test.ts` | Worker and main-thread engines produce equivalent traces for supported packets.              |
| `src/simulation/worker/__properties__/disposability.property.test.ts`      | Worker engine lifecycle remains disposable across repeated create/clear cycles.              |

## Seed Policy

Every `fc.assert` must pass an explicit seed and run count. The default seed is
`PROPERTY_SEED_DEFAULT`; expensive engine properties may use fewer runs only when
the test file states the reason.

## Failure Workflow

A property failure is treated as a product bug. Pin the shrunk counter-example as
a regular `it()` regression, skip only the failing property with a `TODO(bug/NN)`,
file the bug, and fix it in a follow-up change. Do not weaken the invariant to get
green CI.

## Bundle Boundary

`fast-check` stays in `devDependencies` and may be imported only from tests or
`src/testing/properties/`. Runtime exports from `src/index.ts` must not expose the
property harness.
