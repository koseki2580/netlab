# Review System Maturity Notes

This file records how the review system has been extended from a checklist-style review into a review cycle that can withstand operational use. Reference it from a maturity perspective, not for specific evaluation points.

## Added Capabilities

1. Made the orchestration capabilities of the PR side and the implementation-time side symmetric.
2. Made the main agent's dynamic context acquisition responsibility explicit.
3. Defined the meta-review feedback loop with a maximum of one iteration.
4. Added risk_flags aggregation rules to both the PR side and the implementation-time side.
5. Wired CLAUDE.md-derived project_rules into both sides.
6. Defined handling of large changes, deletions, and renames.
7. Connected changed-line coverage to severity judgments in test reviews.
8. Added a learning loop, dynamic validation, and interactive follow-up.
9. Added symmetry-preservation guardrails.

## Operational Requirements

- The learning loop becomes accurate only after actual resolved/dismissed/accepted outcomes are fed in.
- Limit dynamic validation to what can be executed safely. Do not run infrastructure-changing commands.
- Limit interactive follow-up to re-evaluation based on new facts gained from the reply, not repetition of the same claim.
