---
name: commit-message-convention
description: Enforces structured commit message conventions using types, emojis, scoped descriptions, and strict single-responsibility commits.
---

# Commit Message Convention (Skills)

## Overview

This project follows a structured commit message convention based on:

- Conventional Commits
- Emoji-enhanced readability
- Context-specific commit types
- Strict single-responsibility commits

All commit messages MUST follow the defined format and rules.

---

## Format

```
type(scope): :emoji: : description
```

### Example

```
feat(parser): ✨ : add support for TCP packet parsing
fix(api): 🐛 : resolve nil pointer in request handler
refactor(core): ♻️ : simplify queue processing logic
```

---

## Rules

- Always include `type`
- `scope` is recommended (module, feature, or component name)
- Use lowercase for `type` and `description`
- Keep descriptions concise and meaningful
- Use present tense (e.g., "add", "fix", not "added", "fixed")

---

## Critical Rule: One Commit = One Responsibility

- Each commit MUST represent exactly one logical change
- Do NOT mix multiple concerns in a single commit

### ❌ Bad

```
feat: ✨ : add API endpoint and fix typo in docs
```

### ✅ Good

```
feat(api): ✨ : add new endpoint for user creation
docs(api): 📝 : fix typo in API documentation
```

### Guidelines

- Separate refactoring from feature changes
- Separate bug fixes from improvements
- Separate formatting changes from logic changes
- If a commit message uses "and", it is likely incorrect


---

## Emoji Type

| Type  | Description           | Emoji |
|-------|----------------------|--------|
| feat  | New feature          | ✨     |
| fix   | Bug fix              | 🐛     |
| docs  | Documentation        | 📝     |
| test  | Add/update tests     | ✅     |
| chore | Maintenance/misc     | 🔧     |
| debug       | Add debug/logging                   | 🐞     |
| hotfix      | Critical production fix             | 🚑     |
| investigate | Root cause investigation            | 🔍     |
| revert      | Revert changes                      | ⏪     |
| refactor | Code refactoring (no behavior change)    | ♻️     |
| perf     | Performance improvement                  | ⚡     |
| cleanup  | Remove unused/dead code                  | 🧹     |
| style    | Formatting / lint fixes                  | 🎨     |

---

## Final Rules

- A commit is not complete unless it clearly communicates intent
- Prefer clarity over cleverness
- Keep history readable and meaningful
- Code and commit history should tell the same story
