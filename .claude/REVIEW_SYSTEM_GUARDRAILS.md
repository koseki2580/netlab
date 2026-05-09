# Review System Guardrails

This document defines the guardrails that keep structural consistency when extending review Agents/Skills. Treat them as continuous operating principles, not as specific evaluation points or version names.

## 1. Symmetry Principle

PR review and implementation-time review have different purposes, so their Agents and outputs are kept separate. However, orchestration capabilities should be kept symmetric as much as possible.

When you add a new capability on one side, in the same change you must decide one of the following:

- Add an equivalent capability on the other side.
- Document why it is PR-only.
- Document why it is implementation-time-only.

Implicit one-sided additions are forbidden.

Capabilities that are normally mirrored:

- project rule ingestion
- dynamic context acquisition
- dynamic validation evidence
- risk flag aggregation
- meta-review feedback loop
- large change handling
- deleted/renamed file handling
- learning-loop feedback
- interactive follow-up handling

## 2. Main Agent Accountability

The main agent must not silently skip context collection or specialist agent selection. For each review run, at minimum the following must be retained as internal state:

```yaml
orchestration_accountability:
  selected_agents:
    - agent: <name>
      reason: <why selected>
  skipped_agents:
    - agent: <name>
      reason: <why skipped>
  context_acquisition:
    ci_results:  # PR review when available
      attempted: true | false
      reason_if_not_attempted: <reason | null>
    tests:  # implementation/local validation when available
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

`orchestration_accountability` is the minimum canonical form. Each Skill may omit context keys that do not apply, but when required context is not acquired, it must record `attempted: false` together with a reason. If `attempted: false` appears for context required for risk judgment, it becomes a meta-review target.

## 3. No Silent Unknowns

`unknown` is allowed. However, the reason and the impact on judgment must always be recorded.

Bad:

```yaml
ci_results:
  overall_status: unknown
```

Good:

```yaml
ci_results:
  attempted: true
  overall_status: unknown
missing_context:
  - field: ci_results
    reason: gh CLI is unavailable in this environment
    impact: cannot verify Validation Before Completion; merge readiness remains unknown
```

## 4. Mature Review Capability Set

A mature review system must be able to handle at least the following:

- broad specialist coverage
- project rule ingestion
- dynamic validation evidence
- CI/test/coverage context
- historical risk context
- docs/tests/code consistency
- risk aggregation
- meta-review of orchestration decisions
- learning loop from accepted/dismissed comments
- interactive follow-up after author or implementer responses
- provider-independent comment creation
- explicit handling for large changes, deleted files, and renamed files

### Capability Mapping

| Capability                                     | Primary implementation                                                                                            | Notes                                                                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| broad specialist coverage                      | `agents/pr-review/`, `agents/implementation-review/`, `COVERAGE.md`                                               | Check that every active Agent appears in the relevant README and coverage matrix/agent list; no capability should live only in an add-on section. |
| project rule ingestion                         | `skills/review-orchestration/SKILL.md`, `skills/implementation-review-orchestration/SKILL.md`                     | Verify orchestration Skills expose project_rules and route them to the Agents that enforce them, not only through team references.                |
| dynamic validation evidence                    | `skills/review-dynamic-validation/SKILL.md`, `pr-dynamic-validation-reviewer`, `impl-dynamic-validation-reviewer` | Verify each review records executed commands/CI evidence or a missing_context entry explaining why validation was not attempted.                  |
| CI/test/coverage context                       | Orchestration input collection, `pr-test-reviewer`, dynamic validation reviewers                                  | If CI/test/coverage is unknown, verify `missing_context` includes reason and impact on merge/readiness.                                           |
| historical risk context                        | `pr-historical-risk-reviewer`, implementation orchestration historical context                                    | For hotspot or regression-sensitive files, verify history acquisition was attempted or explicitly skipped with a reason.                          |
| docs/tests/code consistency                    | `pr-spec-consistency-reviewer`, `impl-spec-consistency-reviewer`                                                  | When docs/specs or public behavior change, verify tests and code were checked together, not by isolated Agents only.                              |
| risk aggregation                               | `summary-format.md`, orchestration Skills                                                                         | Verify repeated or combined risk_flags are reflected in overall risk, can_proceed, or merge_readiness.                                            |
| meta-review of orchestration decisions         | `pr-review-meta-reviewer`, `impl-review-meta-reviewer`                                                            | Verify meta-review can challenge missing specialists, weak skip reasons, and unresolved unknowns before final summary.                            |
| learning loop from accepted/dismissed comments | `skills/review-learning-loop/SKILL.md`, `learning_signal` fields                                                  | Verify learning records capture reusable lessons and outcome signals without personal or emotional data.                                          |
| interactive follow-up                          | `interactive-review-dialogue`, `pr-interactive-followup-reviewer`, `impl-interactive-followup-reviewer`           | Verify follow-up responses can keep, soften, withdraw, clarify, or escalate prior findings without duplicating threads.                           |
| provider-independent comment creation          | `skills/create-pr-comment/SKILL.md`, `github.md`, `bitbucket.md`                                                  | Verify provider-specific payload logic stays in create-pr-comment, not in specialist reviewers.                                                   |
| large change / deleted / renamed handling      | Orchestration Skills, architecture/dependency/spec reviewers                                                      | Verify large/deleted/renamed changes trigger focused sampling, caller/import checks, and explicit unverified scope.                               |

## 5. One-sided Capability Exception

Examples that may be one-sided:

- PR comment posting and provider-specific payload: PR-review only.
- Updating in-progress next actions, handling unfinished TODOs: implementation-time review only.

Even when treated as exceptions, you must check whether a corresponding concept exists on the other side. Example: against PR-side author reply follow-up, the implementation-time side has implementer explanation follow-up.

## 6. Documentation Consistency Rule

When you add, remove, or rename an Agent, update the following in the same change:

- relevant README
- coverage matrix or agent list
- orchestration candidate list
- reviewer contract / perspective boundaries
- meta-review and symmetry rules if the capability is cross-cutting

Do not leave them in an after-the-fact add-on section; integrate them into the regular lists.


## 7. Terminology and Identifier Consistency

English wording and machine-readable identifiers must remain symmetric across PR review and implementation-time review. When translating or renaming, update both sides in the same change.

Canonical project-rule labels:

- `Docs–tests consistency`
- `Don't add error handling for impossible scenarios`
- `No Shortcuts / root cause first`

Canonical shared risk flags include:

- `public_api_changed`
- `migration_required`
- `validation_unknown`

Do not create side-specific synonyms for the same concept unless the distinction is explicitly documented in the same section that defines the risk flag.
