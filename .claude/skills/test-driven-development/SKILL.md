---
name: test-driven-development
description: Implement every production behavior change with strict behavior-focused RED-GREEN-REFACTOR TDD. Use for new behavior, behavior-changing bug fixes, and behavior changes.
---

<!-- Skill metadata: 新しい振る舞い、振る舞いを変更するバグ修正、振る舞い変更を、厳格な振る舞い中心 RED-GREEN-REFACTOR TDD で実装する Skill です。 -->

# Test-driven development
<!-- テスト駆動開発 -->

## RED
<!-- RED: 期待する振る舞いを先に失敗させる -->

1. Select one behavior scenario from the specification identified by a stable `TC-*` ID. If it does not exist, add the scenario to the specification before writing production code. For a reported defect, use `bug-fix-workflow` so the regression scenario captures the intended behavior before the fix.
<!-- 1. 仕様書から安定した `TC-*` ID を持つ振る舞いシナリオを1つ選びます。存在しない場合は、本番コードを書く前に仕様書へ追加します。報告された不具合では `bug-fix-workflow` を使用し、修正前に回帰シナリオで期待する振る舞いを記録します。 -->
2. Write the smallest automated test that proves the scenario's observable outcome. Reference the `TC-*` ID in the test name, metadata, or nearby comment where practical.
<!-- 2. シナリオの観測可能な結果を証明する最小の自動テストを書きます。可能であればテスト名、メタデータ、近くのコメントで `TC-*` ID を参照します。 -->
3. Test what the system does, not how it is wired. Assert returned values, public output, externally visible state, documented errors, persisted effects, protocol responses, or other contract-level outcomes.
<!-- 3. システムがどのように配線されているかではなく、何をするかをテストします。返り値、公開出力、外部から見える状態、仕様化されたエラー、永続化された効果、プロトコル応答など契約レベルの結果を検証します。 -->
4. Do not make "a function/method/mock was called" the primary proof of behavior when a stronger observable outcome can be asserted. Avoid brittle call-count and private-method assertions.
<!-- 4. より強い観測可能な結果を検証できる場合、「関数・メソッド・mock が呼ばれた」を振る舞いの主要な証拠にしません。壊れやすい呼び出し回数や private メソッドの assertion を避けます。 -->
5. Run the new test before implementation. Confirm that it fails because the specified behavior is missing or incorrect. Setup, import, fixture, syntax, environment, or selector failures do not count as RED.
<!-- 5. 実装前に新しいテストを実行します。仕様化した振る舞いが未実装または不正であることを理由に失敗することを確認します。setup、import、fixture、構文、環境、selector の失敗は RED とみなしません。 -->

## GREEN
<!-- GREEN: 最小の変更で振る舞いを成立させる -->

1. Write only the minimum production change required to make the selected `TC-*` scenario pass.
<!-- 1. 選択した `TC-*` シナリオを通すために必要な最小限の本番変更だけを書きます。 -->
2. Run the targeted test and confirm it passes for the expected behavior.
<!-- 2. 対象テストを実行し、期待する振る舞いで成功することを確認します。 -->
3. Run nearby regression tests when the changed surface can affect existing behavior.
<!-- 3. 変更範囲が既存の振る舞いへ影響し得る場合は、周辺の回帰テストも実行します。 -->

## REFACTOR
<!-- REFACTOR: 振る舞いを変えずに設計を改善する -->

1. Improve the design without changing specified behavior or adding unrequested behavior.
<!-- 1. 仕様化した振る舞いを変更したり、求められていない振る舞いを追加せずに設計を改善します。 -->
2. Keep the selected behavior tests green throughout refactoring.
<!-- 2. リファクタリング中も選択した振る舞いテストを GREEN に保ちます。 -->
3. Repeat RED-GREEN-REFACTOR for the next `TC-*` scenario.
<!-- 3. 次の `TC-*` シナリオについて RED-GREEN-REFACTOR を繰り返します。 -->

## Specification traceability
<!-- 仕様との追跡性 -->

- Every newly added behavior-defining test must have a corresponding `TC-*` scenario in `docs/user-guide/specifications/specification.md`.
<!-- 新しく追加する振る舞い定義用テストには、`docs/user-guide/specifications/specification.md` 内に対応する `TC-*` シナリオが必要です。 -->
- Record the scenario as behavior: Given/precondition, When/action, Then/observable result, test level, and automated test location. Do not copy framework-specific setup, mocks, helper implementation, or assertion syntax into the specification.
<!-- シナリオは振る舞いとして、Given/事前条件、When/操作、Then/観測可能結果、テストレベル、自動テストの場所を記録します。framework 固有の setup、mock、helper 実装、assertion 構文は仕様書へ転記しません。 -->
- Tests written only after production implementation are regression coverage, not evidence of test-first TDD. If exploratory production code was needed, discard or reset it before the real RED phase.
<!-- 本番実装の後だけに書かれたテストは回帰カバレッジであり、テストファースト TDD の証拠ではありません。探索的な本番コードが必要だった場合、本来の RED フェーズ前に破棄またはリセットします。 -->
