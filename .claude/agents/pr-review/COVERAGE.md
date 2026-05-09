# PR Review Coverage

A list of perspectives covered by the PR review agents.

This list is not an exhaustive fixed execution table. The actual agents to invoke are decided by the main agent that uses `review-orchestration`.

## Coverage Matrix

| Category | Agent | Main Focus |
|---|---|---|
| Scope | `pr-change-validity-reviewer` | change validity, Surgical Changes, Approval Gates |
| Correctness | `pr-correctness-reviewer` | implementation logic, boundary values, state transitions |
| Tests | `pr-test-reviewer` | Tests Required, bug-fix TDD, CI/test results |
| Docs | `pr-docs-reviewer` | docs quality, README/examples, docs index |
| Spec consistency | `pr-spec-consistency-reviewer` | cross-cutting consistency of docs/tests/code/API |
| Maintainability | `pr-maintainability-reviewer` | Reuse before adding, Simplicity First, local maintainability |
| Architecture | `pr-architecture-reviewer` | module boundaries, dependency direction, layering, domain leak |
| Security | `pr-security-reviewer` | auth, trust boundary, secrets, input validation |
| Performance | `pr-performance-reviewer` | hot path, resource usage, runtime cost |
| Algorithm/DS | `pr-algorithm-data-structure-reviewer` | complexity, data structures, known algorithms |
| Backward compatibility | `pr-backward-compatibility-reviewer` | existing consumers, existing data, compatibility |
| API contract | `pr-api-contract-reviewer` | schema, SDK, OpenAPI, contract |
| Error handling | `pr-error-handling-reviewer` | failure modes, propagation, recovery |
| Observability | `pr-observability-reviewer` | logs, metrics, traces, alerts |
| Dependency | `pr-dependency-reviewer` | dependency additions/updates, license/security surface |
| Concurrency | `pr-concurrency-reviewer` | race conditions, locks, async ordering, shared state |
| Migration safety | `pr-migration-safety-reviewer` | DB schema, data migration, deploy order, rollback |
| Config/deployment | `pr-config-deployment-reviewer` | env vars, config, deployment, rollback |
| Accessibility | `pr-accessibility-reviewer` | a11y on UI changes |
| i18n | `pr-i18n-reviewer` | locale, timezone, text extraction |
| Historical risk | `pr-historical-risk-reviewer` | git history, reverts, hotspots, past incidents |
| Team reference | `pr-team-lead-reference-reviewer` | team-specific review based on active references |
| Dynamic validation | `pr-dynamic-validation-reviewer` | CI/test/coverage/local validation evidence |
| Interactive follow-up | `pr-interactive-followup-reviewer` | keep/soften/withdraw/clarify/escalate decisions after author reply |
| Meta review | `pr-review-meta-reviewer` | verification of agent selection, skip rationale, and final summary draft |

## Current Coverage Count

- PR review perspectives: 25
- Implementation-time review perspectives are maintained separately under `agents/implementation-review/`.

## Known Boundaries

- Actually running tests or fetching CI is not the responsibility of this agent group. Use already-acquired results as `review_context.ci_results`.
- Historical review is only enabled when `historical_context.available: true`.
- Team-lead reference is used as comment grounds only when an `active` reference exists.
- The dynamic validation reviewer is responsible for interpreting execution results. It does not run dangerous commands or make IaC changes.
- The interactive follow-up reviewer handles replies and re-evaluation of existing comments. It does not start new perspective reviews on its own.
- The meta reviewer does not produce PR comments; it serves as an internal quality gate for the main agent.
