---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs.
---

# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**TOOL EXECUTION MANDATE:** You MUST actually execute these verification commands with whatever terminal/shell tool the host harness exposes (e.g. `Bash` in Claude Code, `run_in_terminal` in VSCode Copilot). Do not just write bash code blocks and assume the user will run them.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes. The rule applies to exact phrases, paraphrases, and any wording that implies success.

## The Gate

Before ANY claim of success, completion, or satisfaction:

1. **IDENTIFY** — What command proves this claim?
2. **RUN** — Execute the full command fresh.
3. **READ** — Full output, exit code, failure count.
4. **VERIFY** — Does the output confirm the claim?
5. **CLAIM** — Only now, with the evidence cited.

Skipping any step is lying, not verifying.

## What Counts as Evidence

| Claim                 | Sufficient evidence              | Not sufficient                   |
| --------------------- | -------------------------------- | -------------------------------- |
| Tests pass            | Test command output: 0 failures  | Previous run, "should pass"      |
| Linter clean          | Linter output: 0 errors          | Partial check, extrapolation     |
| Build succeeds        | Build command: exit 0            | Linter passing, logs look good   |
| Bug fixed             | Original symptom test: passes    | Code changed, assumed fixed      |
| Regression test works | Red → green cycle verified       | Test passes once                 |
| Agent completed       | VCS diff shows expected changes  | Agent self-reports "success"     |
| Requirements met      | Line-by-line checklist verified  | Tests passing                    |

## Rationalizations That Mean STOP

| Excuse                                  | Reality                       |
| --------------------------------------- | ----------------------------- |
| "Should work now" / "I'm confident"     | Confidence ≠ evidence. Run it.|
| "Just this once" / "I'm tired"          | No exceptions.                |
| "Linter passed"                         | Linter ≠ compiler.            |
| "Agent said success"                    | Verify independently via diff.|
| "Partial check is enough"               | Partial proves nothing.       |
| "Different words so rule doesn't apply" | Spirit over letter.           |

Trigger words that mean you skipped the gate: "should", "probably", "seems to", "Great!", "Perfect!", "Done!" — and any positive framing emitted before running the command.

## Two Patterns Worth Spelling Out

**Regression tests (TDD red-green):**

```
Write → Run (must FAIL) → Apply fix → Run (must PASS) → Revert fix → Run (FAIL) → Restore → Run (PASS)
```

Without the red-green loop you have not proven the test catches the bug.

**Agent delegation:**

```
Agent reports success → Read VCS diff → Verify expected changes exist → Report actual state
```

Never propagate an agent's self-report as a completion claim.

## When To Apply

Always, before:

- Any success / completion / "done" wording
- Committing, opening PRs, or moving to the next task
- Trusting a subagent's report

## Bottom Line

Run the command. Read the output. Then claim the result. Non-negotiable.
