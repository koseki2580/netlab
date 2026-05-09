---
name: review-reference-maintenance
description: Used to periodically review past-review references from team leads or experienced reviewers and reorganize their active/candidate/deprecated status
---

# Review Reference Maintenance

## Purpose

Periodically inspect the contents of `review-references/` that the review agents consult.

Reference data is powerful, but stale entries produce wrong reviews. Re-examine them periodically against the current codebase, design direction, and team rules.

## Target

```text
review-references/
  team-lead/
    references.yaml
```

## Flow

1. Load the reference data.
2. Check entries with `status: active` first.
3. Decide expiry from `last_reviewed_at` and `review_interval_days`.
4. Verify whether they apply to the current codebase and design direction.
5. Classify into:
   - active: keep using
   - candidate: useful as reference, but weak as comment evidence
   - deprecated: outdated or no longer used
6. Make the lesson / applicability more concrete.
7. Strip personal names, emotional expressions, and overly context-dependent wording.

## Criteria

### Conditions to mark as active

```yaml
reusable: true
context_clear: true
applies_to_current_codebase: true
not_personal_preference_only: true
has_clear_applicability: true
```

### Conditions to mark as candidate

- A good finding, but the applicability conditions are vague.
- Multiple similar findings exist and have not yet been merged.
- A code example exists but the lesson is weak.
- It is unclear whether it is still valid.

### Conditions to mark as deprecated

- Not needed in the current design.
- Depends on past constraints.
- Invalidated by tool or library updates.
- No grounds beyond personal preference.
- Already merged into a better reference covering the same content.

## Output

```yaml
reference_maintenance_result:
  checked_at: YYYY-MM-DD
  total: 0
  active: 0
  candidate: 0
  deprecated: 0
  updated:
    - id: <reference id>
      old_status: candidate
      new_status: active
      reason: <reason>
  needs_human_review:
    - id: <reference id>
      reason: <point to confirm>
```

## Notes

- Do not treat past reviews as absolute.
- The TL's name and personal style do not need to appear in the comment.
- Rather than reusing the original wording, distill into a reusable `lesson`.
- When keeping an old reference, set it to `deprecated` and record the reason.

## Owner policy

`maintenance.owner` of a reference entry must not be empty.

- CLAUDE.md-derived bootstrap reference: `project-rules-maintainer`
- TL-review-derived: the reviewer name or review owner role when possible
- owner unknown: drop to candidate as `needs-owner`, or include in the maintenance output

Active references with empty owner should be reported as `needs_owner` during periodic maintenance.
