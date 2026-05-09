# GitHub PR comment rules

## Applicability conditions

Load this file when the Git remote points to GitHub.

Detection examples:

- `git@github.com:owner/repo.git`
- `https://github.com/owner/repo.git`
- `ssh://git@github.com/owner/repo.git`
- GitHub Enterprise: `https://github.<company>.com/owner/repo.git`

## Comment types and posting targets on GitHub

| Common scope | Representation on GitHub | Preferred API/CLI |
|---|---|---|
| `inline` | Pull request review comment | `gh api repos/{owner}/{repo}/pulls/{pull_number}/comments` or the review API |
| `function` | inline comment on the function's first line or a representative line | converted to inline comment |
| `file` | file-level review comment | review API with `subject_type: file` |
| `summary` | PR conversation comment or review body | `gh pr comment` or the review API |

## Fetching existing comments

Before posting, check at least the following.

```bash
gh pr view <PR number> --comments

gh api repos/<owner>/<repo>/pulls/<PR number>/comments
```

To check for duplicate summary comments, also check issue comments.

```bash
gh api repos/<owner>/<repo>/issues/<PR number>/comments
```

## inline comments

A GitHub PR review comment is treated as a comment on the PR diff, distinct from regular issue comments and commit comments.

Required information:

```yaml
body: <comment body>
commit_id: <PR head SHA>
path: <file path>
line: <line number in the post-change file>
side: RIGHT
```

Older API formats sometimes need `position` for compatibility, but in general prefer `line` / `side`.
For comments on deleted lines, use `side: LEFT` together with `line`.

Example:

```bash
gh api \
  --method POST \
  repos/<owner>/<repo>/pulls/<PR number>/comments \
  -f body='<comment body>' \
  -f commit_id='<head_sha>' \
  -f path='src/foo.py' \
  -F line=42 \
  -f side='RIGHT'
```

## Multi-line comments

For comments spanning multiple lines, use `start_line` / `line` only when the provider supports it.
When you are not confident about provider support or the diff range, fall back to an inline comment on a representative line, or to summary.

## function comments

GitHub has no standalone "function comment" concept, so convert in this order.

1. If the function declaration line is in the diff, post an inline comment on that line.
2. Otherwise, post an inline comment on the most representative changed line within the function.
3. If no line can be identified, post a file comment.
4. If a file comment is not appropriate, post a summary comment.

Always state the target symbol name in the comment body.

```markdown
**Better**: Splitting the responsibilities of `parseConfig()` a little would make it easier to read.
```

## file comments

For comments on a whole file, prefer the review API's file-level comment.
If unavailable, fall back to summary.

Examples of targets for file comments:

- The README lacks explanation overall
- A configuration file's overall policy
- Boundary values are missing across the whole test file
- Direct edits to a generated file

## summary comments

A comment on the whole PR should not duplicate the main agent's final summary.
The subagent should post a summary comment only in the following cases:

- Within its own perspective, the same issue spans multiple places.
- Spreading it across inline comments would be hard to read.
- Provider constraints prevent inline/file comments.

Example:

```bash
gh pr comment <PR number> --body-file <comment body file>
```

## Bundling as a GitHub Review

When you can post multiple comments at once, you may bundle them via the review API.

- `event: COMMENT`: comments only
- `event: REQUEST_CHANGES`: when there is a blocking request-changes
- `event: APPROVE`: not used by this Skill in principle

A subagent should not flood with `REQUEST_CHANGES`. Follow the main agent or the explicitly defined operating rules for the final review state.

## GitHub-specific notes

- Do not confuse PR review comments with issue comments.
- Inline comments may only be attached to lines that exist in the diff.
- Use the PR's head SHA as `commit_id` in principle.
- Use `side: LEFT` for deleted lines and `side: RIGHT` for added or post-change lines.
- Do not write the same finding both inline and in summary.
- When file-level comments are unavailable in the environment, fall back to summary.
