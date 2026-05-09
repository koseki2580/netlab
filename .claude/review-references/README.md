# Review References

This directory holds reusable review knowledge extracted from past reviews and project rules.

## Flow

```text
PR URL / PR comments / code before-after / CLAUDE.md rules
  -> skills/review-reference-creation
  -> candidate or active reference
  -> skills/review-reference-maintenance
  -> team-lead-reference-reviewer
```

## Bootstrap References

`team-lead/references.yaml` may contain initial `active` references derived from CLAUDE.md to avoid a cold start before any real TL review history exists.

These are not a substitute for team-specific past reviews. After operations begin, backfill from PR review comments that were actually adopted, and use maintenance to mark stale, excessive, or false-positive references as `deprecated`.

## Backfill Operation

When creating references from existing merged PRs:

1. Collect the PR URL, review comments, the targeted code, and the post-fix code.
2. Use `skills/review-reference-creation/SKILL.md` to create a `candidate` reference.
3. Have a human or `review-reference-maintenance` confirm reusability.
4. Promote to `active` only those that can be sufficiently generalized.

## Status

- `active`: agents may use as comment evidence.
- `candidate`: reference information only. Do not use as comment evidence.
- `deprecated`: outdated or prone to false positives. Do not use.

## Bootstrap reference owner

For bootstrap references derived from CLAUDE.md, do not use an empty owner. The default value is `project-rules-maintainer`, to be replaced in real operation with the team's responsible person or role.

`review-reference-maintenance` treats references with an empty owner as `needs_owner`.

## Learning Loop Integration

`review-learning-loop` may create reference candidates from resolved/accepted review comments.

Dismissed or false-positive comments should not become active references. Instead, use them to update Agent false positive examples or severity thresholds.

Recommended periodic process:

1. Collect review comments from recently merged PRs.
2. Classify outcomes: accepted, resolved, dismissed, ignored, superseded.
3. Run `review-learning-loop`.
4. Send reusable accepted lessons to `review-reference-creation` as `candidate`.
5. Use `review-reference-maintenance` to promote high-confidence candidates to `active`.
