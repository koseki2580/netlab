---
paths:
  - "docs/user-guide/site/**/*"
  - "docs/user-guide/README.md"
---

# Portable user-guide rules
<!-- 持ち運び可能なユーザーガイドのルール -->

## Content structure
<!-- コンテンツ構造 -->

- Organize the guide into small, focused sections. Prefer several short sections over one long section.
<!-- ガイドは小さく焦点を絞ったセクションに分けます。1つの長いセクションより、複数の短いセクションを優先します。 -->
- Each section should explain one user task, concept, decision, or troubleshooting topic.
<!-- 各セクションでは、1つのユーザー操作、概念、判断事項、またはトラブルシューティング項目を説明します。 -->
- Keep paragraphs short and focused on one idea. Split dense text with meaningful headings, lists, steps, examples, or callouts when that improves scanability.
<!-- 段落は短くし、1つの考えに集中させます。読み取りやすくなる場合は、意味のある見出し、リスト、手順、例、コールアウトで密な文章を分割します。 -->
- Write from the user's point of view. Explain what the user wants to accomplish, what to do, and what observable result to expect; avoid unnecessary implementation detail.
<!-- ユーザー視点で記述します。ユーザーが何を達成したいか、何を行うか、どのような結果が確認できるかを説明し、不要な実装詳細は避けます。 -->
- Give every navigable section a stable, meaningful ID so it can be linked from the sidebar and search results.
<!-- ナビゲーション対象の各セクションには、サイドバーや検索結果からリンクできる安定した意味のある ID を付けます。 -->

## Navigation and search
<!-- ナビゲーションと検索 -->

- Provide a persistent sidebar containing the guide table of contents on desktop layouts.
<!-- デスクトップレイアウトでは、ガイドの目次を含む常設サイドバーを提供します。 -->
- Keep the sidebar usable on narrow screens by moving or adapting it without making the guide inaccessible.
<!-- 狭い画面では、ガイドが利用できなくならないよう、サイドバーを移動または適応させます。 -->
- Place a clearly visible search bar near the top of the sidebar.
<!-- サイドバー上部付近に、明確に見える検索バーを配置します。 -->
- Search must work client-side from `file://` and match useful user-guide content such as section titles and body text without requiring a server or network access.
<!-- 検索は `file://` からクライアントサイドで動作し、サーバーやネットワーク接続なしでセクションタイトルや本文など有用なガイド内容を検索できなければなりません。 -->
- Search results must preserve usable navigation to matching sections and provide an understandable empty-result state.
<!-- 検索結果では一致したセクションへの利用可能なナビゲーションを維持し、結果がない場合も分かりやすい状態を表示します。 -->

## Portability and presentation
<!-- 持ち運び性と表示 -->

- The guide must work when `docs/user-guide` is copied or zipped independently of the source tree.
<!-- `docs/user-guide` をソースツリーとは独立してコピーまたは ZIP 化してもガイドが動作しなければなりません。 -->
- Core navigation, Japanese/English language switching, client-side search, and light/dark theme switching must work from `file://` without a web server.
<!-- 主要なナビゲーション、日本語・英語切り替え、クライアントサイド検索、ライト・ダークテーマ切り替えは Web サーバーなしで `file://` から動作しなければなりません。 -->
- Use only relative local assets for core functionality; no CDN, remote font, remote JavaScript, or remote CSS dependency.
<!-- 主要機能では相対パスのローカルアセットのみを使用し、CDN、外部フォント、外部 JavaScript、外部 CSS に依存させません。 -->
- Keep Japanese and English guide content semantically aligned.
<!-- 日本語と英語のガイド内容は意味的に一致させます。 -->
- Respect `prefers-color-scheme` when the user has not explicitly chosen a theme, and persist explicit language/theme choices when browser storage is available.
<!-- ユーザーがテーマを明示選択していない場合は `prefers-color-scheme` を尊重し、ブラウザストレージ利用時は明示的な言語・テーマ選択を保持します。 -->
- Prefer semantic HTML, keyboard-accessible controls, visible focus states, and readable contrast.
<!-- セマンティック HTML、キーボード操作可能なコントロール、視認可能なフォーカス、読みやすいコントラストを優先します。 -->
- Run `python3 .claude/scripts/validate_docs.py` after modifying the guide.
<!-- ガイドを変更した後は `python3 .claude/scripts/validate_docs.py` を実行します。 -->
