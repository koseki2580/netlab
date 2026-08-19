---
name: specification-quality-checklist
description: Check that a Markdown specification is complete, unambiguous, behavior-focused, testable, and traceable before implementation or completion.
---

<!-- Skill metadata: Markdown 仕様書が実装または完了前に、完全・明確・振る舞い中心・テスト可能・追跡可能であることを確認する Skill です。 -->

# Specification quality checklist
<!-- 仕様品質チェックリスト -->

Use this skill after creating or materially changing the specification and before implementation begins. Use it again before completion when the specification changed during implementation.
<!-- 仕様書を作成または重要変更した後、実装開始前にこの Skill を使用します。実装中に仕様書が変更された場合は完了前にも再度使用します。 -->

1. Confirm the purpose and scope describe the user or system outcome and clearly state what is in and out of scope.
<!-- 1. 目的と対象範囲がユーザーまたはシステムの成果を記述し、対象内・対象外を明確にしていることを確認します。 -->
2. Confirm terminology is defined where a term could be interpreted in more than one materially different way.
<!-- 2. 複数の重要な解釈があり得る用語は定義されていることを確認します。 -->
3. Confirm every functional requirement is externally observable and uses clear normative language where appropriate.
<!-- 3. すべての機能要件が外部から観測可能で、必要に応じて明確な規範表現を使用していることを確認します。 -->
4. Review non-functional requirements such as performance, reliability, security, accessibility, privacy, portability, and operability when relevant. Mark irrelevant areas as `N/A` with a brief reason instead of inventing requirements.
<!-- 4. 関連する場合は性能、信頼性、セキュリティ、アクセシビリティ、プライバシー、可搬性、運用性などの非機能要件を確認します。該当しない項目は要件を捏造せず、短い理由付きで `N/A` とします。 -->
5. Confirm constraints, compatibility expectations, supported environments, and external dependencies are explicit when they can affect implementation or users.
<!-- 5. 実装またはユーザーへ影響し得る制約、互換性、対応環境、外部依存が明示されていることを確認します。 -->
6. Confirm invalid inputs, boundary cases, failure modes, recovery behavior, and meaningful error outcomes are defined where applicable.
<!-- 6. 該当する場合、無効入力、境界ケース、失敗モード、復旧動作、意味のあるエラー結果が定義されていることを確認します。 -->
7. Confirm security considerations are addressed for authentication, authorization, sensitive data, trust boundaries, input handling, and abuse cases when applicable. Use `N/A` with a reason when security is not materially affected.
<!-- 7. 該当する場合、認証、認可、機密データ、信頼境界、入力処理、悪用ケースのセキュリティ観点が扱われていることを確認します。セキュリティへ実質的な影響がない場合は理由付きで `N/A` とします。 -->
8. Confirm backward compatibility, migration, data/schema changes, rollout, and rollback expectations are defined when existing users or persisted data can be affected.
<!-- 8. 既存ユーザーや永続データへ影響し得る場合、後方互換性、移行、データ・スキーマ変更、ロールアウト、ロールバックの期待が定義されていることを確認します。 -->
9. Confirm every acceptance criterion is unambiguous, observable, and specific enough that two independent implementers should reach the same behavioral interpretation.
<!-- 9. すべての受け入れ条件が曖昧でなく観測可能で、独立した2人の実装者が同じ振る舞い解釈へ到達できる程度に具体的であることを確認します。 -->
10. Confirm each behavior-defining `TC-*` scenario describes Given/precondition, When/action, Then/observable result, and an appropriate test level without encoding private implementation details.
<!-- 10. 各振る舞い定義 `TC-*` シナリオが Given/前提、When/操作、Then/観測可能結果、適切なテストレベルを記述し、private 実装詳細を埋め込んでいないことを確認します。 -->
11. Confirm traceability connects each changed requirement to acceptance criteria, behavior test cases, automated-test evidence, and the user-guide section when user-facing documentation applies.
<!-- 11. 変更した各要件が、受け入れ条件、振る舞いテストケース、自動テスト証拠、ユーザー向けドキュメントが該当する場合はユーザーガイド節へ追跡できることを確認します。 -->
12. Search for vague words such as "fast", "appropriate", "normally", "as needed", "user-friendly", or "should work" and replace them with measurable or observable language when they affect acceptance.
<!-- 12. 「fast」「appropriate」「normally」「as needed」「user-friendly」「should work」など曖昧な語を探し、受け入れに影響する場合は測定可能または観測可能な表現へ置き換えます。 -->
13. If any unresolved ambiguity can materially change behavior, compatibility, security, data semantics, or acceptance, use `clarify-requirements` before implementation. Do not silently choose among materially different interpretations.
<!-- 13. 未解決の曖昧さが振る舞い、互換性、セキュリティ、データ意味、受け入れを実質的に変え得る場合、実装前に `clarify-requirements` を使用します。重要に異なる解釈から黙って選択しません。 -->
14. Update the checklist section in the specification honestly. Do not mark an item complete when it is unknown, unverified, or merely assumed.
<!-- 14. 仕様書のチェックリスト節を実態どおりに更新します。不明、未検証、単なる仮定の項目を完了扱いにしません。 -->
