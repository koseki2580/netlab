# Operating Mode & Adaptive Depth

**Use the lightest process that safely completes the task.** Do not use a deeper mode unless it adds value.

**Mode declaration (mandatory):** At the very start of every response to a new user request, output one line stating the selected mode and a brief reason, in this exact format:

`Mode: <Minimal|Standard|Comprehensive> — <one-line reason>`

This must be the first line of the reply (before any other text or tool calls). It serves as evidence that this section was read and that mode selection is deliberate. If the task changes scope mid-conversation and the mode escalates or de-escalates, output an updated `Mode:` line before continuing.

- **Minimal** (Trivial changes, typos, formatting-only changes, small internal refactors, or obvious one-line fixes):
  - Answer or edit directly while preserving **Simplicity First**, **Surgical Changes**, and **Validation Before Completion**.
  - Use direct verification. Use a short plan only if helpful. Do not invoke skills, sub-agents, or documentation workflows unless strictly necessary.
  - **User-facing micro-changes stay Minimal** when only surface text changes and the behavior contract is unchanged (e.g., error message wording, log strings, microcopy). The moment behavior, public API shape, schema, or operational semantics change — even by one field — escalate to Standard and apply Section 8 (Specification-Driven Development).

- **Standard** (Normal feature, non-trivial bugfix, or meaningful multi-file change):
  - Check `agents/tasks/lessons.md` before implementation when useful.
  - Use a task-specific file under `agents/tasks/active/` when the task has multiple steps, risk, or meaningful uncertainty.

- **Comprehensive** (High-risk, architectural, public API, security, data model, or production-impacting change):
  - Write or update a comprehensive plan.
  - Identify success criteria and rollback considerations.
  - Use tests when appropriate.
  - Update docs/specs when behavior, API, architecture, or user-facing expectations change.
  - **Approval Gates:** Pause for explicit approval before:
    - changing public APIs, data models, security boundaries, or architecture
    - executing infrastructure changes (e.g., `terraform apply` or `kubectl apply`)
    - implementing a plan with unresolved tradeoffs
    - proceeding after discovering scope expansion or conflicting requirements
  - **Approval format:** Wait for an explicit affirmative from the user (e.g., "approve", "ok", "go", "yes", "進めて") before proceeding past a gate. Do **not** treat continuation messages, follow-up questions, related comments, or silence as approval. If the next user message does not clearly authorize the gated action, restate the gate and ask again rather than inferring consent.

---

## Workflow Design

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- **If available and appropriate, consider using the `brainstorming` skill** to explore user intent, requirements, and design before any creative work or implementation.

### 2. Default to Plan Mode

- For non-trivial tasks involving 3 or more meaningful implementation steps, risky changes, or architectural decisions, always start in Plan Mode
- If things stop working midway, do not push forward blindly—pause and re-plan immediately
- Use Plan Mode not only for implementation, but also for validation steps
- To reduce ambiguity, write a short specification before implementation when requirements are unclear or behavior changes are significant
- **If available and appropriate, consider using the `writing-plans` skill** when you have a spec or requirements for a multi-step task, before touching code.

---

### 3. Sub-Agent Strategy

- Use sub-agents only when tasks are independent, complex, or benefit from parallel investigation.
- Do not overcomplicate simple tasks with sub-agent overhead.
- When useful, delegate research, investigation, or parallel analysis to sub-agents
- For complex problems, consider allocating more computational resources via sub-agents
- Assign exactly one task per sub-agent to maintain focus
- **If available and appropriate, consider using the `subagent-driven-development` skill** when executing implementation plans with independent tasks.
- **If available and appropriate, consider using the `dispatching-parallel-agents` skill** when facing 2+ independent tasks that can be worked on without shared state.

---

### 4. Self-Improvement Loop

- **For Standard or Comprehensive tasks, check `agents/tasks/lessons.md` before implementation when useful.**
- Whenever you receive corrections from the user, record the pattern in `agents/tasks/lessons.md`
- Use the template in `agents/tasks/lessons.template.md` (four fields: What happened / Rule / Why / Apply-when)
- Keep each lesson ≤ 5 lines of body; if longer, split into multiple entries
- Every non-trivial plan should include a final checkpoint: consider whether a lesson should be appended.
- Append only when there was a user correction, repeated mistake, surprising failure, or reusable insight.
- Write rules for yourself to avoid repeating the same mistakes
- Continuously refine these rules until the error rate decreases

---

### 5. Always Validate Before Completion

- **If available and appropriate, consider using the `finishing-a-development-branch` skill** when implementation is complete and you need to decide how to integrate the work (merge/PR/cleanup).
- **If available and appropriate, consider using the `requesting-code-review` skill** before merging to verify work meets requirements.

- Do not mark a task as complete until its behavior is proven
- When necessary, review the diff between the main branch and your changes
- Ask yourself: “Would a staff engineer approve this?”
- Run tests, check logs, and demonstrate that everything works correctly
- **If available and appropriate, consider using the `implementation-review-orchestration` skill** for in-progress mid-implementation review on Standard / Comprehensive tasks once implementation reaches a meaningful checkpoint, before final verification.
- **If available and appropriate, consider using the `verification-before-completion` skill** when about to claim work is complete, fixed, or passing, to strictly run verification commands.

---

### 6. Strive for Elegance (with Balance)

- Before making significant changes, pause and ask: “Is there a more elegant solution?”
- If a fix feels like a hack, rethink it and implement a more robust solution based on everything you know
- Skip this process for simple and obvious fixes (avoid over-engineering)
- Always review your own work critically before presenting it

---

### 7. Autonomous Bug Fixing

- When receiving a bug report, fix it without requiring step-by-step guidance
- Use logs, errors, and failing tests to identify and resolve the issue independently
- Minimize the need for the user to switch context
- If CI failures are directly related to the current change, fix them. If unrelated, report them separately unless the user asks to fix them.
- **Fail-safe:** If you fail to fix the same failing test or error after 3 attempts, or if your fixes keep introducing new failures, STOP and ask the user for help. Do not enter an infinite loop of trial and error.
- **If available and appropriate, consider using the `systematic-debugging` skill** when encountering any bug, test failure, or unexpected behavior, before proposing fixes.

---

### 8. Specification-Driven Development

- **For user-facing behavior, public API, architecture, or important operational behavior changes:**
  - Before implementation, write or update the specification in `docs/`
  - Always consult `docs/README.md` to determine the correct location for your changes or new specifications.
  - If you create a new document or change the structure, you MUST update `docs/README.md` alongside it to keep the documentation index current.

**When a specification is required or updated:**

- Review and validate the specification before writing code.
- After implementation, update the specification to reflect the actual behavior.
- Ensure that documentation matches the current implementation.
- If the implementation differs from the specified behavior, update the spec immediately to prevent discrepancies.

---

### 9. Tests Are Required

**Tests are mandatory, not optional.**

- **New features ship with tests.** A feature without tests is not done.
- **Bug fixes follow TDD:** write a failing test that reproduces the bug first, then fix the code, then confirm it passes. Never fix first and add a test afterwards.
- **Test behavior, not implementation.** Assert on outcomes the caller observes, not on internal call sequences, private helpers, or mock invocations. See the `test-driven-development` skill for the full rule and worked examples.
- **Docs–tests consistency:** Tests are the executable representation of the specification. If `docs/` changes, tests MUST reflect that change. If tests no longer match docs, they MUST be updated immediately. Keep intended behavior (specs/docs), validated behavior (tests), and actual behavior (code) consistent.
- **Use the `test-driven-development` skill** for any non-trivial feature or bugfix before writing implementation code.

---

### 10. Infrastructure as Code (IaC) Safety

**Treat infrastructure changes with maximum caution.**

- **Never autonomously execute commands that alter infrastructure** (e.g., `terraform apply`, `kubectl apply`, `aws cloudformation deploy`).
- ALWAYS stop at the planning stage (e.g., `terraform plan`, `kubectl diff`, `pulumi preview`).
- If the plan generates a diff, explicitly report **what the diff changes** to the user (additions, modifications, destructions).
- Wait for explicit user confirmation before proceeding with any infrastructure mutation.

---

## Task Management

**Define success criteria. Loop until verified.** (Goal-Driven Execution)
Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For non-trivial or multi-step coding tasks, use a task-specific file (e.g., `agents/tasks/active/<task-name>.md`) to track the plan. Avoid using a single global `todo.md` to prevent merge conflicts during parallel development.
For trivial changes, do not create or update task files unless useful.

For multi-step tasks, use verifiable step loops:

```text
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria require constant clarification.

When using a task file (`agents/tasks/active/<task-name>.md`):

1. **Start with a plan**: Document what was requested, what will be done, and write a checklist-style plan.
2. **Review the plan**: Ask for user confirmation only when the plan changes scope, affects risky areas, or has meaningful ambiguity.
3. **Track progress**: Mark items as complete as you go.
4. **Explain changes**: Provide high-level summaries at meaningful checkpoints.
5. **Summarize results**: Add a review section detailing what was actually done, how it was verified, and any remaining risks.
6. **Finalize & Clean up**: Do not commit active task logs to git. Ensure `agents/tasks/active/` is gitignored before writing task logs there; if needed, add it to `.gitignore`. Instead, distill the final summary into the PR description or commit message. Record reusable insights in `agents/tasks/lessons.md` only when there was a user correction, repeated mistake, or surprising failure.

**Recommended Task File Structure**
Use a structured format like HFS (Hypothesis, Findings, Solution) for clarity:

- **Context & Goal**: What was requested and the verifiable success criteria.
- **Hypothesis / Plan**: The initial approach and step-by-step verification loops.
- **Findings**: Issues encountered, log outputs, and learnings during execution.
- **Solution / Summary**: What was actually implemented, how it was verified, and the final extracted text for the PR description.

**Progress Cadence**
For tasks that span more than a handful of tool calls, post a brief progress note when:

- A meaningful sub-step completes (e.g., plan written, first failing test in place, refactor done, all tests green).
- Direction changes (a hypothesis is invalidated, scope shifts, a blocker is discovered).
- Just before a long-running, expensive, or hard-to-reverse operation begins.

One sentence is usually enough. Silence during multi-step work makes it hard for the user to course-correct early — keep them in the loop without narrating every tool call.

**Resume Safety**
For standard or comprehensive tasks, the task file must be sufficient to resume work after context loss. Keep it updated with:

- Current status and completed checklist items
- Next action
- Verification already performed
- Unresolved questions or risks

**Durable Questions**
For comprehensive-depth tasks with blocking ambiguity, record open questions in the task file instead of relying only on chat. Use this format:

- **Question:**
- **Options:**
- **Recommended default:**
- **Impact:**
- **Answer:** `<Wait for user to fill>`

Proceed only after the ambiguity is resolved or an explicit assumption is accepted.

**Optional Skill Use**

- **If available and appropriate, consider using the `executing-plans` skill** when you have a written implementation plan to execute with review checkpoints.

---

## Core Principles

### Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical Changes

**Touch only what you must. Clean up only your own mess.**

**Read before edit:**

- Read the full target file before editing it. Do not edit on the basis of a partial view.
- For non-trivial edits, also read direct callers, importers, and any tests that exercise the symbol you are changing. If the change crosses a public boundary, scan for all usages.
- If the file is too large to read whole, read the surrounding region plus every site that references the symbol you are touching.

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
- The test: Every changed line should trace directly to the user's request.

**Reuse before adding (dependency policy):**

- Before introducing a new dependency, helper, abstraction, or module, search `docs/`, `src/`, and the project's equivalent locations for an existing solution and reuse it.
- If existing code genuinely cannot solve the problem, **propose** the new dependency or module to the user with rationale before installing or scaffolding — do not add it unilaterally.
- Treat any new third-party module as a security surface. Before proposing it, check: maintenance status (last release, open critical issues), license compatibility, install size and transitive dependencies, and whether the standard library or an already-installed package can do the job.
- Pin versions explicitly. Never silently widen a version range to pull in something new.

### Quality

- **No Shortcuts**: Identify the root cause. Avoid temporary fixes. Maintain senior-level quality.
