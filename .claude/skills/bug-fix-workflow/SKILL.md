---
name: bug-fix-workflow
description: Fix behavior-affecting defects by reproducing the bug, defining intended behavior in the specification, adding a failing regression scenario, applying the smallest fix, and verifying against regressions.
---

<!-- Skill metadata: 振る舞いに影響する不具合を、再現、期待仕様の定義、失敗する回帰シナリオ追加、最小修正、回帰検証の順で修正する Skill です。 -->

# Bug-fix workflow
<!-- バグ修正ワークフロー -->

1. Read the bug report, relevant specification, existing automated tests, and affected implementation before changing production code.
<!-- 1. 本番コードを変更する前に、バグ報告、関連仕様書、既存自動テスト、影響する実装を読みます。 -->
2. Reproduce or otherwise confirm the reported incorrect observable behavior without modifying production code. Capture the actual observed result and the conditions that trigger it.
<!-- 2. 本番コードを変更せず、報告された誤った観測可能な振る舞いを再現または確認します。実際に観測した結果と発生条件を記録します。 -->
3. Determine the intended behavior from the existing specification. If it is missing, ambiguous, or conflicts with the report, use `clarify-requirements` when needed and update the specification with `spec-first` before fixing the code.
<!-- 3. 既存仕様書から期待する振る舞いを確定します。欠落、曖昧、または報告と矛盾する場合、必要に応じて `clarify-requirements` を使用し、コード修正前に `spec-first` で仕様書を更新します。 -->
4. Add or update a stable `TC-*` regression scenario in the specification that captures the bug as behavior: Given/precondition, When/action, Then/intended observable result, test level, and planned automated-test location.
<!-- 4. バグを振る舞いとして捉えた安定した `TC-*` 回帰シナリオを仕様書へ追加または更新します。Given/前提、When/操作、Then/期待する観測可能結果、テストレベル、予定する自動テスト場所を記録します。 -->
5. Use `specification-quality-checklist` for any material specification change before implementation.
<!-- 5. 仕様書を重要変更した場合は、実装前に `specification-quality-checklist` を使用します。 -->
6. Use `test-driven-development` for the regression scenario. The new or corrected automated test must fail for the bug for the expected behavioral reason before the production fix is written. A setup, fixture, import, syntax, environment, or selector failure is not a valid regression RED.
<!-- 6. 回帰シナリオには `test-driven-development` を使用します。新規または修正した自動テストは、本番修正を書く前に、バグにより期待した振る舞い上の理由で失敗しなければなりません。setup、fixture、import、構文、環境、selector の失敗は有効な回帰 RED ではありません。 -->
7. Apply the smallest production change that restores the specified behavior. Do not broaden the fix into unrelated refactoring or behavior changes.
<!-- 7. 仕様化された振る舞いを回復する最小の本番変更を適用します。無関係なリファクタリングや振る舞い変更へ修正範囲を広げません。 -->
8. Run the regression test and relevant nearby regression suite. For high-value browser-visible regressions, use `e2e-playwright` and Playwright Test when browser-level evidence is appropriate.
<!-- 8. 回帰テストと関連する周辺回帰スイートを実行します。価値の高いブラウザ向け回帰では、ブラウザレベルの証拠が適切な場合 `e2e-playwright` と Playwright Test を使用します。 -->
9. Update traceability with the real automated-test location and verified status. Keep the regression `TC-*` in the specification so the defect remains part of the product's behavioral history.
<!-- 9. 追跡情報を実際の自動テスト場所と検証済み状態で更新します。回帰 `TC-*` は仕様書に残し、不具合を製品の振る舞い履歴の一部として保持します。 -->
10. If the user guide incorrectly describes the intended behavior or the fix changes user instructions, use `build-user-guide`. If the existing guide already describes the restored behavior accurately, verify it and do not make meaningless documentation edits.
<!-- 10. ユーザーガイドが期待する振る舞いを誤って記載している場合、または修正で利用手順が変わる場合は `build-user-guide` を使用します。既存ガイドが復元した振る舞いを正しく記載済みなら、内容を確認し、意味のないドキュメント変更は行いません。 -->
11. Before claiming the bug is fixed, use `review-spec-implementation` and `verification-before-completion` and report the reproduction evidence, regression RED, passing regression evidence, and relevant broader checks.
<!-- 11. バグ修正済みと宣言する前に `review-spec-implementation` と `verification-before-completion` を使用し、再現証拠、回帰 RED、回帰成功証拠、関連する広範囲チェックを報告します。 -->
