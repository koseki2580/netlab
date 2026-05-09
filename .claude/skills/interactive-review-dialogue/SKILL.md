---
name: interactive-review-dialogue
description: Used after a PR author replies to a review comment so the agent can re-evaluate the context and, if needed, update, withdraw, or add explanation to the comment
---

# Interactive Review Dialogue

## Purpose

Do not treat reviews as one-way comments; re-evaluate the review based on the PR author's design intent, constraints, and counter-arguments.

## Principles

- Re-evaluate only after reading the reply.
- Do not repeat the same point.
- Withdraw or weaken findings whose evidence has been undercut.
- Add a new comment only when new facts increase the risk.
- Do not pollute the comment thread. Reply with the minimum necessary.

## Input

```yaml
interactive_review_context:
  original_comment:
    agent: <agent>
    type: <type>
    summary: <summary>
    evidence: <evidence>
  author_reply:
    body_summary: <summary>
    new_facts:
      - <fact>
  updated_diff: <optional diff>
  existing_thread: <thread summary>
```

## Re-evaluation procedure

1. Classify the author reply as one of: a new fact, a mere opinion, a question, or a counter-argument.
2. Check whether the original finding's evidence still holds.
3. If needed, re-run only the relevant specialized agent.
4. Classify the conclusion as one of:
   - keep: keep the finding.
   - soften: weaken from request-changes to better/question.
   - withdraw: withdraw the finding.
   - clarify: add explanation.
   - escalate: the new facts make it more important.
5. Leave the result in a form that can be passed to the learning loop.

## Output

```yaml
interactive_review_result:
  decision: keep | soften | withdraw | clarify | escalate
  reason: <short reason>
  reply_needed: true | false
  suggested_reply: <text | null>
  learning_signal:
    false_positive: true | false | unknown
    reference_candidate: true | false
```
