# Contributing to netlab

Thank you for your interest in contributing! This guide formalises the workflow already encoded in [`.claude/CLAUDE.md`](.claude/CLAUDE.md) — the single source of truth for process rules.

---

## Project Shape

| Directory       | Purpose                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| `src/`          | Published library — types, hooks, components, simulation engine, OSI layers |
| `demo/`         | Interactive gallery — one file per demo, not shipped to consumers           |
| `docs/`         | Specifications — every feature has a matching spec _before_ code lands      |
| `plan/`         | Work plans — numbered implementation plans (`plan/<NN>.md`)                 |
| `agents/tasks/` | Task tracker (`todo.md`) and lessons log (`lessons.md`)                     |

---

## Workflow Overview

The full rules live in `.claude/CLAUDE.md`. The three pillars:

1. **Spec-first (§7)** — Write or update `docs/<area>/<topic>.md` _before_ writing code.
2. **TDD (§3)** — Red → green → refactor, per task.
3. **Docs–tests consistency (§8)** — Code, docs, and tests land together. A change is not complete unless all three are consistent.

---

## Local Development

```bash
npm install

# Development
npm run dev              # demo dev server (Vite)
npm run test:watch       # unit TDD loop (Vitest)

# Validation
npm test                 # unit tests
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npm run format:check     # Prettier check
npm run coverage         # unit tests + coverage

# Build
npm run build            # library (dist/)
npm run build:demo       # demo site (dist-demo/)

# Other
npm run size             # size-limit check
npm run lint:fix          # auto-fix lint
npm run format           # auto-format
```

---

## Branch Naming

| Prefix                            | Usage                 |
| --------------------------------- | --------------------- |
| `feat/<topic>`                    | New feature           |
| `fix/<topic>`                     | Bug fix               |
| `refactor/<topic>`                | Internal restructure  |
| `docs/<topic>`                    | Documentation only    |
| `plan/<plan-number>-<short-slug>` | Plan execution branch |

---

## Commit Messages

Follow the convention documented in `.claude/skills/commit-message-convention/SKILL.md`:

```
type(scope): :emoji: : description
```

Examples:

```
feat(simulation): ✨ : add MTU fragmentation pipeline
fix(stp): 🐛 : correct BridgeId comparison for equal priority
docs(routing): 📝 : add OSPF specification
test(errors): ✅ : add NetlabError unit tests
refactor(core): ♻️ : extract HookEngine compose helper
```

One logical change per commit. Do not bundle unrelated changes.

---

## Plans

Implementation is driven by numbered plans in `plan/<NN>.md`. Each plan:

- Defines scope, tasks, acceptance criteria, and a file-diff budget.
- Is the atomic unit of work — sub-tasks inherit the plan's gates.
- Should be reviewed before implementation begins.

---

## Lessons

Every non-trivial PR should include a lesson in [`agents/tasks/lessons.md`](agents/tasks/lessons.md).

Use the template in [`agents/tasks/lessons.template.md`](agents/tasks/lessons.template.md):

```
## L<NNN> — <title>

**What happened**: ...
**Rule**: ...
**Why**: ...
**Apply when**: ...
```

Keep each lesson ≤ 5 lines. Read existing lessons before starting work to avoid known pitfalls.

---

## Pull Request Expectations

Use the [PR template](.github/PULL_REQUEST_TEMPLATE.md) when opening a PR. Before requesting review:

- [ ] `npm test` — all tests pass
- [ ] `npm run typecheck` — no type errors
- [ ] `npm run lint` — no lint violations
- [ ] `npm run coverage` — coverage does not regress
- [ ] `npm run size` — bundle size within limits
- [ ] Docs updated if behaviour changed
- [ ] Lesson appended if anything non-obvious came up
