# Bitbucket PR comment rules

## Applicability conditions

Load this file when the Git remote points to Bitbucket.

Detection examples:

- Bitbucket Cloud: `git@bitbucket.org:workspace/repo.git`
- Bitbucket Cloud: `https://bitbucket.org/workspace/repo.git`
- Bitbucket Data Center / Server: `https://bitbucket.<company>.com/scm/project/repo.git`

The API shape differs between Bitbucket Cloud and Bitbucket Data Center / Server, so determine which one based on the remote URL and the available CLI/API.

## Comment types and posting targets on Bitbucket

| Common scope | Representation on Bitbucket | Fallback |
|---|---|---|
| `inline` | pull request comment with inline/anchor location | summary |
| `function` | inline comment on a representative line | file or summary |
| `file` | file-level equivalent comment | summary |
| `summary` | pull request general comment | none |

## Fetching existing comments

Before posting, fetch the list of PR comments and check for duplicates.

Bitbucket Cloud example:

```bash
curl -s \
  https://api.bitbucket.org/2.0/repositories/<workspace>/<repo_slug>/pullrequests/<pr_id>/comments
```

Bitbucket Data Center / Server example:

```bash
curl -s \
  <base_url>/rest/api/1.0/projects/<project_key>/repos/<repo_slug>/pull-requests/<pr_id>/activities
```

## Bitbucket Cloud: inline comments

In Bitbucket Cloud, use `content.raw` for the PR comment body and attach `inline` information for line comments.

Conceptual payload:

```json
{
  "content": {
    "raw": "<comment body>"
  },
  "inline": {
    "path": "src/foo.py",
    "to": 42
  }
}
```

Use `from` when commenting on a deleted line or the pre-change side.
Use `to` when commenting on an added or post-change line.

## Bitbucket Data Center / Server: inline comments

In Bitbucket Data Center / Server, the format for specifying an inline location varies by environment and version.
In general, the file path, line number, and line type are specified via something equivalent to an `anchor`.

Conceptual payload:

```json
{
  "text": "<comment body>",
  "anchor": {
    "path": "src/foo.py",
    "line": 42,
    "lineType": "ADDED"
  }
}
```

Confirm the payload expected in the actual Bitbucket environment in use; when not confident, fall back to a summary comment.

## function comments

Bitbucket has no standalone "function comment" concept, so convert in this order.

1. If the function declaration line is in the diff, post an inline comment on that line.
2. Otherwise, post an inline comment on a representative changed line within the function.
3. If you are not confident about the inline location, post a file-equivalent comment or a summary comment.

Always state the target symbol name in the comment body.

```markdown
**Better**: In `loadConfig()` overall, validation and conversion responsibilities are mixed.
```

## file comments

Because the API representation of file-level comments differs between Bitbucket environments, handle in this order.

1. Use a file comment if a file-level comment API or UI-compatible payload is available.
2. Otherwise, use an inline comment if a representative line is clear.
3. Otherwise, use a summary comment.

When falling back from file to summary, include the target file in the heading.

```markdown
**Better**: About `tests/foo_test.py` overall

Boundary cases are missing, so adding at least the empty array case and the over-maximum case would be good.
```

## summary comments

In Bitbucket, summary comments are the most stable posting target.
When you are not confident about the inline or file location, do not force inline — consolidate into summary.

Bitbucket Cloud conceptual payload:

```json
{
  "content": {
    "raw": "<comment body>"
  }
}
```

Bitbucket Data Center / Server conceptual payload:

```json
{
  "text": "<comment body>"
}
```

## Bitbucket-specific notes

- Payloads differ between Cloud and Data Center / Server.
- When inline location is likely to fail, fall back to summary.
- For post-change lines use `to` (Cloud); for pre-change lines use `from`.
- For Data Center / Server, prefer the per-environment API differences.
- Do not write the same finding both inline and in summary.
- When falling back to summary, state the target file, line, and function name explicitly in the body.
