window.USER_GUIDE_CONTENT = {
  ja: {
    meta: {
      siteTitle: "製品ユーザーガイド",
      guideLabel: "USER GUIDE",
      languageLabel: "言語",
      searchLabel: "検索",
      searchPlaceholder: "ガイドを検索...",
      themeLight: "ライト",
      themeDark: "ダーク",
      noResults: "一致する項目がありません。",
      resultCount: (count) => `${count} 件のセクション`,
      offlineNote: "このガイドはオフラインで利用できるように設計されています。"
    },
    sections: [
      {
        id: "getting-started",
        title: "はじめに",
        html: `<p>ここに製品の目的と最初の利用手順を記載します。</p>
               <div class="callout">このテンプレートは <code>file://</code> から直接開けます。</div>`
      },
      {
        id: "usage",
        title: "使い方",
        html: `<p>主要な操作、入力、出力、設定方法をユーザー視点で説明します。</p>
               <ul><li>実装済みの機能だけを記載します。</li><li>仕様書の受け入れ条件と矛盾しないようにします。</li></ul>`
      },
      {
        id: "troubleshooting",
        title: "トラブルシューティング",
        html: `<p>代表的なエラー、原因、復旧方法を記載します。</p>`
      }
    ]
  },
  en: {
    meta: {
      siteTitle: "Product User Guide",
      guideLabel: "USER GUIDE",
      languageLabel: "Language",
      searchLabel: "Search",
      searchPlaceholder: "Search the guide...",
      themeLight: "Light",
      themeDark: "Dark",
      noResults: "No matching sections.",
      resultCount: (count) => `${count} section${count === 1 ? "" : "s"}`,
      offlineNote: "This guide is designed to work offline."
    },
    sections: [
      {
        id: "getting-started",
        title: "Getting Started",
        html: `<p>Describe the product purpose and first-use steps here.</p>
               <div class="callout">This template can be opened directly from <code>file://</code>.</div>`
      },
      {
        id: "usage",
        title: "Usage",
        html: `<p>Explain key operations, inputs, outputs, and configuration from the user's point of view.</p>
               <ul><li>Document only implemented behavior.</li><li>Keep this guide consistent with specification acceptance criteria.</li></ul>`
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        html: `<p>Document common errors, causes, and recovery steps.</p>`
      }
    ]
  }
};
