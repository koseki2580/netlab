---
name: review-spec-implementation
description: Review whether specification, behavior test cases, automated tests, implementation, Playwright E2E coverage, and user guide agree.
context: fork
agent: Explore
background: false
---

<!-- Skill metadata: 仕様書、振る舞いテストケース、自動テスト、実装、Playwright E2E、ユーザーガイドの整合性を独立コンテキストで確認する Skill です。 -->

Review the current project for consistency across the specification, mapped `TC-*` test cases, automated tests, implementation, applicable Playwright E2E tests, and `docs/user-guide/site/`.
<!-- 仕様書、対応する `TC-*` テストケース、自動テスト、実装、該当する Playwright E2E テスト、`docs/user-guide/site/` の整合性を確認します。 -->

Find mismatches, missing behavior coverage, incomplete specification quality items, tests that only assert implementation wiring, missing `TC-*` mappings, missing regression scenarios for fixed defects, stale user documentation, or unsupported completion claims. Return a concise report with file references and severity. Do not modify files.
<!-- 不一致、振る舞いカバレッジ不足、未完了の仕様品質項目、実装配線だけを検証するテスト、`TC-*` 対応漏れ、修正済み不具合の回帰シナリオ不足、古いユーザードキュメント、根拠のない完了主張を見つけます。ファイル参照と重要度を含む簡潔なレポートを返し、ファイルは変更しません。 -->
