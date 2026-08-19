---
name: build-user-guide
description: Create or update the portable offline HTML user guide for implemented user-visible behavior.
---

<!-- Skill metadata: 実装済みのユーザー向け振る舞いに対して、持ち運び可能なオフライン HTML ユーザーガイドを作成・更新する Skill です。 -->

# Build user guide
<!-- ユーザーガイドを構築・更新する -->

1. If the guide does not exist, run `python3 .claude/scripts/scaffold_docs.py` to create the specification (if missing), README, and HTML guide from `.claude/templates/`.
<!-- 1. ガイドが存在しない場合、`python3 .claude/scripts/scaffold_docs.py` を実行し、`.claude/templates/` から仕様書（未作成時）、README、HTML ガイドを作成します。 -->
2. Compare the guide with the accepted and implemented user-visible behavior. Update `docs/user-guide/site/` only where the guide is missing, stale, or inaccurate; do not create meaningless documentation churn when the existing guide already describes the behavior correctly.
<!-- 2. ガイドを合意済みかつ実装済みのユーザー向け振る舞いと比較します。ガイドが欠落、古い、不正確な箇所だけ `docs/user-guide/site/` を更新し、既存ガイドが振る舞いを正しく記述済みなら意味のないドキュメント変更を作りません。 -->
3. Structure content as small user-focused sections. Keep paragraphs short, keep one main idea per paragraph, and split long material into meaningful sections, steps, lists, examples, or callouts.
<!-- 3. コンテンツはユーザー視点の小さなセクションに分けます。段落は短く、1段落につき主題を1つにし、長い内容は意味のあるセクション、手順、リスト、例、コールアウトに分割します。 -->
4. Maintain a sidebar table of contents with stable links to guide sections, and keep a clearly visible search bar near the top of the sidebar.
<!-- 4. ガイドの各セクションへ安定してリンクする目次サイドバーを維持し、サイドバー上部付近に明確に見える検索バーを配置します。 -->
5. Make search useful from `file://`: search section titles and body content client-side, preserve navigation to matches, and show a clear no-results state.
<!-- 5. `file://` でも検索を有用にします。セクションタイトルと本文をクライアントサイドで検索し、一致項目へのナビゲーションを維持し、結果がない場合を明確に表示します。 -->
6. Preserve Japanese/English language switching, light/dark theme, system theme fallback, stored explicit preferences, relative local assets, and direct `file://` operation.
<!-- 6. 日本語・英語切り替え、ライト・ダークテーマ、システムテーマの fallback、明示設定の保存、相対ローカルアセット、`file://` 直接動作を維持します。 -->
7. Keep Japanese and English user-guide content semantically aligned.
<!-- 7. 日本語と英語のユーザーガイド内容を意味的に一致させます。 -->
8. Run `python3 .claude/scripts/validate_docs.py` and fix failures before claiming the guide is complete.
<!-- 8. `python3 .claude/scripts/validate_docs.py` を実行し、ガイド完了を宣言する前に失敗を修正します。 -->
