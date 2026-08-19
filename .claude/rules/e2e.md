---
paths:
  - "e2e/**/*"
  - "tests/e2e/**/*"
  - "**/*.e2e.*"
  - "playwright.config.*"
---

# Browser E2E rules
<!-- ブラウザ E2E ルール -->

- Use **Playwright Test** (`@playwright/test`) for browser-visible end-to-end acceptance flows.
<!-- ブラウザから見える E2E の受け入れフローには **Playwright Test** (`@playwright/test`) を使用します。 -->
- Write E2E tests from the user's perspective: navigate, interact through accessible/user-facing controls, and assert visible or otherwise user-observable outcomes.
<!-- E2E テストはユーザー視点で記述し、画面遷移、アクセシブル・ユーザー向けコントロールの操作、画面上などユーザーから観測できる結果の検証を行います。 -->
- Prefer role, label, text, and other user-facing locators or explicit test contracts over CSS structure, DOM ancestry, framework internals, or generated classes.
<!-- CSS 構造、DOM の親子関係、フレームワーク内部、生成 class より、role、label、text などユーザー向け locator または明示的なテスト契約を優先します。 -->
- Do not assert implementation wiring such as internal callback invocation when a visible outcome can be asserted instead.
<!-- 画面上の結果を検証できる場合、内部 callback が呼ばれたことなど実装配線を検証しません。 -->
- Map each behavior-defining E2E test to a `TC-*` entry in the specification and record the automated test location in traceability.
<!-- 振る舞いを定義する各 E2E テストを仕様書の `TC-*` へ対応付け、自動テストの場所を追跡表に記録します。 -->
- Use E2E for representative critical journeys and integration confidence; do not duplicate every lower-level behavior case in the browser.
<!-- E2E は代表的な重要ジャーニーと統合の信頼性確認に使用し、下位レベルの全振る舞いケースをブラウザで重複させません。 -->
- When debugging failures, use Playwright's trace/UI/inspector tooling when helpful, but completion requires a normal reproducible test run.
<!-- 失敗の調査では必要に応じて Playwright の trace/UI/inspector を使用できますが、完了には通常の再現可能なテスト実行が必要です。 -->
