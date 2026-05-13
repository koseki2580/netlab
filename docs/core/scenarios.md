# Scenarios

`Scenario` is the repo's pure-data curriculum primitive. A scenario packages a
topology with learner-facing metadata so demos, tutorials, sandbox sessions,
assessments, and property tests can all reference the same network shape.

## Shape

```ts
interface ScenarioMetadata {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly objective: string;
  readonly difficulty: 'intro' | 'core' | 'advanced';
  readonly protocols: readonly string[];
  readonly prerequisiteIds: readonly string[];
}

interface Scenario {
  readonly metadata: ScenarioMetadata;
  readonly topology: NetworkTopology;
  readonly parameters?: ProtocolParameterSet;
  readonly sampleFlows?: readonly ScenarioSampleFlow[];
  readonly preseedEdits?: readonly Edit[];
  readonly preseedAnnotations?: readonly TraceAnnotation[];
  readonly assessmentRubric?: AssessmentRubric;
}
```

Scenario ids are kebab-case, unique inside `scenarioRegistry`, and have summaries
of at most 140 characters. Scenario files must stay pure data and must not import
React components or mutate their topology during registration.

## Built-Ins

The built-in registry contains:

| ID                 | Purpose                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `basic-arp`        | Observe first-hop ARP before an IP packet forwards.                        |
| `fragmented-echo`  | Observe IPv4 fragmentation and destination reassembly.                     |
| `tcp-handshake`    | Observe SYN, SYN-ACK, ACK reaching established state.                      |
| `ospf-convergence` | Observe OSPF reconvergence over alternate paths.                           |
| `stp-loop`         | Observe STP blocking a redundant L2 triangle link.                         |
| `nat-basics`       | Support sandbox/tutorial NAT flows added after the original Plan 52 scope. |

The original Plan 52 target was five built-ins. Later sandbox/tutorial work added
`nat-basics` as a first-class scenario, so the shipped contract is six registered
built-ins while preserving the original five learning anchors.

## Registration

Register new scenarios through `scenarioRegistry.register(scenario)`. Duplicate
ids and malformed metadata throw `NetlabError`. Public package exports are limited
to `Scenario`, `ScenarioMetadata`, `ScenarioRegistry`, and `scenarioRegistry`;
individual built-ins remain deep imports for repo-owned demos and tests.
