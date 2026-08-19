---
name: verification-before-completion
description: Gather fresh evidence before claiming behavior-changing work is done, fixed, passing, or ready. Use after implementation, review, E2E work, and documentation updates.
---

<!-- Skill metadata: 振る舞いを変更する作業について、完了・修正済み・成功・準備完了を宣言する前に新しい証拠を集める Skill です。 -->

# Verification before completion
<!-- 完了前の検証 -->

1. Re-read the relevant `REQ-*`, `AC-*`, and `TC-*` entries and confirm the specification quality checklist is honestly complete for the changed behavior.
<!-- 1. 仕様書の関連する `REQ-*`、`AC-*`、`TC-*` を読み直し、変更した振る舞いについて仕様品質チェックリストが実態どおりに完了していることを確認します。 -->
2. Confirm every changed behavior has automated evidence that asserts observable outcomes rather than only implementation interactions.
<!-- 2. 変更した各振る舞いに、実装上の相互作用だけではなく観測可能な結果を検証する自動化された証拠があることを確認します。 -->
3. Run the smallest relevant behavior tests with fresh commands and inspect the actual results.
<!-- 3. 関連する最小の振る舞いテストを新しいコマンドで実行し、実際の結果を確認します。 -->
4. For applicable browser-visible acceptance flows, run the mapped Playwright Test E2E cases.
<!-- 4. 該当するブラウザ向け受け入れフローでは、対応する Playwright Test E2E ケースを実行します。 -->
5. Run relevant broader regression, lint, type-check, and build commands required by the project.
<!-- 5. プロジェクトで必要な関連する広範囲の回帰、lint、型チェック、build コマンドを実行します。 -->
6. If documentation exists or user-visible behavior changed, run `python3 .claude/scripts/validate_docs.py` and confirm the guide matches the implementation.
<!-- 6. ドキュメントが存在するかユーザー向け振る舞いを変更した場合、`python3 .claude/scripts/validate_docs.py` を実行し、ガイドが実装と一致することを確認します。 -->
7. Update specification traceability with real automated-test locations and actual verification status. Never mark skipped, unavailable, flaky, or failing checks as passed.
<!-- 7. 仕様書の追跡情報を実際の自動テスト場所と検証状態で更新します。スキップ、利用不可、不安定、失敗したチェックを成功として記録しません。 -->
8. Report the commands/checks executed and the observed results before using completion language.
<!-- 8. 完了表現を使用する前に、実行したコマンド・チェックと観測した結果を報告します。 -->
