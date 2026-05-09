# PR Review Agents

This directory hosts subagents dedicated to PR review.

PR review agents are kept fully separate from implementation-time review agents.

- PR review agent: handles merge decisions, PR comments, and externally visible findings
- Implementation-time review agent: assumes incomplete code and returns next actions. Does not produce PR comments.

## Common rules

All PR review agents follow:

- `skills/review-orchestration/reviewer-contract.md`
- `skills/create-pr-comment/comment-taxonomy.md`
- `agents/pr-review/review-agent-quality-guidelines.md`
- Provider-specific posting is delegated to `skills/create-pr-comment/github.md` / `bitbucket.md`

## Agent list

### Basic review

- `pr-change-validity-reviewer`: checks whether changes are valid against PR purpose, spec, and scope
- `pr-correctness-reviewer`: checks correctness of implementation logic
- `pr-test-reviewer`: checks Tests Required, bug-fix TDD, and CI/test results
- `pr-docs-reviewer`: checks documentation quality and missing updates
- `pr-maintainability-reviewer`: checks Reuse before adding, Simplicity First, and local maintainability

### Contract / compatibility

- `pr-api-contract-reviewer`: checks public API / schema / SDK / contract
- `pr-backward-compatibility-reviewer`: checks existing consumers, existing data, and compatibility
- `pr-spec-consistency-reviewer`: checks the docs / tests / code triangle for consistency

### Safety / operations

- `pr-security-reviewer`: checks authentication, authorization, input boundaries, secrets, and trust boundaries
- `pr-error-handling-reviewer`: checks failure modes / propagation / recovery
- `pr-observability-reviewer`: checks logs / metrics / traces / alerts
- `pr-config-deployment-reviewer`: checks env vars / config / deployment / rollback
- `pr-migration-safety-reviewer`: checks DB schema / data migration / deploy order

### Structure / performance / history

- `pr-architecture-reviewer`: checks module boundaries, dependency direction, and layering
- `pr-performance-reviewer`: checks runtime / resource / hot path
- `pr-algorithm-data-structure-reviewer`: checks complexity, data structures, and applicability of known algorithms
- `pr-concurrency-reviewer`: checks race conditions / locks / async ordering / shared state
- `pr-historical-risk-reviewer`: checks regression risk based on git history, past reverts, and hotspots

### By change area

- `pr-dependency-reviewer`: checks dependency additions and updates
- `pr-accessibility-reviewer`: checks a11y on UI changes
- `pr-i18n-reviewer`: checks locale / timezone / text extraction

### Dynamic validation, dialogue, team-specific, meta

- `pr-dynamic-validation-reviewer`: checks CI / test / coverage / local validation evidence
- `pr-interactive-followup-reviewer`: decides whether to keep, withdraw, or soften a comment after the author replies
- `pr-team-lead-reference-reviewer`: only when an active reference exists, reviews against past TL review knowledge
- `pr-review-meta-reviewer`: internally reviews the main agent's agent selection, skip rationale, and final summary draft

## Handling of CLAUDE.md rules

The main agent passes project rules such as CLAUDE.md to each agent as `project_rules`.

- Tests Are Required -> `pr-test-reviewer`
- Bug fixes follow TDD -> `pr-test-reviewer`, `pr-historical-risk-reviewer`
- Docs–tests consistency -> `pr-spec-consistency-reviewer`, `pr-test-reviewer`, `pr-docs-reviewer`
- Validation Before Completion -> `pr-test-reviewer`, `pr-review-meta-reviewer`
- Surgical Changes -> `pr-change-validity-reviewer`, `pr-maintainability-reviewer`
- Simplicity First -> `pr-change-validity-reviewer`, `pr-maintainability-reviewer`
- Reuse before adding -> `pr-maintainability-reviewer`, `pr-dependency-reviewer`
- Specification-Driven Development -> `pr-change-validity-reviewer`, `pr-spec-consistency-reviewer`, `pr-api-contract-reviewer`
- Approval Gates -> `pr-change-validity-reviewer`, `pr-architecture-reviewer`, `pr-security-reviewer`
- Read before edit -> `pr-change-validity-reviewer`, `pr-historical-risk-reviewer`, `pr-architecture-reviewer`
- No Shortcuts / root cause first -> `pr-correctness-reviewer`, `pr-error-handling-reviewer`, `pr-maintainability-reviewer`
- Do not add impossible error handling -> `pr-error-handling-reviewer`, `pr-maintainability-reviewer`
- Default to writing no comments -> `pr-maintainability-reviewer`, `pr-docs-reviewer`
- No backwards-compatibility hacks -> `pr-backward-compatibility-reviewer`, `pr-api-contract-reviewer`, `pr-maintainability-reviewer`

## Execution policy

Do not always invoke every agent. The candidate table in `skills/review-orchestration/SKILL.md` is just a sample; the actual agents to invoke are decided by the main agent based on the PR purpose, diff, CI/test results, docs/tests/code consistency, git history, existing comments, user instructions, and provider constraints.

In principle, at most 6 agents. Only high-risk PRs may use up to 8 agents.

## Comment authority

Each PR review agent posts only comments validated under its own perspective via the `create-pr-comment` skill.

The main agent must not duplicate individual findings as posts; it posts only the final summary comment.

`pr-review-meta-reviewer` does not post PR comments directly.

## Dynamic context and meta review

For PR review, the main agent obtains `ci_results`, `historical_context`, and `spec_consistency_context` and then passes them to each agent. When acquisition fails, do not record `unknown`; instead record the failure reason and its impact on the decision.

`pr-review-meta-reviewer` internally reviews the main agent's agent selection, skip rationale, and summary draft. If `blocking_before_summary: true` is returned, the main agent re-orchestrates at most once.

## Review system guardrails

Adding, removing, or renaming agents, adding cross-cutting capabilities, and judging symmetry between PR-side and implementation-time-side use the repository-root `REVIEW_SYSTEM_GUARDRAILS.md` as the sole source of truth.

## Large PRs, deletions, renames

For large PRs, do not blindly delegate to all agents. Prioritize high-risk areas and explicitly state the review scope and the unverified areas.

For deletions and renames, check residual callers, follow-through in import/docs/tests/config, dead dependencies, and impact on the public contract.
