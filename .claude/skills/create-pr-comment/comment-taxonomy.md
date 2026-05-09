# Comment taxonomy

## Comment types

The comment type expresses the intent of the review. Treat it separately from provider-specific states such as "Approve / Request changes".

| type | Label | Purpose | blocking |
|---|---|---|---|
| `request-changes` | request changes | A fix is required before merge | true |
| `better` | Better | Clearly better to fix, but not required | false |
| `suggestion` | suggestion | Presents an improvement option | false |
| `question` | question | Confirms intent, spec, or assumptions | depends |
| `comment` | comment | Information sharing or supplementary note | false |
| `praise` | praise | Highlights a good implementation or judgment | false |

---

## request-changes

A fix is required before merging the PR.

Use when:

- Bug or incorrect behavior
- Security issue
- Risk of data loss
- Change clearly inconsistent with the spec
- Backward-incompatible change
- Change likely to let incorrect behavior slip through without tests

Example:

```markdown
**request-changes**: An `IndexError` is raised when an empty array is passed.

The caller allows empty arrays, so this becomes a runtime exception as-is.

```python
# Suggested fix
return items[0] if items else None
```
```

---

## Better (better)

Not a merge blocker, but clearly better to fix.

Use when:

- Maintainability or readability improves significantly
- It prevents future bugs
- The tests can prove the spec more strongly
- Implementation intent becomes clearer

Example:

```markdown
**Better**: The intent of this branch is hard to read from the test name; using a test name that makes the boundary value explicit would be better.

Example: `returns_empty_result_when_limit_is_zero`
```

---

## suggestion

Presents an improvement option. Adoption is optional.

Use when:

- A better way to write it exists
- A small refactoring candidate
- There is room for performance improvement, but it is not a problem at the moment

Example:

```markdown
**suggestion**: Keeping `filter` and `map` separate is fine, but if you want to process in a single pass you can combine them with `reduce`.
```

---

## question

Confirming intent or design. Cannot conclude it is a problem, but verification is needed.

Use when:

- The design intent is unclear
- It looks like out-of-spec behavior, but you are not certain
- Important preconditions need confirmation

Example:

```markdown
**question**: Is `strict=False` here intentional?

I want to confirm whether there is a use case that needs to skip validation.
```

---

## comment

Information sharing, supplementary notes, or context for decisions.

Use when:

- It is not a direct request to fix
- You want to share what the reviewer checked
- You want to leave material for future consideration

Example:

```markdown
**comment**: I confirmed that this change does not affect the existing cache key format.
```

---

## praise

Explicitly conveys a good implementation or judgment.

Use when:

- You found a particularly good approach or design
- A difficult problem is solved well
- There is an implementation policy worth maintaining going forward

Example:

```markdown
**praise**: Extracting the error handling into a decorator made the caller's responsibility much clearer.
```

---

## severity

| severity | Description | Typical blocking |
|---|---|---|
| `critical` | Bug, security, data loss, severe spec violation | true |
| `important` | Design issue, missing tests, regression risk, compatibility concern | true or false |
| `minor` | Readability, minor improvement, non-essential cleanup | false |
| `nit` | Very small remark, can be ignored | false |

Even when there are multiple `nit` items, consolidate them into a single comment.

---

## confidence

| confidence | Description | Post comment |
|---|---|---|
| `high` | The issue is clear | yes |
| `medium` | The issue is likely | yes; phrase as a question if needed |
| `low` | Not confident | no; record under `findings_not_commented` |

---

## Comment scope

| scope | Description |
|---|---|
| `inline` | Comment tied to a specific diff line |
| `function` | Comment at the symbol level (function, method, type) |
| `file` | Comment on a whole file |
| `summary` | Comment on the entire PR or across multiple files |
