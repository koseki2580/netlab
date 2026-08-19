---
paths:
  - "tests/**/*"
  - "test/**/*"
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/*_test.*"
---

# Behavior-focused test rules
<!-- 振る舞い中心のテストルール -->

- Test what the system should do when something happens: inputs/actions in, observable state/output/error/side effect out.
<!-- 「こうした場合はこうなる」という形で、入力・操作と、それに対する観測可能な状態・出力・エラー・副作用をテストします。 -->
- Prefer state-based and outcome-based assertions over interaction-based assertions.
<!-- interaction の検証より、状態や結果の検証を優先します。 -->
- Do not use "function/method X was called" or mock call counts as the primary proof that behavior is correct.
<!-- 「関数・メソッド X が呼ばれた」「mock が N 回呼ばれた」ことを、振る舞いが正しい主要な証拠として使用しません。 -->
- Interaction assertions are acceptable only when the interaction itself is an explicit external contract or when no stronger observable outcome can reasonably be asserted. Document the reason when it is not obvious.
<!-- interaction 自体が明示的な外部契約である場合、またはより強い観測可能結果を合理的に検証できない場合に限り interaction assertion を許可します。理由が明白でない場合は記録します。 -->
- Mock only boundaries that need isolation; do not let mocks define internal architecture through brittle call expectations.
<!-- 分離が必要な境界だけを mock し、壊れやすい呼び出し期待によって mock が内部アーキテクチャを固定しないようにします。 -->
- Each newly added behavior-defining test must map to a `TC-*` test case in `docs/user-guide/specifications/specification.md`; reference the ID in the test name or a nearby comment when practical.
<!-- 新しく追加する振る舞い定義用テストは `docs/user-guide/specifications/specification.md` の `TC-*` テストケースへ対応付け、可能ならテスト名または近くのコメントから ID を参照します。 -->
- A TDD RED phase must fail because the expected behavior is missing or wrong, not because of syntax, fixture, import, selector, or environment mistakes.
<!-- TDD の RED は、構文、fixture、import、selector、環境の誤りではなく、期待する振る舞いが未実装または不正であることを理由に失敗しなければなりません。 -->
- Keep tests deterministic and isolate unnecessary network/time/randomness dependencies.
<!-- テストは決定的にし、不要なネットワーク・時刻・乱数依存を分離します。 -->
- Prefer the smallest test scope that proves the behavior, then run broader regression checks before completion.
<!-- 振る舞いを証明できる最小のテスト範囲を優先し、完了前により広い回帰チェックを実行します。 -->
