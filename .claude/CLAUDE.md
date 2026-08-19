# Portable Claude Code development workflow
<!-- 持ち運び可能な Claude Code 開発ワークフロー -->

@context/project-context.xml

## Required workflow skills
<!-- 必須ワークフロー Skill -->

- If the request has material ambiguity, use `clarify-requirements` before changing behavior.
<!-- 要望に重要な曖昧さがある場合、振る舞いを変更する前に `clarify-requirements` を使用します。 -->
- For every new feature or behavior change, use `spec-first`, then `specification-quality-checklist`, before implementation.
<!-- すべての新機能または振る舞い変更では、実装前に `spec-first`、続いて `specification-quality-checklist` を使用します。 -->
- For every behavior-affecting bug fix, use `bug-fix-workflow`. Do not patch production behavior before the regression scenario has a valid RED.
<!-- すべての振る舞いに影響するバグ修正では `bug-fix-workflow` を使用します。回帰シナリオが有効な RED になる前に本番の振る舞いを修正しません。 -->
- For every production behavior change, use `test-driven-development` and follow RED-GREEN-REFACTOR.
<!-- すべての本番の振る舞い変更では `test-driven-development` を使用し、RED-GREEN-REFACTOR に従います。 -->
- For browser-visible acceptance behavior, use `e2e-playwright` and Playwright Test.
<!-- ブラウザから観測できる受け入れ振る舞いには `e2e-playwright` と Playwright Test を使用します。 -->
- For every user-visible change, use `build-user-guide` in the same change.
<!-- すべてのユーザーから見える変更では、同じ変更内で `build-user-guide` を使用します。 -->
- Before claiming completion for behavior-changing work, use `review-spec-implementation`, then `verification-before-completion`.
<!-- 振る舞いを変更する作業の完了を宣言する前に、`review-spec-implementation`、続いて `verification-before-completion` を使用します。 -->
- Use `package-user-guide` only when a shareable documentation ZIP is explicitly requested.
<!-- 共有可能なドキュメント ZIP が明示的に求められた場合のみ `package-user-guide` を使用します。 -->
