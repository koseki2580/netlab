---
name: e2e-playwright
description: Design and run Playwright Test end-to-end checks for browser-visible acceptance behavior. Use for critical user journeys, UI integration, and browser-level acceptance verification.
---

<!-- Skill metadata: ブラウザから見える受け入れ振る舞いを Playwright Test で設計・実行する Skill です。 -->

# Playwright E2E
<!-- Playwright E2E -->

1. Re-read the relevant `AC-*` and `TC-*` entries in the specification. Add an E2E `TC-*` first if the browser journey is not yet specified.
<!-- 1. 仕様書の関連 `AC-*` と `TC-*` を読み直します。ブラウザジャーニーがまだ仕様化されていなければ、先に E2E の `TC-*` を追加します。 -->
2. Use Playwright Test (`@playwright/test`). Reuse the project's existing Playwright setup. If none exists and browser E2E is required, add the smallest compatible setup using the project's package manager unless project constraints forbid dependency changes.
<!-- 2. Playwright Test (`@playwright/test`) を使用します。既存の Playwright 構成があれば再利用します。存在せずブラウザ E2E が必要な場合、プロジェクト制約が依存追加を禁止していなければ、その package manager に合わせた最小構成を追加します。 -->
3. Express the test as user behavior: establish context, perform user-visible actions, assert user-observable outcomes.
<!-- 3. テストをユーザー振る舞いとして表現し、状況を作り、ユーザーから見える操作を行い、ユーザーから観測できる結果を検証します。 -->
4. Prefer Playwright locators based on user-facing attributes and explicit contracts. Avoid selectors coupled to DOM nesting, styling classes, or framework internals unless they are intentionally stable test contracts.
<!-- 4. ユーザー向け属性と明示的契約に基づく Playwright locator を優先します。意図的に安定したテスト契約でない限り、DOM 階層、style class、framework 内部へ結合した selector を避けます。 -->
5. Do not use E2E to prove internal function calls. Assert the visible/accessible result, navigation, data shown to the user, error state, or other browser-observable contract.
<!-- 5. E2E で内部関数呼び出しを証明しません。画面・アクセシビリティ上の結果、遷移、表示データ、エラー状態などブラウザから観測できる契約を検証します。 -->
6. Run the targeted Playwright test and then the relevant E2E suite. Use trace/UI/Inspector for diagnosis when useful, but base completion claims on a normal reproducible run.
<!-- 6. 対象 Playwright テストを実行し、その後に関連 E2E suite を実行します。必要なら trace/UI/Inspector を調査に使えますが、完了判断は通常の再現可能な実行結果に基づけます。 -->
7. Update specification traceability with the actual E2E test file/location and status.
<!-- 7. 実際の E2E テストファイル・場所・ステータスを仕様書の追跡表へ更新します。 -->

Use E2E selectively for high-value browser journeys. Keep lower-level behavior and integration tests for fast, precise feedback.
<!-- E2E は価値の高いブラウザジャーニーへ選択的に使用し、速く正確なフィードバックのため下位の振る舞い・integration テストも維持します。 -->
