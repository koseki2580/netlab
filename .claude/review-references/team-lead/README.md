# Team Lead Review References

References that organize a team lead's past reviews into a form easy for agents to consult.

## Unit of one entry

A single reference holds the following information.

```yaml
id: tl-review-0001
status: active | candidate | deprecated
source:
  pr_url: <past PR URL>
  reviewer: <optional; use team-lead etc. when avoiding personal names>
  reviewed_at: YYYY-MM-DD
context:
  language: python | typescript | rust | go | other
  area: api | test | domain | infra | cli | ui | other
  change_type:
    - bug_fix
    - normal_feature
code_before: |
  <summary or short excerpt of the reviewed code>
review_comment: |
  <the past review finding; a summary is fine if needed>
lesson: |
  <judgment criterion to reuse from now on>
applicability:
  applies_when:
    - <applicability condition>
  does_not_apply_when:
    - <does-not-apply condition>
recommended_comment_type: request-changes | better | suggestion | question | comment | praise
confidence: high | medium | low
maintenance:
  last_reviewed_at: YYYY-MM-DD
  review_interval_days: 90
  owner: <optional>
```

## What to record

- Findings that have appeared multiple times
- Findings that led to bugs, incidents, or rework
- Team-specific responsibility splits and design directions
- Test layout, fixture, and mock policies
- Choices around API boundaries, error handling, and data structures

## What is better not to record

- Mere preferences
- Findings that are too context-dependent to reuse
- Personal names or emotional expressions
- Findings that depend on outdated design and are no longer valid

## Status

| status | Meaning |
|---|---|
| active | Agents may consult |
| candidate | Being collected. Internal reference only; do not use in comments |
| deprecated | Outdated. Do not consult |
