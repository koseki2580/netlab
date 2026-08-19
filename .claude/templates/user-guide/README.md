# Portable User Guide
<!-- 持ち運び可能なユーザーガイド -->

This directory is intentionally self-contained. Zip the entire `docs/user-guide` directory to share the Markdown specification and HTML guide independently of the source repository.
<!-- このディレクトリは意図的に自己完結しています。`docs/user-guide` 全体を ZIP にすれば、ソースリポジトリとは独立して Markdown 仕様書と HTML ガイドを共有できます。 -->

Open `site/index.html` directly in a modern desktop browser. Core functionality must not require a web server, package installation, or network access.
<!-- `site/index.html` を最新のデスクトップブラウザで直接開きます。主要機能は Web サーバー、package install、ネットワーク接続を必要としません。 -->

## Guide structure
<!-- ガイド構造 -->

Keep the guide easy to scan: use small focused sections, short paragraphs, and one main idea or user task per section. Split long explanations into headings, steps, lists, examples, or callouts instead of creating walls of text.
<!-- ガイドは読み取りやすく保ちます。小さく焦点を絞ったセクション、短い段落を使い、各セクションでは主題またはユーザー操作を1つにします。長い説明は文章の塊にせず、見出し、手順、リスト、例、コールアウトに分割します。 -->

The HTML guide must provide a sidebar table of contents and a clearly visible search bar near the top of the sidebar. Search must work entirely client-side from `file://` and cover useful content such as section titles and body text.
<!-- HTML ガイドには目次サイドバーと、その上部付近に明確に見える検索バーを配置します。検索は `file://` から完全にクライアントサイドで動作し、セクションタイトルや本文など有用な内容を対象にします。 -->

Keep section identifiers stable and meaningful so sidebar links, search results, and direct links remain useful as the guide evolves.
<!-- ガイドの更新後もサイドバーリンク、検索結果、直接リンクが有効に機能するよう、セクション ID は安定した意味のあるものにします。 -->

Validate from the repository root with `python3 .claude/scripts/validate_docs.py` and package with `python3 .claude/scripts/package_user_guide.py`.
<!-- リポジトリルートから `python3 .claude/scripts/validate_docs.py` で検証し、`python3 .claude/scripts/package_user_guide.py` でパッケージ化します。 -->
