---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
---

# Executing Plans

## Overview

Load plan, review critically, execute all tasks, report when complete.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

If subagents or parallel dispatch are available in your environment, prefer using `subagent-driven-development` instead of this skill for parallelized or isolated step execution.

## The Process

### Step 1: Load and Review Plan

1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Tasks

For each task:

1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 3: Complete Development

After all tasks complete and verified, decide how to finish:

- **Default — branch-based work intended to merge/PR:**
  - Announce: "I'm using the finishing-a-development-branch skill to complete this work."
  - **REQUIRED SUB-SKILL:** Use finishing-a-development-branch
  - Follow that skill to verify tests, present options, execute choice.
- **Exploratory / spike / throwaway plan (no PR intended):**
  - Skip finishing-a-development-branch.
  - Run the plan's own verification commands, summarize results and any artifacts produced, and report back. Do NOT auto-discard the branch — let the user decide.
- **Unsure?** Default to finishing-a-development-branch and let its option menu surface the choice.

## When to Stop and Ask for Help

**STOP executing immediately when:**

- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**

- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember

- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

**Required workflow skills:**

- **using-git-worktrees** - REQUIRED: Set up isolated workspace before starting
- **writing-plans** - Creates the plan this skill executes
- **finishing-a-development-branch** - Complete development after all tasks
