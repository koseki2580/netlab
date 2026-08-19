---
paths:
  - "docs/user-guide/specifications/**/*.md"
---

# Specification rules
<!-- 仕様書ルール -->

- Treat the specification as the source of truth for externally observable behavior.
<!-- 仕様書を外部から観測できる振る舞いの唯一の正として扱います。 -->
- Use normative language consistently: **MUST**, **SHOULD**, **MAY**.
<!-- 規範表現として **MUST**、**SHOULD**、**MAY** を一貫して使用します。 -->
- Separate functional requirements from applicable non-functional requirements, constraints, failure behavior, security considerations, and compatibility/migration expectations.
<!-- 機能要件を、該当する非機能要件、制約、失敗時の振る舞い、セキュリティ観点、互換性・移行要件から分けて記述します。 -->
- For applicability-based sections, use `N/A` with a brief reason when a concern does not materially apply. Do not invent requirements merely to fill the template.
<!-- 適用可否に依存する節では、実質的に該当しない場合は短い理由付きで `N/A` とします。テンプレートを埋めるためだけに要件を捏造しません。 -->
- Give requirements, acceptance criteria, and behavior test cases stable IDs such as `REQ-001`, `AC-001`, and `TC-001`.
<!-- 要件、受け入れ条件、振る舞いテストケースに `REQ-001`、`AC-001`、`TC-001` のような安定した ID を付与します。 -->
- Write test cases as behavioral scenarios: precondition/context, user/system action, and expected observable result.
<!-- テストケースは、前提・状況、ユーザーまたはシステムの操作、期待する観測可能な結果という振る舞いシナリオとして記述します。 -->
- Do not describe mock expectations, private method calls, internal call counts, or test-framework mechanics as product requirements.
<!-- mock の期待値、private メソッド呼び出し、内部の呼び出し回数、テストフレームワークの仕組みを製品要件として記述しません。 -->
- Every newly added behavior-defining automated test, including regression tests for bugs, must map to a `TC-*` row in the specification.
<!-- バグ回帰テストを含む、新しく追加する振る舞い定義用の自動テストは、仕様書の `TC-*` 行へ対応付けます。 -->
- Mark the intended level for each behavior test case: unit/behavior, integration, or E2E. Use E2E for high-value browser-visible acceptance journeys rather than duplicating every lower-level case.
<!-- 各振る舞いテストケースの想定レベルを unit/behavior、integration、E2E で示します。E2E は下位レベルの全ケースを重複させるのではなく、価値の高いブラウザ向け受け入れジャーニーに使用します。 -->
- Maintain traceability from requirement to acceptance criterion to test case/test evidence to user-guide section.
<!-- 要件→受け入れ条件→テストケース・テスト証拠→ユーザーガイド節の追跡性を維持します。 -->
- Complete the specification quality checklist before implementation. Do not mark unknown or unverified items complete.
<!-- 実装前に仕様品質チェックリストを完了します。不明または未検証の項目を完了扱いにしません。 -->
- Record unresolved but non-blocking assumptions explicitly; clarify material blockers with the user before implementation.
<!-- 未解決でも作業を妨げない仮定は明示し、重要なブロッカーは実装前にユーザーへ確認します。 -->
