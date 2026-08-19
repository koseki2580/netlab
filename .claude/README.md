# Portable `.claude/` workflow kit
<!-- 持ち運び可能な `.claude/` ワークフローキット -->

Copy this entire `.claude/` directory into the root of any Claude Code project. Claude Code supports project memory at `.claude/CLAUDE.md`, project rules under `.claude/rules/`, and project skills under `.claude/skills/`.
<!-- この `.claude/` ディレクトリ全体を任意の Claude Code プロジェクトのルートへコピーします。Claude Code は `.claude/CLAUDE.md` のプロジェクトメモリ、`.claude/rules/` のプロジェクトルール、`.claude/skills/` のプロジェクト Skill をサポートしています。 -->

The kit is self-contained: required workflow skills, references, specification/user-guide templates, and documentation scripts all live under `.claude/`. No external skill installation is required.
<!-- 必須ワークフロー Skill、references、仕様書・ユーザーガイドのテンプレート、ドキュメント用スクリプトをすべて `.claude/` 配下へ収めており、外部 Skill のインストールなしで自己完結します。 -->

## Expected project artifacts
<!-- プロジェクトで生成される成果物 -->

The workflow creates or maintains these project artifacts when needed:
<!-- 必要に応じて、ワークフローは次のプロジェクト成果物を作成または維持します。 -->

```text
docs/user-guide/
├── README.md
├── specifications/
│   └── specification.md
└── site/
    ├── index.html
    └── assets/
        ├── css/styles.css
        └── js/
            ├── app.js
            └── content.js
```

Use `/context` to confirm `.claude/CLAUDE.md` is loaded and `/skills` to inspect the available project skills.
<!-- `/context` で `.claude/CLAUDE.md` が読み込まれていることを確認し、`/skills` で利用可能なプロジェクト Skill を確認します。 -->

## Built-in workflow skills
<!-- 同梱ワークフロー Skill -->

The runtime workflow uses the local skills directly: `clarify-requirements` when needed; `spec-first` and `specification-quality-checklist` for new or changed behavior; `bug-fix-workflow` for behavior-affecting defects; `test-driven-development`; `e2e-playwright` for browser acceptance behavior; `build-user-guide` for applicable user-visible documentation; `review-spec-implementation`; and `verification-before-completion`. `package-user-guide` is used only for explicit ZIP packaging requests.
<!-- 実行時のワークフローはローカル Skill を直接使用します。必要時の `clarify-requirements`、新規または変更する振る舞いでは `spec-first` と `specification-quality-checklist`、振る舞いに影響する不具合では `bug-fix-workflow`、`test-driven-development`、ブラウザ受け入れ振る舞いでは `e2e-playwright`、該当するユーザー向けドキュメントでは `build-user-guide`、その後 `review-spec-implementation` と `verification-before-completion` を使用します。`package-user-guide` は ZIP 化が明示的に依頼された場合だけ使用します。 -->
