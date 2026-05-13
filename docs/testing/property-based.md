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
