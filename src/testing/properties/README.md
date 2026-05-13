# Property Helpers

Shared `fast-check` helpers live here so property files do not invent ad hoc
generators.

```ts
fc.assert(
  fc.property(topologyArb(), (topology) => {
    // clone before mutation
  }),
  { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
);
```

- `ipv4Arb`, `macArb`, `portArb`, and `cidrArb` generate protocol primitives.
- `interfaceArb` generates valid router interfaces.
- `topologyArb` generates connected host topologies with edge endpoints that
  reference existing nodes.
- `inFlightPacketArb(topology)` generates packets whose current device belongs to
  the supplied topology.
