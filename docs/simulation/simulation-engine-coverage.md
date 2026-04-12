# Simulation Engine Coverage Improvements

> **Status**: ✅ Implemented

This document specifies the test-coverage expansion for `SimulationEngine`.
The goal is to cover routing correctness, TTL expiry behavior, ARP resolution,
no-route handling, and failure injection with deterministic reusable fixtures.

---

## Overview

The coverage expansion is test-only.
It must not change production `SimulationEngine`, `RouterForwarder`, or related runtime behavior.

The implementation is split into two layers:

- shared test fixtures extracted from `src/simulation/SimulationEngine.test.ts`
- a dedicated `src/simulation/SimulationEngine.coverage.test.ts` suite for gap-focused scenarios

This keeps the existing regression suite stable while making new multi-topology tests reusable.

---

## Shared Fixtures

Reusable fixtures live under `src/simulation/__fixtures__/`.

### `helpers.ts`

The helpers module exports:

- endpoint MAC constants used across deterministic topologies
- packet and frame factories such as `makeIpFrame()` and `makePacket()`
- route-table and engine helpers such as `makeRouteEntry()` and `makeEngine()`
- packet snapshot and PCAP helpers already used by the existing suite

These helpers are copied from the existing regression file without changing behavior.

### `topologies.ts`

The topology fixture module exports the current reusable topologies from
`SimulationEngine.test.ts` plus new coverage-specific topologies:

- `threeHopChainTopology()`
- `diamondTopology()`
- `asymmetricRoutingTopology()`

All topologies must use explicit interface IPs, explicit route tables, and fixed MAC addresses
so hop-by-hop assertions remain deterministic.

---

## Coverage Suite

`src/simulation/SimulationEngine.coverage.test.ts` contains focused describe blocks for:

- packet routing correctness
- TTL expiration
- ARP resolution
- no-route handling
- failure injection

The suite must prefer table-driven tests where multiple inputs exercise the same behavior.
Each scenario should assert the concrete hop path, drop node, or routing decision data rather
than only checking final trace status.

---

## Behavioral Expectations

### Packet Routing

- multi-router chains must verify ordered hop traversal
- TTL must decrement once per router hop and stay stable on endpoint delivery
- router boundaries must rewrite Ethernet source or destination MAC addresses
- longest-prefix match must beat a broader fallback route in a diamond topology
- asymmetric forward and return paths must be asserted independently

### TTL Expiration

- TTL `0` and TTL `1` must both drop at the first router with reason `ttl-exceeded`
- TTL exhaustion in deeper chains must identify the router where the drop occurred
- traceroute must collect one TTL-exceeded trace per router hop before the successful delivery trace
- TTL drop assertions must use the hop snapshot values emitted by the engine

### ARP Resolution

- ARP request hops must use broadcast destination MAC `ff:ff:ff:ff:ff:ff`
- ARP reply hops must return to the requester as unicast
- sender and target IP metadata must match the packet's current next-hop resolution need
- deterministic MAC derivation for nodes without explicit MAC configuration must be asserted
- repeated `precompute()` calls must not leak ARP cache state between runs

### No-Route Handling

- packets must be able to reach an intermediate router and drop there when a later router lacks a route
- no-route drops must keep prior successful forward hops in the trace
- `routingDecision` data must expose candidates, `winner: null`, and a non-empty explanation

### Failure Injection

- combined failure cases must assert the actual dominant drop reason
- fallback and recovery scenarios must verify path restoration, not only final delivery
- edge failures must be treated as bidirectional

---

## Validation

The implementation is complete only when all of the following pass:

```bash
npx vitest run src/simulation/SimulationEngine.test.ts
npx vitest run src/simulation/SimulationEngine.coverage.test.ts
```

The existing regression file must keep its current behavior, with fixture code moved but test logic unchanged.
