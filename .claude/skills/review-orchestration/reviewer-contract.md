# PR Reviewer Contract

All PR review agents receive input and return values according to this contract.

## Purpose

Defines the common contract that PR review subagents follow. It is separate from the implementation-time review contract; the purpose is merge readiness, public review comments, and final PR risk assessment.

## Basic Principles

- Review the submitted PR as a finished change candidate, not as in-progress scratch work.
- Stay inside the assigned review perspective and avoid duplicating other agents' comments.
- Use `create-pr-comment` for actual PR comments.
- Return both posted comments and important non-posted findings.
- Use dynamic validation, learning context, and interactive context when available, but do not require them for basic operation.
- When CLAUDE.md or equivalent `project_rules` are passed, use them directly as review criteria.

## Input Contract

```yaml
review_context:
  orchestration_id: <unique ID>
  pr_number: <PR number>
  pr_title: <PR title>
  pr_description: <PR description>
  provider: github | bitbucket-cloud | bitbucket-data-center | unknown
  remote_url: <git remote URL>
  base_sha: <base SHA>
  head_sha: <head SHA>

  changed_files:
    - path: <file>
      status: added | modified | deleted | renamed
      language: <language>
      is_generated: true | false | unknown

  diff: <diff passed to this agent>
  existing_comments:
    - provider: github | bitbucket-cloud | bitbucket-data-center | unknown
      author: <author>
      file: <file | null>
      line: <line | null>
      body_summary: <summary>

  comment_provider:
    provider: github | bitbucket-cloud | bitbucket-data-center | unknown
    remote_name: origin
    remote_url: <git remote URL>
    rule_file: skills/create-pr-comment/github.md | skills/create-pr-comment/bitbucket.md

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
    failed_jobs:
      - name: <job>
        url: <url>
        summary: <failure summary>
    coverage:
      available: true | false
      changed_lines_covered: <number | unknown>
      summary: <coverage summary>

  spec_consistency_context:
    docs_changed: true | false | unknown
    specs_changed: true | false | unknown
    tests_changed: true | false | unknown
    code_changed: true | false | unknown
    public_api_changed: true | false | unknown
    data_model_changed: true | false | unknown
    security_boundary_changed: true | false | unknown
    operational_behavior_changed: true | false | unknown
    docs_index_changed: true | false | unknown

  historical_context:
    available: true | false
    lookback_days: <number>
    files:
      - path: <file>
        change_count: <number | unknown>
        bugfix_count: <number | unknown>
        revert_count: <number | unknown>
        last_changed_at: <date | unknown>
        recent_incidents:
          - summary: <incident/hotfix/revert summary>
        risky_lines:
          - line: <line>
            reason: <why risky>

  dynamic_validation:
    attempted: true | false
    commands_run:
      - command: <command>
        result: success | failure | timeout | skipped
        summary: <short summary>
    reason_if_not_attempted: <reason | null>

  learning_context:
    prior_comment_outcomes_available: true | false
    agent_false_positive_notes:
      - agent: <agent>
        pattern: <false positive pattern>
    accepted_reference_matches:
      - reference_id: <id>

  interactive_context:
    author_replies_available: true | false
    threads:
      - comment_id: <id>
        author_reply_summary: <summary>
        requires_re_evaluation: true | false

review_scope:
  focus: <agent name>
  files:
    - <file>
  related_context_to_read:
    - path: <file>
      reason: <why this file may matter>
  out_of_scope:
    - <topic this agent should not review>
```

## Required Agent Behavior

Each agent must:

1. Review only its assigned perspective.
2. Read related context when needed for correctness of its own perspective.
3. Avoid posting low-confidence comments.
4. Avoid duplicate comments by checking `existing_comments`.
5. Use `create-pr-comment` for actual PR comments.
6. Return both posted comments and important non-posted findings.
7. Record related files read and missing context.

## Output Contract

```yaml
agent: <agent name>
status: no_findings | commented | skipped | failed
scope:
  files:
    - <reviewed file>
summary: >
  <What was checked and what was posted. 1-3 sentences.>
comments:
  - id: <agent-local id>
    type: request-changes | better | suggestion | question | comment | praise
    severity: critical | important | minor | nit
    confidence: high | medium | low
    blocking: true | false
    scope: inline | function | file | summary
    location:
      file: <file | null>
      line: <line | null>
      end_line: <line | null>
      symbol: <function/class/api | null>
    provider: github | bitbucket-cloud | bitbucket-data-center | unknown
    commented: true | false
    comment_url: <url | null>
    comment_summary: <one-sentence summary of the posted comment>
    reason_if_not_commented: <null | low_confidence | duplicate | provider_limitation | not_actionable>
findings_not_commented:
  - reason: low_confidence | out_of_scope | duplicate | provider_limitation | not_actionable | missing_context
    severity: critical | important | minor | nit
    summary: <reason for not posting and the content>
related_context_read:
  - path: <file>
    reason: <why read>
missing_context:
  - description: <missing context>
    impact: <impact on judgment>
risk_flags:
  - <risk discovered by this agent>
learning_signal:
  reference_candidate: true | false
  false_positive_risk: low | medium | high
  expected_outcome: accepted | debated | likely_dismissed | unknown
```

## Perspective Boundaries

| Agent | Should Review | Should Not Review |
|---|---|---|
| pr-correctness-reviewer | logic correctness, edge behavior | missing tests unless correctness depends on it |
| pr-test-reviewer | required tests, bugfix TDD, CI/test status | implementation style |
| pr-docs-reviewer | docs quality and completeness | test assertions |
| pr-spec-consistency-reviewer | docs/tests/code mismatch | prose style |
| pr-change-validity-reviewer | scope, surgical changes, approval gates | line-level algorithm choice |
| pr-maintainability-reviewer | reuse, simplicity, local maintainability | module-level architecture |
| pr-architecture-reviewer | module boundaries, dependency direction, domain leaks | local naming preference |
| pr-security-reviewer | auth, trust boundaries, secrets | generic error style |
| pr-performance-reviewer | measured or plausible runtime/resource risk | algorithm pedagogy without performance relevance |
| pr-algorithm-data-structure-reviewer | complexity, data structures, known algorithms | DB/I/O performance alone |
| pr-backward-compatibility-reviewer | existing clients/data/contracts | docs wording |
| pr-api-contract-reviewer | public schema/API contract | internal helper style |
| pr-error-handling-reviewer | failure modes, propagation, recovery | observability except as error diagnosability |
| pr-observability-reviewer | logs, metrics, traces, alerts | logging secrets/security details beyond flagging |
| pr-dependency-reviewer | new/updated dependencies | local code reuse unless dependency-related |
| pr-concurrency-reviewer | races, locks, shared state, async ordering | general correctness unrelated to concurrency |
| pr-migration-safety-reviewer | schema/data migration safety | normal API compatibility |
| pr-config-deployment-reviewer | env/config/deploy/rollback | application algorithm choice |
| pr-accessibility-reviewer | a11y for UI changes | visual design taste |
| pr-i18n-reviewer | locale/timezone/text extraction | translation quality itself |
| pr-historical-risk-reviewer | git history/hotspot/revert risk | risk without historical evidence |
| pr-dynamic-validation-reviewer | CI/test/coverage/local validation evidence | static test design alone |
| pr-interactive-followup-reviewer | author replies and whether to keep/soften/withdraw comments | fresh full PR review |
| pr-review-meta-reviewer | review plan and summary quality | code-level comments |
| pr-team-lead-reference-reviewer | active review references | stale or inapplicable preferences |

## Low Confidence Rule

`confidence: low` findings must not be posted as PR comments. They may be returned in `findings_not_commented`.

## Duplicate Rule

If an existing comment already covers the same actionable issue, do not post another comment. Return it as `duplicate` if relevant.

## Missing Context Rule

If the agent cannot judge without missing information:

- Do not invent facts.
- Return `missing_context`.
- Use `question` only if the answer is necessary for merge safety.
- Otherwise leave it for the final summary as unverified risk.

## Dynamic Context Acquisition Responsibility

The main agent must attempt to acquire the following to the extent possible before passing them to subagents.

```yaml
ci_results:
  source: github | bitbucket | local | none | unknown
  attempted: true | false
  overall_status: success | failure | pending | skipped | unknown
  test_status: success | failure | pending | skipped | unknown
  failed_jobs:
    - name: <job>
      url: <url>
      summary: <failure summary>
  coverage:
    available: true | false
    changed_lines_covered: <number | unknown>

historical_context:
  attempted: true | false
  commands_used:
    - <git log/blame/etc>
  hotspot_files:
    - path: <file>
      reason: <recent changes/reverts/hotfixes>
  recent_reverts:
    - <commit or summary>

missing_context:
  - field: ci_results | historical_context | spec_consistency_context
    reason: <reason it could not be acquired>
    impact: <impact on review judgment>
```

When `attempted: false` is left as `unknown`, it becomes a meta-review target.

## changed_files status handling

`changed_files` must include status.

```yaml
changed_files:
  - path: <file>
    previous_path: <path before rename, optional>
    status: added | modified | deleted | renamed | copied | unknown
    additions: <number | unknown>
    deletions: <number | unknown>
```

For `deleted` / `renamed`, explicitly check remaining callers, docs/tests/config/import follow-up, and impact on the public contract.
