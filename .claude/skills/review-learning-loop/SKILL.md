---
name: review-learning-loop
description: Used to collect outcomes (resolved/dismissed/accepted/ignored) of posted review comments and feed them into false-positive reduction or team-lead reference updates
---

# Review Learning Loop

## Purpose

Do not let the review system end with one-shot comment generation; learn from what happens to those comments.

Learning targets:

- Findings that were adopted
- Findings that were dismissed
- Findings the author argued against
- Findings that were duplicates
- Findings that proved valid after merge
- Findings that turned out to be false positives

## Input

```yaml
review_outcome_input:
  pr_url: <url>
  provider: github | bitbucket-cloud | bitbucket-data-center | unknown
  comments:
    - comment_id: <id>
      agent: <agent>
      type: request-changes | better | suggestion | question | comment | praise
      summary: <summary>
      status: resolved | dismissed | accepted | ignored | superseded | unknown
      author_response_summary: <summary | null>
      final_code_changed: true | false | unknown
      false_positive: true | false | unknown
      lesson_candidate: <text | null>
```

## Learning rules

### accepted / resolved

- If it captures a reusable judgment criterion, pass it to `review-reference-creation`.
- Do not turn PR-specific findings into references.

### dismissed / false_positive

- Classify why it was off the mark.
- Add as a candidate to the agent's false-positive examples.
- If the same agent keeps producing the same kind of false positive, tighten that agent's commenting conditions.

### ignored

- May have been low importance.
- Use as a candidate for adjusting the threshold of `better` / `suggestion`.

## Output

```yaml
learning_loop_result:
  references_to_create:
    - source_comment_id: <id>
      recommended_status: candidate | active
      lesson: <generalized lesson>
  agent_updates_suggested:
    - agent: <agent>
      change_type: tighten_threshold | add_false_positive_case | add_good_example | update_severity
      reason: <why>
  metrics:
    comments_total: <number>
    accepted_count: <number>
    dismissed_count: <number>
    false_positive_count: <number>
```

## Safety measures

- Do not treat the author's rebuttal as truth on its own. Judge together with the final code diff, the discussion, and the merge result.
- Do not store personal names or emotional expressions in the reference.
- Do not reuse past comment wording verbatim. Convert to `lesson` and `applicability`.
