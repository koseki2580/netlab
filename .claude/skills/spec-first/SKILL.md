---
name: spec-first
description: Create or update the Markdown specification, acceptance criteria, and behavior test cases before implementing new or changed observable behavior.
---

<!-- Skill metadata: 実装前に Markdown 仕様書、受け入れ条件、振る舞いテストケースを作成・更新する Skill です。 -->

# Spec first
<!-- 仕様を先に定義する -->

1. If `docs/user-guide/specifications/specification.md` does not exist, run `python3 .claude/scripts/scaffold_docs.py --spec-only` to create it from `.claude/templates/specification.md`.
<!-- 1. `docs/user-guide/specifications/specification.md` がない場合、`python3 .claude/scripts/scaffold_docs.py --spec-only` を実行し `.claude/templates/specification.md` から作成します。 -->
2. Read the relevant request, specification, implementation, and tests.
<!-- 2. 関連する要望、仕様書、実装、テストを読みます。 -->
3. If material ambiguity remains, use `clarify-requirements` and ask the user before implementation.
<!-- 3. 重要な曖昧さが残る場合は `clarify-requirements` を使い、実装前にユーザーへ確認します。 -->
4. Translate the accepted request into observable requirements (`REQ-*`) and acceptance criteria (`AC-*`).
<!-- 4. 合意済みの要望を観測可能な要件 (`REQ-*`) と受け入れ条件 (`AC-*`) に変換します。 -->
5. Before writing production code, add planned behavior test cases (`TC-*`) using Given/When/Then semantics and an expected observable outcome. Choose the smallest appropriate test level; mark high-value browser journeys as E2E.
<!-- 5. 本番コードを書く前に、Given/When/Then と期待する観測可能結果を使った予定テストケース (`TC-*`) を追加します。最小の適切なテストレベルを選び、価値の高いブラウザジャーニーは E2E とします。 -->
6. Do not encode private implementation details, mock call expectations, or framework mechanics in the test-case description.
<!-- 6. テストケース記述に private 実装詳細、mock 呼び出し期待、フレームワークの仕組みを埋め込みません。 -->
7. Update applicable non-functional requirements, constraints, failure/edge behavior, security considerations, and compatibility/migration expectations. Use `N/A` with a brief reason when a section does not materially apply.
<!-- 7. 該当する非機能要件、制約、失敗・エッジ時の振る舞い、セキュリティ観点、互換性・移行要件を更新します。実質的に該当しない節は短い理由付きで `N/A` とします。 -->
8. Update traceability with requirement, acceptance, test-case IDs, planned automated-test location, guide section, and honest status.
<!-- 8. 要件・受け入れ・テストケース ID、予定する自動テスト場所、ガイド節、実態どおりのステータスを追跡表へ更新します。 -->
9. Use `specification-quality-checklist` and resolve any material specification gap before implementation.
<!-- 9. `specification-quality-checklist` を使用し、重要な仕様不足を実装前に解消します。 -->
10. Begin implementation only after the specification is precise enough to make the behavior test unambiguous.
<!-- 10. 振る舞いテストを曖昧なく書ける程度に仕様が明確になってから実装を始めます。 -->
