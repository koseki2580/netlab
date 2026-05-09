---
name: review-dynamic-validation
description: Used during PR reviews or implementation-time reviews when you want to produce evidence by running locally available verification commands, not only by reading CI results
---

# Review Dynamic Validation

## Purpose

Pass real validation results into the review context, not only static review.

This Skill makes CLAUDE.md's **Validation Before Completion** and **Tests Are Required** executable on the review side.

## Principles

- Prefer safe read-only / local validation.
- Never execute infrastructure mutation.
- Do not hide failed validations.
- When validation could not run, still record `attempted` / `reason` / `impact`.
- Choose heavy tests based on PR risk and time budget.
- This is review-purpose validation; do not start fixing on your own.

## Prohibited

Must not execute:

- `terraform apply`
- `kubectl apply`
- production database migration
- deploy / release command
- destructive cleanup command
- credentials or secret exfiltration

## Input

```yaml
validation_request:
  mode: pr_review | implementation_review
  changed_files: []
  risk_flags: []
  project_rules: {}
  known_commands:
    test: []
    lint: []
    typecheck: []
    coverage: []
  time_budget: small | medium | large
```

## Command selection

Priority order:

1. The minimum tests for the changed files.
2. Reproduction tests for bug fixes.
3. Contract or integration tests related to public API / contract / migration.
4. lint/typecheck.
5. Coverage when changed-line coverage is obtainable.
6. Broader suite for high-risk PRs when time permits.

## Output

```yaml
dynamic_validation:
  attempted: true | false
  commands_run:
    - command: <command>
      result: success | failure | timeout | skipped
      summary: <short output summary>
  ci_results_update:
    overall_status: success | failure | pending | skipped | unknown
    test_status: success | failure | pending | skipped | unknown
    coverage:
      available: true | false
      changed_lines_covered: <number | unknown>
  missing_context:
    - field: dynamic_validation
      reason: <why not executed>
      impact: <review impact>
  risk_flags:
    - validation_failed
    - validation_unknown
    - coverage_low
```

## Comment policy

This Skill itself does not post PR comments.

When a PR comment is needed, pass the result to `pr-dynamic-validation-reviewer` or `pr-test-reviewer` and post via `create-pr-comment`.
