# netlab-run CLI

`netlab-run` is a Node CLI for black-box regression checks over committed scenarios and exported sandbox sessions. It runs a scenario, applies an `EditSession` export, evaluates declarative assertions, writes machine-readable output, and exits with the number of failed assertions.

## Command

```bash
npx netlab-run <scenario-id> <session.json> <assertions.json>
```

Flags:

- `--help`: print usage.
- `--version`: print the package version.
- `--tap`: write TAP output. This is the default.
- `--json`: write a JSON summary.
- `--verbose`: include diagnostic data for failed assertions.

Exit codes:

- `0`: every assertion passed.
- `1..255`: the number of failed assertions, capped at `255`.
- `2`: invocation or input loading failed before assertions could run.

## Session Input

The session file uses the sandbox session export schema from [Sandbox Session Import / Export](../ui/sandbox-session-io.md). The CLI decodes the same schema as the browser import flow, then applies the visible `EditSession` head to the scenario's initial snapshot.

The scenario argument must identify a built-in scenario registered by `src/scenarios`.

## Assertions

The assertions file is a JSON array. Each item has a `kind` field and kind-specific fields.

```json
[
  { "kind": "packet-reaches", "source": "client-1", "destination": "203.0.113.10", "within": 100 },
  { "kind": "arp-cache-contains", "nodeId": "client-1", "ip": "10.0.0.1" }
]
```

Built-in assertion kinds:

| Kind                   | Required fields                    | Pass condition                                                                                       |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `packet-reaches`       | `source`, `destination`, `within`  | `engine.ping(source, destination)` delivers within the hop limit.                                    |
| `packet-fails`         | `source`, `destination`, `reason`  | The ping drops and the final drop reason matches `ttl`, `no-route`, `mtu`, or `filtered`.            |
| `arp-cache-contains`   | `nodeId`, `ip`                     | Runtime ARP state for the node contains the IP after prior assertion traffic.                        |
| `route-table-contains` | `nodeId`, `destination`, `nextHop` | The scenario topology has a matching route entry for the node.                                       |
| `fragmentation-occurs` | `atNodeId`                         | A prior trace includes a fragmentation hop at the node.                                              |
| `tcp-established`      | `client`, `server`                 | `engine.tcpConnect(client, server, 12345, 80)` establishes a connection.                             |
| `ospf-converged`       | `withinSteps`                      | A sample flow from the scenario delivers within the step budget using route metadata.                |
| `rubric-passes`        | `rubricId`                         | The scenario assessment rubric with that id passes against the current simulation state and session. |

Assertions are evaluated in order against one engine instance. Traffic-producing assertions can seed state used by later assertions, for example ARP cache checks after a packet reachability check.

## TAP Output

Default output is TAP-compatible:

```text
TAP version 13
1..2
ok 1 - packet client-1 reached 203.0.113.10 within 100 hops
not ok 2 - ARP cache for client-1 contains 10.0.0.1
  ---
  message: "missing ARP entry"
  ...
```

## JSON Output

`--json` writes:

```json
{
  "scenarioId": "basic-arp",
  "passCount": 1,
  "failCount": 0,
  "results": [{ "pass": true, "description": "..." }]
}
```

## Regression Matrix

The repository-level regression suite is:

```bash
npm run regression
```

It reads `scripts/regression-matrix.json`, runs each explicit `(scenario, session, assertions)` entry, concatenates TAP output, and exits with the aggregate failure count. The matrix is intentionally explicit to avoid accidental combinatorial growth in CI.

## Teacher Grading

Teachers can grade exported student sessions with the same command:

```bash
npx netlab-run ospf-convergence student-session.json rubric-assertions.json --json
```

Use `rubric-passes` for assessment scenarios and combine it with packet-level checks when the grading rubric needs observable forwarding behavior.
