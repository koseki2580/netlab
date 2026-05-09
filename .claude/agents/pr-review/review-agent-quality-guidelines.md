# PR Review Agent Quality Guidelines

PR review agents must not rely on the common template alone. Each agent follows its own perspective-specific thinking steps, severity criteria, and false-positive countermeasures.

## Related code reading

When the diff alone is insufficient, the agent reads the minimal necessary related code.

Examples to read:

- Code that calls the changed functions, types, or settings
- Existing tests, fixtures, snapshots, golden files
- Usages of the public API
- Application order of migration / deployment / config
- Callers, lock acquisition order, and shared state for concurrent code

Examples NOT to read or read excessively:

- Large-scale exploration not needed to ground a finding
- Files unrelated to this agent's perspective
- Investigations that keep widening scope while still low confidence

## Common pre-comment checklist

Always verify before posting a comment:

1. Is it directly related to the PR diff?
2. Can you state a concrete failure condition, operational impact, or maintenance impact?
3. Does it duplicate an existing comment?
4. Can it be posted at an appropriate granularity for the provider?
5. If marking as `request-changes`, is there a clear basis for fixing before merge?

## False-positive suppression

In principle, do NOT comment on the following:

- Implementations consistent with the project's existing direction
- Things that the spec clearly indicates will not be a problem given the input size or operational conditions
- Alternatives that are essentially a matter of taste
- Pre-existing whole-codebase issues that this PR does not make worse
- Suggested fixes that significantly exceed the current scope


## How to use comment examples

The examples in each agent are not meant to be pasted as templates; they are used to align the granularity of judgments.

A good comment generally includes:

- Concrete conditions under which it becomes a problem
- Scope of impact
- Alternative
- Why the alternative fits this PR
- Reason for `request-changes` / `better` / `suggestion` / `praise`

Typical bad comments:

- Stop at "looks slow", "looks risky", or "hard to read"
- Do not explain the cost of the alternative
- Push generic best-practices without checking project constraints
- Ignore good implementations when found
