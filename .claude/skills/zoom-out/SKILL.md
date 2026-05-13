---
name: zoom-out
description: Tell the agent to zoom out and give broader context or a higher-level perspective.
disable-model-invocation: true
---

# Zoom Out

User-invoked when the conversation has drifted into a narrow detail (one function, one bug, one file) and the user needs to see the surrounding shape before deciding what to do next.

## When the user invokes this

Treat the current focus as **one node** in a larger graph. Step back one level of abstraction and produce a map, not more detail.

## Output

Produce these sections, in order. Skip a section only if it would be empty after honest investigation.

### 1. The thing the user is looking at

One sentence naming the function / file / concept currently in focus, and what it does.

### 2. One layer up

What contains or calls this thing. Modules, callers, the parent feature, or the domain concept it lives under. Use the project's domain glossary vocabulary (check `CONTEXT.md` and `docs/` if present).

### 3. Sibling concerns

Other components at the same level — peers, alternatives, neighbors. The things adjacent to the current focus that a reader should know exist.

### 4. Map

A short list, table, or Mermaid diagram showing how those pieces connect. Prefer Mermaid when 4+ nodes are involved.

### 5. Where the user likely wants to go next

Two or three concrete next directions, framed as questions the user can pick from. Do NOT pick for them.

## Constraints

- **No new implementation work.** This skill produces orientation, not changes.
- **Use the project's vocabulary**, not invented names. If the codebase calls it `Order`, do not call it `Transaction`.
- **Cite specific paths** when naming modules — `src/billing/invoice.ts:42` beats "the invoice module".
- **Cap the response.** A zoom-out that needs scrolling has failed; tighten until it fits one screen.
