## Workflow Design

### 1. Default to Plan Mode

- For tasks involving 3 or more steps or architectural decisions, always start in Plan Mode
- If things stop working midway, do not push forward blindly—pause and re-plan immediately
- Use Plan Mode not only for implementation, but also for validation steps
- To reduce ambiguity, write detailed specifications before implementation

---

### 2. Sub-Agent Strategy

- Actively use sub-agents to keep the main context window clean
- Delegate research, investigation, and parallel analysis to sub-agents
- For complex problems, allocate more computational resources via sub-agents
- Assign exactly one task per sub-agent to maintain focus

---

### 3. Self-Improvement Loop

- **At the start of every session, read `agents/tasks/lessons.md` before taking any action**
- Whenever you receive corrections from the user, record the pattern in `agents/tasks/lessons.md`
- Write rules for yourself to avoid repeating the same mistakes
- Continuously refine these rules until the error rate decreases

---

### 4. Always Validate Before Completion

- Do not mark a task as complete until its behavior is proven
- When necessary, review the diff between the main branch and your changes
- Ask yourself: “Would a staff engineer approve this?”
- Run tests, check logs, and demonstrate that everything works correctly

---

### 5. Strive for Elegance (with Balance)

- Before making significant changes, pause and ask: “Is there a more elegant solution?”
- If a fix feels like a hack, rethink it and implement a more robust solution based on everything you know
- Skip this process for simple and obvious fixes (avoid over-engineering)
- Always review your own work critically before presenting it

---

### 6. Autonomous Bug Fixing

- When receiving a bug report, fix it without requiring step-by-step guidance
- Use logs, errors, and failing tests to identify and resolve the issue independently
- Minimize the need for the user to switch context
- Proactively fix failing CI tests, even if not explicitly asked

---

### 7. Specification-Driven Development

- Before implementation, write the specification in `docs/`
- Review and validate the specification before writing code
- After implementation, update the specification to reflect the actual behavior
- Ensure that documentation always matches the current implementation
- Treat code and docs as a single unit:
  - A change is not complete unless both code and docs are updated

- If the implementation differs from the spec, update the spec immediately
- Never leave discrepancies between code and documentation

---

### 8. Docs–Tests Consistency

- Any change to specifications in `docs/` MUST be accompanied by corresponding updates to test cases
- A change in documentation implies a change in system behavior or expectations

- Tests are the executable representation of the specification:
  - If docs change, tests MUST reflect that change
  - If tests no longer match docs, they MUST be updated immediately

- A change is NOT complete unless all of the following are consistent:
  - documentation (`docs/`)
  - implementation (code)
  - test cases

- Never allow discrepancies between:
  - docs (intended behavior)
  - tests (validated behavior)
  - code (actual behavior)

---

## Task Management

1. **Start with a plan**: Write a checklist-style plan in `agents/tasks/todo.md`
2. **Review the plan**: Confirm it before starting implementation
3. **Track progress**: Mark items as complete as you go
4. **Explain changes**: Provide high-level summaries at each step
5. **Document results**: Add a review section to `agents/tasks/todo.md`
6. **Record learnings**: Update `agents/tasks/lessons.md` after receiving feedback

---

## Core Principles

- **Simplicity First**: Keep all changes as simple as possible. Minimize the scope of impact
- **No Shortcuts**: Identify the root cause. Avoid temporary fixes. Maintain senior-level quality
- **Minimize Impact**: Limit changes to only what is necessary. Do not introduce new bugs
