---
name: review-reference-creation
description: Used when creating a reusable past-review reference from a TL or experienced reviewer based on a pull request URL, review comments, the reviewed code, and the fix
---

# Review Reference Creation

## Purpose

Take a pull request URL, review comments, the reviewed code, the post-fix code, and a conversation summary, and produce a reusable review reference that can be saved under `review-references/`.

This Skill is not for stockpiling past reviews verbatim; it converts them into `lesson` and `applicability` that future review agents can use.

## Basic policy

- New entries default to `status: candidate`.
- Promote to `active` only when a human explicitly judges it valid as a team rule.
- Do not reuse the original review comment text verbatim.
- Strip personal names, emotional expressions, and PR-too-specific circumstances.
- If a similar reference already exists, treat it as a merge candidate rather than creating a new one.
- Keep code excerpts minimal. Do not store entire long implementations.
- Do not store security information, secret information, customer information, tokens, or personal information.

## Input

At minimum, accept any of the following.

```yaml
input:
  pr_url: ""
  provider: github | bitbucket-cloud | bitbucket-data-center | unknown
  reviewer: team-lead
  reviewed_at: YYYY-MM-DD
  review_comments:
    - body: ""
      file: ""
      line: 0
      url: ""
      comment_type: request-changes | better | suggestion | question | comment | praise | unknown
  code_before: |
    # The reviewed code, or a short excerpt of the structure
  code_after: |
    # Post-fix code. Use if available.
  pr_summary: |
    # PR purpose and change overview
  labels:
    - ""
  notes: |
    # Additional context provided by a human
```

Even with insufficient input, draft a `candidate` to the extent possible. List missing information in `needs_human_review`.

## Creation flow

1. Organize the PR context from the input.
2. Extract the intent of the review comment.
3. Map the review comment to the targeted code.
4. If post-fix code exists, identify which change resolved the issue.
5. Turn the reusable judgment criterion into a `lesson`.
6. Put the applicability conditions into `applicability.applies_when`.
7. Put the does-not-apply conditions into `applicability.does_not_apply_when`.
8. Estimate `context.language` / `context.area` / `context.change_type`.
9. Set `recommended_comment_type`.
10. Check whether a similar reference exists.
11. Generate the YAML entry.
12. Return the destination and items requiring human confirmation.

## Converting a comment into a lesson

### Bad conversion

```yaml
review_comment: |
  TL said "this is iffy".
lesson: |
  This is iffy, so fix it.
```

### Good conversion

```yaml
review_comment: |
  The same normalization was duplicated in each caller; the reviewer pointed out that normalization should happen once at the boundary.
lesson: |
  When multiple callers need the same input normalization, do not scatter it across callers — normalize once at the boundary that owns the responsibility.
applicability:
  applies_when:
    - The same preprocessing, normalization, or defensive conversion is repeated across multiple callers
    - An invariant can be established at the input or domain boundary
  does_not_apply_when:
    - Normalization rules differ per caller
    - A lower layer would need to know the upper layer's context
```

## Classification rules

### context.language

```text
python | typescript | javascript | rust | go | java | kotlin | swift | ruby | php | shell | sql | markdown | other
```

### context.area

```text
api | test | domain | infra | cli | ui | docs | data | auth | error-handling | performance | algorithm | dependency | other
```

### context.change_type

```text
bug_fix | normal_feature | refactor | test_change | docs_change | migration | dependency_update | performance_change | security_change | api_change | other
```

## Choosing recommended_comment_type

```text
request-changes:
  Bug, spec violation, accident prevention, breaking change, missing required tests

better:
  Not required, but worth fixing as a team standard

suggestion:
  Useful as an alternative or improvement, but situational

question:
  Confirming intent is the main purpose

comment:
  Supplementary note, knowledge sharing, or call-out

praise:
  Want to reuse as a good implementation pattern
```

## Duplicate check

Before creating a new entry, check the existing `review-references/team-lead/references.yaml`.

If a similar `lesson` exists, do one of the following instead of creating a new entry.

```yaml
duplicate_handling:
  action: merge_into_existing | create_variant | create_new
  existing_reference_id: ""
  reason: ""
```

### merge_into_existing

When the judgment criterion is the same and only the applicability conditions need to be reinforced.

### create_variant

When it is similar but the language, layer, or failure conditions differ.

### create_new

When it is sufficiently different from existing references.

## Output

```yaml
reference_creation_result:
  status: created | draft_created | skipped | needs_human_review
  destination: review-references/team-lead/references.yaml
  duplicate_handling:
    action: create_new | create_variant | merge_into_existing | skipped
    existing_reference_id: ""
    reason: ""
  created_reference:
    id: tl-review-YYYYMMDD-001
    status: candidate
    source:
      pr_url: ""
      reviewer: team-lead
      reviewed_at: YYYY-MM-DD
      comments:
        - url: ""
          file: ""
          line: 0
    context:
      language: other
      area: other
      change_type:
        - normal_feature
    code_before: |
      # minimal excerpt or summary
    code_after: |
      # optional minimal excerpt or summary
    review_comment: |
      # summarized original review comment
    lesson: |
      # reusable review rule
    applicability:
      applies_when:
        - ""
      does_not_apply_when:
        - ""
    recommended_comment_type: better
    confidence: medium
    maintenance:
      created_at: YYYY-MM-DD
      last_reviewed_at: YYYY-MM-DD
      review_interval_days: 90
      owner: ""
  needs_human_review:
    - ""
```

## File append rules

`references.yaml` is managed as a list.

```yaml
references:
  - id: tl-review-20260430-001
    status: candidate
    source:
      pr_url: "https://..."
      reviewer: team-lead
      reviewed_at: 2026-04-30
    context:
      language: typescript
      area: api
      change_type:
        - api_change
    code_before: |
      # ...
    review_comment: |
      # ...
    lesson: |
      # ...
    applicability:
      applies_when:
        - "..."
      does_not_apply_when:
        - "..."
    recommended_comment_type: better
    confidence: medium
    maintenance:
      created_at: 2026-04-30
      last_reviewed_at: 2026-04-30
      review_interval_days: 90
      owner: ""
```

## Quality criteria

A created reference must satisfy the following.

```yaml
quality_check:
  has_reusable_lesson: true
  has_applicability: true
  has_non_applicability: true
  has_source_pr: true
  removes_personal_expression: true
  avoids_secret_or_personal_data: true
  not_too_specific_to_one_pr: true
  not_too_generic: true
```

## Skip conditions

In the following cases, do not create a reference and return the reason.

- The comment is a mere typo or one-off nit.
- The comment looks like personal preference only.
- The context is too thin to form a lesson.
- It contains secret or personal information that cannot be anonymized.
- It is a complete duplicate of an existing reference.

## Notes

- Do not treat past reviews as absolute rules.
- Promotion to `active` must go through maintenance or human review.
- The PR URL and comment URL may remain as `source`, but do not use the TL as a personal authority in public comments.
- Keep code excerpts short, limited to what is needed for the reuse decision.

## Backfill Mode

Use this mode when creating review references from already-merged PRs, historical PR comments, or project rules such as CLAUDE.md.

Inputs may include:

```yaml
backfill_input:
  source_type: merged_pr | review_comment | project_rule | team_lead_note
  pr_url: ""
  provider: github | bitbucket-cloud | bitbucket-data-center | unknown
  review_comment_url: ""
  reviewer: ""
  code_before: |
    <code that was reviewed>
  code_after: |
    <code after the review was addressed>
  project_rule: |
    <CLAUDE.md or repository rule text>
  outcome: adopted | dismissed | unresolved | unknown
```

Rules:

- Default status is `candidate`.
- Use `active` only for explicit project rules or review patterns that were adopted repeatedly.
- Do not preserve raw personal preference. Convert it to `lesson` and `applicability`.
- Include `does_not_apply_when` to reduce false positives.
