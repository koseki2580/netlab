# PR Review Summary Format

The main agent aggregates subagent return values and posts exactly one final summary comment on the PR.

This summary is not just a count tally. It conveys the **overall risk, merge readiness, concentrated risks, cross-perspective tradeoffs, and unverified risks** of the entire review.

## Summary Template

```markdown
## Review Summary

**Overall risk:** `<low | medium | high | critical>`  
**Merge readiness:** `<ready | needs_changes | blocked | unknown>`

<1-3 sentence summary of the entire review. Write not just counts but why the risk was judged that way.>

### Request changes

- `<agent>`: <blocking comment summary> (`file:line`)

### Better / Recommended

- `<agent>`: <better comment summary>

### Suggestions / Questions

- `<agent>`: <suggestion or question summary>

### Concentrated Risks

- `<file or symbol>`: <reason multiple agents' blocking or important findings are concentrated here>

### Tradeoffs / Reconciliation

- <conflict between perspectives, and which one was prioritized in the decision>

### Unverified Risks

- <unverified risks such as missing CI/test/historical/spec context>

### Review Coverage

Reviewed by:
- <agent>: <status and short scope>

Skipped:
- <agent>: <reason>

Failed:
- <agent>: <reason and impact>

### Suggested Next Actions

1. <highest-priority fix or check>
2. <next validation to perform>
3. <PR split or docs/test update if needed>
```

## Overall Risk Rules

- `critical`: critical blocking, security boundary / data loss / billing / irreversible migration risk, related CI/test failure, failure of a high-risk specialist agent.
- `high`: multiple request-changes, two or more agents with blocking on the same file/function/API, important unresolved issues in public API/migration/architecture.
- `medium`: no blocking, but multiple better/suggestion or unverified risks.
- `low`: no blocking, CI/test passing or not needed, skip reasons are clear.

## Merge Readiness Rules

- `blocked`: critical request-changes, related CI failure, unresolved approval gate.
- `needs_changes`: request-changes, important missing tests/spec/docs.
- `ready`: no blocking, sufficient validation, skip/failed do not hide material risk.
- `unknown`: cannot decide due to missing CI/test/spec/historical context.

## Concentrated Risk Detection

Group by file / symbol / public API endpoint / migration unit, and if two or more agents emit `blocking: true` or `severity: critical|important`, include in `Concentrated Risks`.

## Tradeoff Examples

- performance improvement vs simplicity loss: prioritize simplicity if there is no measurement evidence.
- algorithm improvement vs maintainability loss: prioritize readability if input constraints are small.
- compatibility maintenance vs API cleanup: prioritize compatibility if there are existing users.
- adding observability vs secret leakage: prioritize secret protection.

## Do Not Include

- low-confidence speculation
- duplicate inline comment full bodies
- provider-specific API payload details
- private chain-of-thought
- long raw logs

## Risk Flag Aggregation

Aggregate `risk_flags` returned by each agent in the final summary as follows.

### Scoring

```text
critical flag combination: +3
high risk flag: +2
repeated same flag from >= 3 agents: +2
repeated same flag from 2 agents: +1
missing dynamic context on high-risk PR: +1
```

### Important combinations

- `hotspot_file_changed` + `tests_missing` -> `overall_risk` is at least `high`.
- `bugfix_without_reproduction_test` + `tests_missing` -> for bug fixes, at least `needs_changes`.
- `docs_tests_code_mismatch` + `public_api_changed` -> emphasize `pr-spec-consistency-reviewer` findings in the summary.
- `deployment_config_changed` + `ci_results.unknown` -> always include in `Unverified Risks`.
- `architectural_boundary_shift` + `broad_scope_change` -> consider PR split or insufficient architecture review.
- If three or more agents return the same risk_flag, raise `overall_risk` by one level. However, treat duplicates that share the same basis as a single point.

### Output example

```markdown
### Risk Flags

- `hotspot_file_changed` + `tests_missing`: judged regression risk as high because the file has high historical change frequency and tests are missing.
```

## Coverage Threshold Guidance

When `ci_results.coverage.changed_lines_covered` is available, use the following as a guideline.

- For high-risk change with changed lines coverage < 80%: candidate for `Unverified Risks` or `needs_changes`.
- For bug fix / migration / security / public API with changed lines coverage < 90%: have `pr-test-reviewer` check the missing areas.
- Even with low coverage, do not request-changes purely on the number if existing integration/e2e/contract tests are sufficient.
- Coverage unknown is not a failure, but explicitly mark it as `unknown` for high-risk PRs.

## Dynamic Validation Evidence

When needed, briefly include dynamic validation evidence in the summary.

```markdown
### Validation Evidence

- CI: `<success | failure | pending | unknown>`
- Local validation: `<commands run or not run>`
- Coverage: `<changed line coverage or unknown>`
```

## Meta Review Result

When `pr-review-meta-reviewer` was invoked, reflect its result internally and include the following in the final summary if needed.

```markdown
### Review Quality Check

- Meta-review: `<passed | adjusted | unresolved>`
- Additional agents run after meta-review: `<agents or none>`
- Remaining unverified areas: `<items>`
```

## Learning Signals

In environments where comment outcome tracking is possible, leave the following in the final summary or internal log.

```yaml
learning_signals:
  comment_ids_created: []
  expected_followup:
    - resolved_or_dismissed_tracking
  reference_candidates: []
```

Do not write long internal learning metadata in the PR body or final summary. Pass it to the internal log or to reference creation input.

## Large PR Summary Rule

For large PRs, honestly show the review scope.

```markdown
### Review Coverage

This PR is large, so the review prioritized:
- public API changes
- migration/config/security risk
- high-churn files
- files with failing or missing tests

Areas not fully reviewed are listed under Unverified Risks.
```

## Deleted / Renamed File Summary Rule

When there are deletions/renames, include the state of remaining-reference checks.

```markdown
### Deleted / Renamed File Checks

- Deleted symbols checked for remaining callers: `<yes | no | partial>`
- Renamed paths checked in imports/docs/tests/config: `<yes | no | partial>`
- Dead dependency/config risk: `<none | possible | found>`
```
