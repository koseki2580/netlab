# Implementation-Time Reviewer Agent Contract

## Purpose

Defines the common contract that implementation-time review subagents follow. It is separate from the PR review contract; the purpose is work support, not finished-product evaluation.

## Basic Principles

- Look at the code assuming it is in-progress.
- Return information needed for the next implementation decision rather than minor nits.
- Do not create any PR comments.
- Do not use the `create-pr-comment` Skill.
- Make it clear whether the implementer "may continue" or "should fix first".
- When CLAUDE.md or equivalent project_rules are passed, use them directly as the criterion for the relevant perspective.

## Input Contract

```yaml
implementation_context:
  task_goal: <implementation purpose>
  phase: planning | coding | testing | finishing | unknown
  current_diff: <current diff>
  changed_files:
    - path: <file>
      status: added | modified | deleted | renamed | copied | unknown
  project_rules:
    tests_required: true | false | unknown
    bugfix_requires_failing_test_first: true | false | unknown
    docs_tests_consistency_required: true | false | unknown
    validation_before_completion_required: true | false | unknown
    surgical_changes: true | false | unknown
    read_before_edit: true | false | unknown
    simplicity_first: true | false | unknown
    reuse_before_adding: true | false | unknown
    no_shortcuts: true | false | unknown
    no_impossible_error_handling: true | false | unknown
    default_to_no_comments: true | false | unknown
    no_backward_compatibility_hacks: true | false | unknown
    specification_driven_development: true | false | unknown
    approval_gates_required: true | false | unknown
  test_status:
    state: not_run | passing | failing | unknown
    failing_tests:
      - <test>
  historical_context:
    available: true | false
    hotspot_files:
      - path: <file>
        reason: <reason>
    recent_reverts:
      - <summary>
  spec_consistency_context:
    docs_changed: true | false | unknown
    tests_changed: true | false | unknown
    code_changed: true | false | unknown
    public_behavior_changed: true | false | unknown
  risk_flags:
    - <flag>
  missing_context:
    - field: <field>
      reason: <why unknown>

  dynamic_validation:
    attempted: true | false
    commands_run:
      - command: <command>
        result: success | failure | timeout | skipped
        summary: <short summary>
    reason_if_not_attempted: <reason | null>

  learning_context:
    repeated_internal_findings:
      - agent: <agent>
        pattern: <pattern>
    known_false_positive_patterns:
      - agent: <agent>
        pattern: <pattern>

  interactive_context:
    implementer_explanations:
      - summary: <explanation>
        affects_agents:
          - <agent>
review_scope:
  agent: <agent-name>
  focus: <perspective this agent looks at>
  explicit_non_goals:
    - <perspective not to look at>
```

## Priority

Feedback returned must always be ordered by priority.

1. `blocking`: must be addressed now, or the work will get stuck or go in the wrong direction
2. `important`: can be fixed while continuing, but will become a problem if forgotten
3. `next_action`: a concrete piece of work that is good to do next

Do not return low-priority nits or preferences.

## Required Return Value Format

```yaml
agent: <agent-name>
status: ok | needs_action | blocked | skipped
scope_reviewed:
  files:
    - <file checked>
  symbols:
    - <function / type checked>
summary: >
  <1-2 sentences on what was checked and what was found>
blocking_issues:
  - description: <problem description>
    location: <file:line>
    suggested_fix: <direction of the fix>
    risk_flags:
      - <flag>
important_observations:
  - description: <observation>
    location: <file:line>
    follow_up: <what to verify later>
    risk_flags:
      - <flag>
next_actions:
  - <recommended action, in priority order>
risk_flags:
  - <risk flags this agent detected>
related_context_read:
  - path: <file>
    reason: <why it was read>
missing_context:
  - description: <missing context>
    impact: <impact on the decision>
can_proceed: true | false
proceed_condition: >
  <when can_proceed=false, what must be done to continue>
learning_signal:
  reference_candidate: true | false
  false_positive_risk: low | medium | high
  expected_outcome: useful | debated | likely_discarded | unknown
```

## Meaning of status

| status | Meaning |
|---|---|
| `ok` | No problem. May continue |
| `needs_action` | There are points to address, but work can continue |
| `blocked` | There is a serious problem that must be fixed first |
| `skipped` | This perspective is not needed in the current phase |

## Additional Categories

The following categories may also be used as `category` / `focus`.

- `architecture` - module boundary, dependency direction, layering, domain leak
- `spec_consistency` - consistency of docs/spec/tests/code
- `meta_review` - check of agent selection, skip reasons, and aggregation quality
- `interactive_followup` - re-evaluation of next actions after the implementer adds explanation
- `concurrency` - concurrent processing, race condition, lock, transaction, idempotency
- `migration_safety` - DB schema, data migration, backfill, rollback, release order
- `config_deployment` - env var, feature flag, deployment, CI/CD, secret
- `accessibility` - UI accessibility, keyboard, ARIA, focus, contrast
- `i18n` - internationalization, translation keys, locale formatting, pluralization

## risk_flags

```yaml
risk_flags:
  - tests_missing
  - bugfix_without_reproduction_test
  - docs_tests_code_mismatch
  - architectural_boundary_shift
  - public_api_changed
  - broad_scope_change
  - hotspot_file_changed
  - concurrency_shared_state
  - migration_required
  - deployment_config_changed
  - validation_unknown
```

## Handling In-Progress Code

| Situation | Handling |
|---|---|
| TODOs remain | In-progress, so do not flag |
| No tests yet | If phase is coding, next_actions; if finishing, candidate for needs_action/blocking |
| Bug fix without a reproduction test plan | In principle a blocking candidate |
| Thin error handling | important during coding; can become blocking during finishing |
| Interface is in flux | Flag early during planning/coding |
| Architectural boundary is broken | Blocking candidate during planning/coding |
| docs/spec/tests/code are out of sync | Target of `impl-spec-consistency-reviewer` |
| Clear bug exists | Blocking regardless of phase |

## Prohibitions

- Do not post PR comments.
- Do not consider GitHub / Bitbucket providers.
- Do not use the tone of a finished-product review.
- Do not use PR-presupposing expressions like "before merge".
- Do not return large numbers of low priority nits.

## Additional Fields for In-Team TL Review Reference Agent

```yaml
reference_usage:
  available: true | false
  source_files:
    - review-references/team-lead/references.yaml
  matched_reference_ids:
    - tl-review-0001
  matched_topics:
    - responsibility-boundary
  skipped_reason: <reason for not referencing, if any>
```

## Additional Fields for impl-review-meta-reviewer

```yaml
missing_agents:
  - agent: <agent that should be added>
    reason: <reason>
over_included_agents:
  - agent: <agent that seems unnecessary>
    reason: <reason>
context_gaps:
  - field: <missing field>
    impact: <impact on the decision>
summary_adjustments:
  - <suggested correction to next actions or can_proceed>
blocking_before_continue: true | false
```
