---
name: package-user-guide
description: Validate and package docs/user-guide as a portable ZIP for sharing.
disable-model-invocation: true
---

<!-- Skill metadata: `docs/user-guide` を検証し、共有可能な ZIP にまとめる Skill です。 -->

# Package user guide
<!-- ユーザーガイドをパッケージ化する -->

This action creates a distribution artifact and should run only when explicitly invoked.
<!-- この処理は配布物を生成するため、明示的に呼び出された場合のみ実行します。 -->

1. Run `python3 .claude/scripts/validate_docs.py`.
<!-- 1. `python3 .claude/scripts/validate_docs.py` を実行します。 -->
2. If validation succeeds, run `python3 .claude/scripts/package_user_guide.py`.
<!-- 2. 検証が成功した場合は `python3 .claude/scripts/package_user_guide.py` を実行します。 -->
3. Report the generated `dist/user-guide.zip` path and validation status.
<!-- 3. 生成された `dist/user-guide.zip` のパスと検証結果を報告します。 -->
4. Do not package a guide that failed validation.
<!-- 4. 検証に失敗したガイドはパッケージ化しません。 -->
