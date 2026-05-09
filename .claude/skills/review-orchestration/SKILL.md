---
name: review-orchestration
description: Used when the main agent for PR review selects and runs PR review agents, then aggregates each agent's posted-comment summary into a final summary comment.
---

# PR Review Orchestration

## Principles

This Skill is used by the **main agent for PR review**.

Detailed review is performed by subagents. The main agent is responsible only for understanding the review target, selecting agents, distributing context, aggregating results, deciding overall risk, and posting the final summary comment.

This Skill is not a fixed execution table. The tables and patterns are **candidate examples**; the agents that are actually invoked are decided by the main agent based on the PR's purpose, diff, risk, CI, history, existing comments, and user instructions.

## Overview

```text
Main Agent
  -> review-orchestration Skill
  -> classify PR, risks, provider, project rules
  -> select PR review subagents
      -> each subagent uses create-pr-comment Skill
      -> each subagent posts its own PR comments
      -> each subagent returns posted-comment summary
  -> aggregate and reconcile subagent results
  -> optionally run pr-review-meta-reviewer
  -> Main Agent posts one final summary comment
```

## Input Collection

This section and `Dynamic Context Acquisition Responsibility` together form the single source of truth for PR review input collection. Keep the schema here and the acquisition procedure in the dynamic context section; do not add separate after-the-fact input sections.

```yaml
review_context:
  pr_number: <PR number>
  pr_title: <PR title>
  pr_description: <PR description>
  provider: github | bitbucket-cloud | bitbucket-data-center | unknown
  remote_url: <git remote URL>
  base_sha: <base SHA>
  head_sha: <head SHA>
  changed_files: <list of changed files>
  diff: <whole PR or per-agent diff>
  existing_comments: <summary of existing comments>
  project_rules:
    source: CLAUDE.md | repository docs | user instruction | unknown
    tests_required: true | false | unknown
    bugfix_requires_failing_test_first: true | false | unknown
    docs_tests_consistency_required: true | false | unknown
    validation_before_completion_required: true | false | unknown
    surgical_changes: true | false | unknown
    simplicity_first: true | false | unknown
    reuse_before_adding: true | false | unknown
    specification_driven_development: true | false | unknown
    approval_gates_required: true | false | unknown
    read_before_edit: true | false | unknown
    no_shortcuts: true | false | unknown
    no_impossible_error_handling: true | false | unknown
    default_to_no_comments: true | false | unknown
    no_backward_compatibility_hacks: true | false | unknown
  ci_results:
    overall_status: success | failure | pending | skipped | unknown
    test_status: success | failure | pending | skipped | unknown
    failed_jobs: []
    coverage:
      available: true | false
      changed_lines_covered: <number | unknown>
  spec_consistency_context:
    docs_changed: true | false | unknown
    specs_changed: true | false | unknown
    tests_changed: true | false | unknown
    code_changed: true | false | unknown
    public_api_changed: true | false | unknown
    data_model_changed: true | false | unknown
    security_boundary_changed: true | false | unknown
    operational_behavior_changed: true | false | unknown
  historical_context:
    available: true | false
    lookback_days: 180
    files: []
```

Treat missing information as `unknown`. Do not make forced assertions in comments based on `unknown`. However, when CI/test results are required for a high-risk PR and they are unknown, include them in the final summary's "Unverified Risks".

## Provider Context

```yaml
comment_provider:
  provider: github | bitbucket-cloud | bitbucket-data-center | unknown
  remote_name: origin
  remote_url: <git remote URL>
  rule_file: skills/create-pr-comment/github.md | skills/create-pr-comment/bitbucket.md
```

The actual posting API, payload, and fallback decisions are delegated to the `create-pr-comment` Skill.

## How to Choose Agents

### Change types

Multiple classifications are allowed.

- docs_only
- tests_only
- normal_feature
- bug_fix
- public_api
- auth_security
- performance_sensitive
- algorithmic_data_processing
- dependency
- error_handling
- observability
- concurrency
- migration
- config_deployment
- ui_accessibility
- i18n
- architecture
- spec_consistency
- historical_risk

### Risk flags

```yaml
risk_flags:
  - public_api_changed
  - data_model_changed
  - security_boundary_changed
  - migration_required
  - ci_failed
  - tests_missing
  - docs_tests_code_mismatch
  - hotspot_file_changed
  - broad_scope_change
  - new_dependency_added
  - concurrency_shared_state
  - deployment_config_changed
  - bugfix_without_reproduction_test
  - validation_failed
  - validation_unknown
  - architectural_boundary_shift
```

### Candidate agents

This table is not a fixed rule.

| Change type | Candidate agents |
|---|---|
| docs_only | `pr-docs-reviewer`, `pr-spec-consistency-reviewer`, `pr-change-validity-reviewer` |
| tests_only | `pr-test-reviewer`, `pr-change-validity-reviewer` |
| normal_feature | `pr-change-validity-reviewer`, `pr-correctness-reviewer`, `pr-test-reviewer`, `pr-maintainability-reviewer` |
| bug_fix | `pr-change-validity-reviewer`, `pr-correctness-reviewer`, `pr-test-reviewer`, `pr-historical-risk-reviewer` |
| public_api | `pr-api-contract-reviewer`, `pr-backward-compatibility-reviewer`, `pr-spec-consistency-reviewer`, `pr-docs-reviewer`, `pr-test-reviewer` |
| auth_security | `pr-security-reviewer`, `pr-architecture-reviewer`, `pr-correctness-reviewer`, `pr-test-reviewer`, `pr-error-handling-reviewer` |
| performance_sensitive | `pr-performance-reviewer`, `pr-algorithm-data-structure-reviewer`, `pr-correctness-reviewer`, `pr-test-reviewer`, `pr-observability-reviewer` |
| algorithmic_data_processing | `pr-algorithm-data-structure-reviewer`, `pr-correctness-reviewer`, `pr-test-reviewer`, `pr-performance-reviewer` |
| dependency | `pr-dependency-reviewer`, `pr-security-reviewer`, `pr-backward-compatibility-reviewer`, `pr-maintainability-reviewer` |
| error_handling | `pr-error-handling-reviewer`, `pr-correctness-reviewer`, `pr-test-reviewer`, `pr-observability-reviewer` |
| observability | `pr-observability-reviewer`, `pr-security-reviewer`, `pr-change-validity-reviewer` |
| concurrency | `pr-concurrency-reviewer`, `pr-correctness-reviewer`, `pr-test-reviewer`, `pr-error-handling-reviewer` |
| migration | `pr-migration-safety-reviewer`, `pr-backward-compatibility-reviewer`, `pr-test-reviewer`, `pr-config-deployment-reviewer`, `pr-historical-risk-reviewer` |
| config_deployment | `pr-config-deployment-reviewer`, `pr-error-handling-reviewer`, `pr-observability-reviewer` |
| ui_accessibility | `pr-accessibility-reviewer`, `pr-correctness-reviewer`, `pr-test-reviewer` |
| i18n | `pr-i18n-reviewer`, `pr-docs-reviewer`, `pr-test-reviewer` |
| architecture | `pr-architecture-reviewer`, `pr-change-validity-reviewer`, `pr-maintainability-reviewer` |
| spec_consistency | `pr-spec-consistency-reviewer`, `pr-docs-reviewer`, `pr-test-reviewer`, `pr-api-contract-reviewer` |
| historical_risk | `pr-historical-risk-reviewer`, `pr-test-reviewer`, `pr-correctness-reviewer` |

The default upper bound is 6 agents. Only for high-risk PRs (migration / public API / security / architecture / CI failure, etc.) is up to 8 agents allowed.

## Direct Wiring of CLAUDE.md Rules

When CLAUDE.md or equivalent project rules are available, do not offload them to a team-lead reference; pass them directly to the relevant agents as `project_rules`.

| Rule | Agents to pass to | Purpose |
|---|---|---|
| Tests Are Required | `pr-test-reviewer`, `pr-spec-consistency-reviewer` | Whether new features / spec changes have tests |
| Bug fixes follow TDD | `pr-test-reviewer`, `pr-historical-risk-reviewer` | Whether the bug fix has a reproduction test |
| Docs–tests consistency | `pr-spec-consistency-reviewer`, `pr-test-reviewer`, `pr-docs-reviewer` | Whether docs/tests/code are consistent |
| Validation Before Completion | `pr-test-reviewer`, `pr-review-meta-reviewer` | Whether CI/test results are confirmed |
| Surgical Changes | `pr-change-validity-reviewer`, `pr-maintainability-reviewer` | Whether out-of-scope changes are mixed in |
| Simplicity First | `pr-change-validity-reviewer`, `pr-maintainability-reviewer`, `pr-algorithm-data-structure-reviewer` | Whether over-engineering is avoided |
| Reuse before adding | `pr-maintainability-reviewer`, `pr-dependency-reviewer` | Whether existing implementations or standard libraries are reused |
| Specification-Driven Development | `pr-change-validity-reviewer`, `pr-spec-consistency-reviewer`, `pr-api-contract-reviewer` | Whether spec updates and implementation are consistent |
| Approval Gates | `pr-change-validity-reviewer`, `pr-architecture-reviewer`, `pr-security-reviewer` | Detect changes that require approval |
| Read before edit | `pr-change-validity-reviewer`, `pr-historical-risk-reviewer`, `pr-architecture-reviewer` | Whether changes were made without reading direct callers / existing tests |
| Don't add error handling for impossible scenarios | `pr-error-handling-reviewer`, `pr-maintainability-reviewer` | Whether unnecessary defensive code or unreachable branches were added |
| Default to writing no comments | `pr-maintainability-reviewer`, `pr-docs-reviewer` | Whether the explanation is given through naming/structure rather than obvious comments |
| No backwards-compatibility hacks | `pr-backward-compatibility-reviewer`, `pr-api-contract-reviewer`, `pr-maintainability-reviewer` | Whether leftovers like `_old`, `_legacy`, `// removed` fake compatibility |
| No Shortcuts / root cause first | `pr-correctness-reviewer`, `pr-error-handling-reviewer`, `pr-maintainability-reviewer` | Whether the root cause is fixed instead of hiding the symptom |

## Aggregation Phase

The main agent must not simply tally each agent's return values by count.

### Duplicate consolidation

When the same kind of comment is made on the same file/line/symbol, treat it as a single point in the final summary.

### Concentrated risk decision

When two or more agents return `blocking: true` on the same file, function, or API, surface it under "Concentrated Risks" in the final summary.

### Reconciliation of cross-perspective tradeoffs

When the following kinds of conflicts exist, the main agent reconciles them in the final summary.

- performance improvement vs simplicity loss
- algorithm improvement vs maintainability loss
- backward compatibility preservation vs API cleanup
- security strengthening vs user-facing behavior change
- observability addition vs secret-leak risk

Reconciliation policy:

1. Prioritize safety, correctness, and data protection.
2. Then prioritize public contracts and backward compatibility.
3. Treat performance improvements strongly only when there is evidence of input scale, hot path, or SLO.
4. When over-engineering is a concern, propose a phased improvement plan.

### Overall risk decision

```yaml
overall_risk: low | medium | high | critical
merge_readiness: ready | needs_changes | blocked | unknown
risk_reasons:
  - <why this risk>
```

- critical: there is a critical blocking, security/data loss/irreversible migration/CI-related failure.
- high: multiple blockings are concentrated, or there are unresolved request-changes on public API or migration.
- medium: no blockings, but multiple better/unverified risks exist.
- low: mostly no_findings and CI/tests pass.

### Unverified risks

Items that could not be judged due to missing CI/test/historical/spec information go into `unverified_risks`.

## Main Agent Self-Check

The main agent uses `orchestration_accountability` from `REVIEW_SYSTEM_GUARDRAILS.md` as the canonical self-check format. Do not use a simplified boolean-only form; record which agent was selected and why, why others were skipped, and which context acquisitions were attempted.

```yaml
orchestration_accountability:
  selected_agents:
    - agent: <name>
      reason: <why selected>
  skipped_agents:
    - agent: <name>
      reason: <why skipped>
  context_acquisition:
    ci_results:
      attempted: true | false
      reason_if_not_attempted: <reason | null>
    tests:
      attempted: true | false
      reason_if_not_attempted: <reason | null>
    historical_context:
      attempted: true | false
      reason_if_not_attempted: <reason | null>
    spec_consistency_context:
      attempted: true | false
      reason_if_not_attempted: <reason | null>
    validation_execution:
      attempted: true | false
      reason_if_not_attempted: <reason | null>
  quality_checks:
    docs_tests_code_consistency_checked_when_needed: true | false
    high_risk_changes_have_specialist_review: true | false
    duplicate_comments_deduped_in_summary: true | false
    tradeoffs_reconciled: true | false
  symmetry_check:
    one_sided_capabilities:
      - capability: <name>
        reason: <why acceptable or needs follow-up>
```

## Conditions for Calling pr-review-meta-reviewer

When any of the following applies, internally call `pr-review-meta-reviewer` if possible.

- selected_agents exceeds 6
- many skipped_agents, or skip reasons feel weak
- includes any of public API / security / migration / architecture
- reviewing a high-risk PR while CI failed or remained unknown
- multiple agents output blocking on the same location
- there is uncertainty about the overall risk decision in the final summary

`pr-review-meta-reviewer` does not post PR comments directly. It is used only to adjust the main agent's draft final summary.

## Final Summary Comment

The main agent posts exactly one summary comment on the PR following `summary-format.md`.

## Dynamic Context Acquisition Responsibility

`ci_results` / `historical_context` / `spec_consistency_context` are not merely optional inputs. The main agent is responsible for attempting to acquire them before review.

### GitHub example

- Use `git remote -v` to infer the provider.
- For GitHub, when possible check `gh pr checks` / `gh pr view --json statusCheckRollup` / CI URLs and fill in `ci_results`.
- When the target PR number is unknown, infer it from the branch name, remote, or user input. If it cannot be inferred, mark as `unknown` and record the reason.

### Bitbucket example

- For Bitbucket Cloud / Data Center, check build status via the available CLI/API or the PR screen information.
- If no API is available, mark as `unknown`, but do not pretend you did not attempt acquisition.

### Git history example

- For important files, check recent change tendencies with the equivalent of `git log --follow -- <file>`.
- As needed, check `git blame` / revert commits / hotfix commits.
- Do not run heavy operations against all files. Prioritize public API, migration, config, suspected hotspots, and previously broken areas.

### Handling unknown

`unknown` is allowed, but the following must always be recorded:

```yaml
missing_context:
  - field: ci_results
    reason: gh/Bitbucket CLI is unavailable, or the PR number cannot be identified
    impact: cannot verify Validation Before Completion, so merge_readiness leans toward unknown
```

When `ci_results: unknown` remains for a high-risk PR, it must be included in the final summary's `Unverified Risks`.

## Handling Large PRs, Deletions, and Renames

### Large PRs

Even when the diff is large, do not dump everything onto all agents. The main agent first splits the PR in a risk-oriented way.

Guidelines:

- diff > 1000 lines, or changed files > 25: treat as a large PR.
- Classify public API / migration / security / config / architecture / generated files first.
- Treat generated / lockfile / snapshot separately as needed.
- When a full review is not possible, do not sample — read the highest-risk paths first.
- When there are multiple change purposes, ask `pr-change-validity-reviewer` to consider splitting the PR.

### deleted / renamed files

When `changed_files.status` is `deleted` or `renamed`, check the following:

- Whether there are remaining callers of deleted symbols.
- Whether import paths / docs / tests / configs follow the renamed file.
- Whether deletions left dependencies, configs, routes, migrations, or scheduled jobs orphaned.
- Whether something that looks delete-only has actually changed public API or operational behavior.

As needed, treat `pr-architecture-reviewer`, `pr-backward-compatibility-reviewer`, `pr-spec-consistency-reviewer`, and `pr-dependency-reviewer` as candidates.

## Dynamic Validation Execution

Dynamic validation is a first-class review cycle component, not an after-the-fact extension. Use it when runtime evidence materially affects merge readiness.



When PR risk is medium or higher, or when CLAUDE.md's Validation Before Completion is in effect, the main agent considers using the `review-dynamic-validation` Skill.

Execution candidates:

- minimal tests corresponding to the changed files
- reproduction tests for bug fixes
- tests related to public API / migration / security / config
- lint / typecheck
- changed-line coverage

Integrate execution results into `ci_results` and `dynamic_validation`, and pass them to `pr-test-reviewer` and `pr-dynamic-validation-reviewer`.

When execution is not possible:

```yaml
missing_context:
  - field: dynamic_validation
    reason: <unknown command, no dependent service, time constraint, no permission, etc.>
    impact: <impact on merge_readiness>
```

## Learning Loop

After PR comments are posted, when the outcome of a comment is known, pass it to the `review-learning-loop` Skill.

Learning targets:

- resolved / accepted comments
- dismissed / false positive comments
- comments withdrawn after author reply
- comments that were duplicates

Reflect learning results in:

- candidate/active references in `review-references/team-lead/references.yaml`
- false positive examples for each agent
- severity thresholds
- the use of comment taxonomy

## Interactive Review

When the PR author replies to a comment, use the `interactive-review-dialogue` Skill and `pr-interactive-followup-reviewer` as needed.

Decision after reply:

- keep: maintain the finding
- soften: weaken from request-changes to Better/question
- withdraw: retract
- clarify: add explanation
- escalate: raise importance based on new facts

Replies that merely repeat the same claim are forbidden. When the rationale changes, also update the comment type.

## PR-side risk_flags Aggregation Rules

Symmetric to the implementation-time side, score risk_flags on the PR side as well.

- When two or more agents return the same risk_flag, surface it in the final summary's Risk Flags.
- When three or more agents return the same risk_flag, treat it as a candidate for raising `overall_risk` by one step.
- `tests_missing` + `bugfix_without_reproduction_test`: for a bug fix, at least `merge_readiness: needs_changes`.
- `hotspot_file_changed` + `tests_missing`: at least `overall_risk: high`.
- `docs_tests_code_mismatch` + `public_api_changed`: treat the result of `pr-spec-consistency-reviewer` as a concentrated risk.
- `validation_failed`: in principle `merge_readiness: blocked` if PR-induced.
- `validation_unknown` + high-risk change: `merge_readiness: unknown` or `needs_changes`.
- `architectural_boundary_shift` + `broad_scope_change`: consider PR splitting or insufficient architecture review.

## pr-review-meta-reviewer Feedback Loop

When `pr-review-meta-reviewer` returns `blocking_before_summary: true`:

1. Check `missing_agents`.
2. Run additional agents that can be added at most once.
3. For agents not added, record reasons in `agents_skipped`.
4. If there are `context_gaps`, refill `ci_results`, `historical_context`, `dynamic_validation`, and `spec_consistency_context` to the extent possible.
5. A second meta-reviewer call is forbidden. Avoid infinite loops.
6. Surface unresolved items in `Unverified Risks`.

```yaml
meta_review_loop:
  max_iterations: 1
  performed: true | false
  missing_agents_resolved: true | false
  unresolved_items:
    - <item>
```

## Symmetry Maintenance Check

When a new capability is added on only one side (PR or implementation-time), the main agent must verify the following per `REVIEW_SYSTEM_GUARDRAILS.md`:

```yaml
symmetry_check:
  one_sided_capabilities:
    - capability: <name>
      reason: <why acceptable or needs follow-up>
```

Keep this check as part of `orchestration_accountability` and make it a target for `pr-review-meta-reviewer`.
