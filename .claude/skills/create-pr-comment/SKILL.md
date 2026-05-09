---
name: create-pr-comment
description: Used when a PR review subagent posts validated findings as PR comments, formatted for the hosting service (GitHub / Bitbucket / etc.) detected from the Git remote
---

# Create PR Comment

## Principles

This Skill converts validated findings into PR comments and posts them in a format that matches the remote provider.

Judging the correctness of the findings is the responsibility of the reviewer agent, not this Skill.
This Skill is responsible for "what scope to write at", "where to post", "which provider-specific rules to apply", and "what to return".

## Separation of responsibilities

- `comment-taxonomy.md`: common rules for comment type, severity, and confidence
- This file: common rules for comment scope, posting decisions, provider detection, and return values
- `github.md`: GitHub-specific posting rules
- `bitbucket.md`: Bitbucket-specific posting rules

The reviewer agent first decides comment content and scope using the common rules, then loads the provider-specific rules for the target remote.

## Input

```yaml
finding:
  type: request-changes | better | suggestion | question | comment | praise
  severity: critical | important | minor | nit
  blocking: true | false
  confidence: high | medium | low
  scope: inline | function | file | summary
  file: <file path>
  line: <line number>        # for inline / function
  end_line: <end line number> # only when multi-line comments are supported
  symbol: <function or type name> # for function
  evidence: <evidence>
  recommendation: <suggested fix>
  body: <draft comment body>
pr:
  number: <PR number>
  head_sha: <PR head SHA>
  base_sha: <PR base SHA>
  repository: <owner/repo or workspace/repo>
```

## Provider detection

First, detect the PR hosting service from the Git remote.

```bash
git remote -v
```

Detection examples:

| Example remote URL | provider | Rules to load |
|---|---|---|
| `github.com:owner/repo.git` | github | `github.md` |
| `https://github.com/owner/repo.git` | github | `github.md` |
| `bitbucket.org:workspace/repo.git` | bitbucket-cloud | `bitbucket.md` |
| `https://bitbucket.org/workspace/repo.git` | bitbucket-cloud | `bitbucket.md` |
| `bitbucket.<company>.com/...` | bitbucket-data-center | `bitbucket.md` |

Priority when there are multiple remotes:

1. The explicitly specified remote
2. The upstream remote of the current branch
3. `origin`
4. Inferred from the PR URL

If detection fails, do not post the comment; return `commented: false` and `reason_if_not_commented: unknown_provider`.

## Selecting the comment type

Refer to `comment-taxonomy.md`.

| Situation | Comment type |
|---|---|
| Fix is required (bug, security, data loss, spec violation) | request changes / `request-changes` |
| Clearly better to fix, but not a merge blocker | Better / `better` |
| Presents an improvement option | suggestion / `suggestion` |
| Want to confirm intent | question / `question` |
| Information sharing only | comment / `comment` |
| Calls out something good | praise / `praise` |

## Selecting the comment scope

| Scope | When to use | Priority |
|---|---|---|
| `inline` | Findings tied to a specific changed line | Highest |
| `function` | Findings about a whole function, method, or type | Next after inline |
| `file` | Findings about an entire file | Higher than summary |
| `summary` | PR-wide, multi-file, or cross-cutting findings | Last |

### inline

Use for findings tied to specific lines, such as bugs, boundary conditions, missing exception handling, or wrong conditional branches.

### function

Use when something is better explained at the function level (responsibility, control flow, error handling, return value contract) rather than line-by-line.
If the provider does not directly support function-level comments, post as an inline comment on the function's first line or the most representative changed line.

### file

Use when findings are naturally handled at the file level, such as configuration files, documentation, or test file policy.
If the provider does not support file comments, fall back to summary.

### summary

Use for issues that span multiple files, inconsistencies with the PR description, or missing tests/docs — anything that would be hard to read if scattered as inline comments.

## Posting decision

Do not post in the following cases:

- `confidence: low`
- Unrelated to the PR diff
- A comment with the same intent already exists
- The same line already has a substantively identical comment
- Provider-specific rules do not allow safe posting at that scope
- Authentication info or PR number is missing

When not posting, return `commented: false` together with `reason_if_not_commented`.

## Duplicate check procedure

1. Fetch existing comments according to the provider-specific rules.
2. Check whether an existing comment exists on the same file, line, function, or summary.
3. If the comment body conveys the same point, do not post.
4. When the same problem appears in multiple places, do not flood with inline comments — consolidate into a summary or a representative-line comment.

## Common rules for comment body

- One finding per comment.
- The first sentence should state the comment type and the key point.
- State the evidence explicitly.
- For request-changes / Better, include a concrete suggested fix.
- Do not present speculation as fact.
- Do not comment on issues outside the scope.
- Avoid emotional or negative wording.

## Return value after posting

```yaml
commented: true | false
provider: github | bitbucket-cloud | bitbucket-data-center | unknown
comment_type: request-changes | better | suggestion | question | comment | praise
severity: critical | important | minor | nit
blocking: true | false
scope: inline | function | file | summary
location:
  file: <file path>
  line: <line number>
  end_line: <end line number>
  symbol: <function or type name>
comment_url: <URL of the posted comment>
comment_summary: >
  <one-sentence summary of the comment that was (or was not) posted>
reason_if_not_commented: >
  <only when commented: false>
provider_payload_summary: >
  <summary of which API/CLI form was used to post>
```

## Related files

- `comment-taxonomy.md` — definitions and use of comment types
- `github.md` — posting rules for GitHub PR comments
- `bitbucket.md` — posting rules for Bitbucket PR comments
