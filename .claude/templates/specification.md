# Product Specification
<!-- 製品仕様書 -->

**Status:** Draft  
<!-- 状態: Draft -->
**Last updated:** YYYY-MM-DD  
<!-- 最終更新日 -->
**Source of truth for:** externally observable product behavior, acceptance criteria, and behavior-defining test cases
<!-- 外部から観測できる製品振る舞い、受け入れ条件、振る舞いを定義するテストケースの唯一の正 -->

## 1. Purpose
<!-- 1. 目的 -->

Describe what the product or feature does for users or dependent systems and why it exists.
<!-- 製品または機能がユーザーや依存システムに何を提供し、なぜ存在するかを記述します。 -->

## 2. Scope
<!-- 2. 対象範囲 -->

Describe the behavior covered by this specification and the important boundaries of the change.
<!-- この仕様書が対象とする振る舞いと、変更の重要な境界を記述します。 -->

## 3. Terminology
<!-- 3. 用語 -->

| Term | Meaning |
|---|---|
| User | A person using the product. |

Define only terms whose meaning could materially affect implementation or acceptance.
<!-- 実装または受け入れへ実質的に影響し得る意味を持つ用語だけを定義します。 -->

## 4. Functional requirements
<!-- 4. 機能要件 -->

- **REQ-001 (MUST):** Replace this with an externally observable requirement.
<!-- `REQ-001` を外部から観測可能な要件へ置き換えます。 -->
- **REQ-002 (SHOULD):** Replace this with a recommended behavior if applicable.
<!-- 必要なら `REQ-002` を推奨振る舞いへ置き換えます。 -->

## 5. Non-functional requirements
<!-- 5. 非機能要件 -->

Record only applicable, observable, or measurable quality requirements. Consider performance, reliability, accessibility, privacy, portability, and operability. If none materially apply, write `N/A` and a brief reason.
<!-- 該当する観測可能または測定可能な品質要件だけを記録します。性能、信頼性、アクセシビリティ、プライバシー、可搬性、運用性を検討します。実質的に該当しない場合は `N/A` と短い理由を記載します。 -->

- **NFR-001:** ...

## 6. Constraints and compatibility
<!-- 6. 制約と互換性 -->

Describe supported environments, protocol/API constraints, external dependencies, version constraints, and compatibility expectations that materially affect the behavior or implementation. Otherwise write `N/A` with a reason.
<!-- 振る舞いまたは実装へ実質的に影響する対応環境、プロトコル・API 制約、外部依存、バージョン制約、互換性要件を記述します。該当しない場合は理由付きで `N/A` とします。 -->

## 7. Behavior
<!-- 7. 振る舞い -->

Describe inputs/actions, outputs, state transitions, externally meaningful side effects, and user-visible behavior without coupling the contract to private implementation details.
<!-- 入力・操作、出力、状態遷移、外部的に意味のある副作用、ユーザーから見える振る舞いを、private 実装詳細へ結合せず記述します。 -->

## 8. Failure behavior and edge cases
<!-- 8. 失敗時の振る舞いとエッジケース -->

- Define invalid input and the expected observable response.
<!-- 無効入力と期待する観測可能な応答を定義します。 -->
- Define boundary cases, failure modes, and recovery behavior where applicable.
<!-- 該当する境界ケース、失敗モード、復旧時の振る舞いを定義します。 -->
- If no meaningful failure or edge behavior applies, write `N/A` with a reason.
<!-- 意味のある失敗時またはエッジ時の振る舞いが該当しない場合は理由付きで `N/A` とします。 -->

## 9. Security considerations
<!-- 9. セキュリティ観点 -->

Consider authentication, authorization, trust boundaries, sensitive data, input handling, secrets, abuse cases, and security-sensitive errors when applicable. If this change does not materially affect security, write `N/A` with a reason.
<!-- 該当する場合、認証、認可、信頼境界、機密データ、入力処理、secret、悪用ケース、セキュリティ上重要なエラーを検討します。この変更がセキュリティへ実質的に影響しない場合は理由付きで `N/A` とします。 -->

## 10. Migration and backward compatibility
<!-- 10. 移行と後方互換性 -->

Describe data/schema migration, API compatibility, rollout, rollback, and existing-user impact when applicable. Otherwise write `N/A` with a reason.
<!-- 該当する場合、データ・スキーマ移行、API 互換性、ロールアウト、ロールバック、既存ユーザーへの影響を記述します。該当しない場合は理由付きで `N/A` とします。 -->

## 11. Non-goals
<!-- 11. 非目標 -->

- State behavior intentionally outside this product/change.
<!-- この製品・変更で意図的に対象外とする振る舞いを記載します。 -->

## 12. Acceptance criteria
<!-- 12. 受け入れ条件 -->

- **AC-001:** Given ..., when ..., then the user/system observes ...
<!-- `AC-001`: Given ..., when ..., then ユーザーまたはシステムから ... が観測できる。 -->
- **AC-002:** Given ..., when ..., then ...
<!-- `AC-002`: Given ..., when ..., then ... -->

Acceptance criteria must be observable and unambiguous enough that independent implementations should agree on the expected result.
<!-- 受け入れ条件は観測可能で、独立した実装でも期待結果について一致できる程度に明確でなければなりません。 -->

## 13. Behavior test cases
<!-- 13. 振る舞いテストケース -->

Record behavior-defining scenarios before implementation. Describe what must be true, not how mocks or private functions are wired. Keep regression scenarios for fixed bugs so the defect remains permanently covered.
<!-- 実装前に振る舞いを定義するシナリオを記録します。mock や private 関数の配線ではなく、何が成立すべきかを記述します。修正済みバグの回帰シナリオは残し、不具合を恒久的にカバーします。 -->

| Test case | Related AC | Level | Given / precondition | When / action | Then / observable result | Automated test |
|---|---|---|---|---|---|---|
| TC-001 | AC-001 | unit/behavior | ... | ... | ... | Planned: `tests/...` |
| TC-002 | AC-002 | E2E | ... | ... | ... | Planned: `e2e/...` |

Guidance:
<!-- 記述ガイド: -->

- Prefer the smallest test level that proves the behavior.
<!-- 振る舞いを証明できる最小のテストレベルを優先します。 -->
- Use Playwright Test for high-value browser-visible E2E acceptance journeys.
<!-- 価値の高いブラウザから見える E2E 受け入れジャーニーには Playwright Test を使用します。 -->
- Do not specify "method X is called" unless that interaction is itself an explicit contract; specify the resulting state, output, error, persisted effect, or other observable outcome instead.
<!-- interaction 自体が明示的契約でない限り「method X が呼ばれる」と記述せず、その結果となる状態、出力、エラー、永続化された効果など観測可能な結果を記述します。 -->

## 14. Examples
<!-- 14. 例 -->

Provide concrete examples where they reduce ambiguity.
<!-- 曖昧さを減らせる場合は具体例を記載します。 -->

## 15. Assumptions / open questions
<!-- 15. 仮定・未解決事項 -->

Record non-blocking assumptions here. Material blockers should be clarified with the user before implementation.
<!-- 作業を妨げない仮定をここへ記録します。重要なブロッカーは実装前にユーザーへ確認します。 -->

## 16. Specification quality checklist
<!-- 16. 仕様品質チェックリスト -->

Complete this before implementation. Use `specification-quality-checklist` to review it. Mark an applicability-based item `N/A` with a brief reason when it does not materially apply.
<!-- 実装前にこのチェックリストを完了します。`specification-quality-checklist` で確認します。適用可否に依存する項目が実質的に該当しない場合は、短い理由付きで `N/A` とします。 -->

- [ ] Purpose and scope are explicit.
<!-- 目的と対象範囲が明確です。 -->
- [ ] Material terminology is defined.
<!-- 重要な用語が定義されています。 -->
- [ ] Functional requirements are observable and use stable IDs.
<!-- 機能要件が観測可能で安定した ID を使用しています。 -->
- [ ] Applicable non-functional requirements are measurable/observable, or `N/A` is justified.
<!-- 該当する非機能要件が測定可能・観測可能、または `N/A` の理由があります。 -->
- [ ] Constraints and compatibility expectations are explicit, or `N/A` is justified.
<!-- 制約と互換性要件が明示されている、または `N/A` の理由があります。 -->
- [ ] Failure modes, edge cases, and recovery behavior are covered, or `N/A` is justified.
<!-- 失敗モード、エッジケース、復旧動作が扱われている、または `N/A` の理由があります。 -->
- [ ] Security considerations are covered, or `N/A` is justified.
<!-- セキュリティ観点が扱われている、または `N/A` の理由があります。 -->
- [ ] Migration and backward compatibility are covered, or `N/A` is justified.
<!-- 移行と後方互換性が扱われている、または `N/A` の理由があります。 -->
- [ ] Acceptance criteria are unambiguous and observable.
<!-- 受け入れ条件が曖昧でなく観測可能です。 -->
- [ ] `TC-*` scenarios describe behavior, not implementation wiring.
<!-- `TC-*` シナリオが実装配線ではなく振る舞いを記述しています。 -->
- [ ] Material ambiguities have been clarified with the user.
<!-- 重要な曖昧さはユーザーへ確認済みです。 -->
- [ ] Traceability is complete for changed behavior.
<!-- 変更した振る舞いの追跡性が完成しています。 -->

## 17. Traceability
<!-- 17. 追跡性 -->

| Requirement | Acceptance | Test case | Test evidence | User guide section | Status |
|---|---|---|---|---|---|
| REQ-001 | AC-001 | TC-001 | `tests/...` | Getting Started | Planned |
| REQ-002 | AC-002 | TC-002 | `e2e/...` | Usage | Planned |
