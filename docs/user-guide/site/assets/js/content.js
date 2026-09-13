window.USER_GUIDE_CONTENT = {
  ja: {
    meta: {
      siteTitle: "netlab ユーザーガイド",
      guideLabel: "USER GUIDE",
      languageLabel: "言語",
      searchLabel: "検索",
      searchPlaceholder: "ガイドを検索...",
      themeLight: "ライト",
      themeDark: "ダーク",
      noResults: "一致する項目がありません。",
      resultCount: (count) => `${count} 件のセクション`,
      offlineNote: "このガイドはネットワーク接続なしで利用できます。"
    },
    sections: [
      {
        id: "getting-started",
        title: "はじめに",
        html: `<p>netlab は、パケットが実際にどう流れるかを目で見て学ぶための道具です。機器を並べた図の上でパケットを送り、どの機器を通り、どこで届き、どこで落ちたかを1ホップずつ追えます。</p>
               <div class="callout">はじめての方は、まず<strong>入門コース</strong>から始めてください。ギャラリー最上部の「入門コースを始める」から開けます。何を押せばよいか迷わずに進める一本道です。</div>
               <p>52 本のレッスンは、その続きです。コースを終えてから、気になった話題を選んでください。</p>`
      },
      {
        id: "course",
        title: "入門コース",
        html: `<p>小さなネットワークを6つ、順番に見ていきます。各ステップでやることは1つだけです。</p>
               <ul>
                 <li><strong>2台をつなぐ</strong> — 同じネットワークなら間に何もなくても届きます。</li>
                 <li><strong>スイッチを挟む</strong> — スイッチは中身を書き換えず転送するだけです。</li>
                 <li><strong>3台目をつなぐ</strong> — スイッチは宛先のポートにだけ流します。</li>
                 <li><strong>2つのネットワーク、つながっていない</strong> — <em>わざと失敗する例です。</em>スイッチは別のネットワークへの行き方を知りません。</li>
                 <li><strong>ルータが間を埋める</strong> — 両方にアドレスを持つ機器が橋渡しをします。</li>
                 <li><strong>ルータはどう決めているか</strong> — 経路表の行に宛先を当てはめて決めています。</li>
               </ul>
               <p>途中でやめても、次に開いたときは止めたステップから再開します。</p>
               <div class="callout">4 番目のステップは失敗するのが正解です。押す前に「これは失敗する例です」と表示されます。壊れているわけではありません。</div>`
      },
      {
        id: "gallery",
        title: "ギャラリーの使い方",
        html: `<p>ギャラリーはレッスンの一覧です。左の列でカテゴリを選び、上の検索欄で名前・プロトコル・レイヤーから絞り込めます。</p>
               <ul>
                 <li><strong>むずかしさ</strong>（はじめて／慣れてきた／詳しく）とタグで絞り込めます。</li>
                 <li><strong>言語</strong>は右上で切り替えます。一覧の見出しと説明、入門コース、周りの操作が日本語になります。レッスン内部の解説文はまだ英語のものがあります。</li>
                 <li><strong>テーマ</strong>（ライト／ダーク）も右上で切り替えます。</li>
                 <li><strong>これまでの進み具合</strong>に、終えた件数と「続きから」が出ます。</li>
               </ul>`
      },
      {
        id: "reading-a-lesson",
        title: "レッスンの読み方",
        html: `<p>多くのレッスンは、図・操作ボタン・結果の3つでできています。</p>
               <ul>
                 <li><strong>図</strong> — 機器とケーブルです。機器を押すと詳細が開きます。右下のボタンで拡大・縮小・全体表示ができます。</li>
                 <li><strong>パケットタイムライン</strong> — 送ったパケットが通った順に並びます。行を押すと、その時点のパケットの中身が見られます。</li>
                 <li><strong>経路表</strong> — ルータが「どの宛先をどちらへ送るか」を持っている表です。</li>
               </ul>
               <p>タイムラインの各行は、<code>CREATE</code>（作られた）、<code>FWD</code>（転送された）、<code>DELIVER</code>（届いた）、<code>DROP</code>（落ちた）のいずれかです。落ちた行には理由が付きます。</p>
               <div class="callout">赤いケーブルは、そのリンクが落ちていることを表します。障害を扱うレッスンでは、これがそのレッスンの主題です。</div>`
      },
      {
        id: "pcap",
        title: "パケットを書き出す",
        html: `<p>パケットタイムラインの「PCAP を保存」（英語表示では「Download PCAP」）から、選んでいる通信を <code>.pcap</code> ファイルとして保存できます。Wireshark などでそのまま開けます。</p>
               <p>書き出されるのは<strong>選択中の通信だけ</strong>です。別の通信を書き出すときは、先にその通信を選んでください。</p>`
      },
      {
        id: "sandbox",
        title: "サンドボックス",
        html: `<p>一部のレッスンは、設定を自分で変えて結果を見られます。URL に <code>?sandbox=1</code> が付いた状態で開きます。</p>
               <ul>
                 <li>機器を押して値を変えると、その場で結果が変わります。</li>
                 <li>変更は履歴に残り、元に戻す・すべて戻すができます。</li>
                 <li>変更した状態は書き出して保存し、あとで読み込み直せます。</li>
               </ul>`
      },
      {
        id: "keyboard",
        title: "キーボード操作",
        html: `<p>左下の「?」から一覧を開けます。主なものは次のとおりです。</p>
               <ul>
                 <li><code>Space</code> — 再生／一時停止</li>
                 <li><code>←</code> <code>→</code> — 1 ステップ戻る／進む（<code>Shift</code> と一緒で 5 ステップ）</li>
                 <li><code>Home</code> <code>End</code> — 最初／最後のステップへ</li>
                 <li><code>⌘K</code>（Windows は <code>Ctrl+K</code>）— コマンドパレットを開く</li>
                 <li><code>Esc</code> — パレットや重なった表示を閉じる</li>
                 <li><code>?</code> — この一覧を開く</li>
               </ul>`
      },
      {
        id: "troubleshooting",
        title: "こまったとき",
        html: `<p><strong>パケットが届かない</strong> — タイムラインの最後の行にある理由を見てください。<code>no-route</code> は経路がない、<code>not-group-member</code> はそのグループに参加していない、<code>acl-deny</code> はフィルタで止められた、という意味です。レッスンによっては、それを見せることが目的です。</p>
               <p><strong>図が画面に収まらない</strong> — 右下の「全体」（英語表示では <code>fit</code>）を押すと全体が入ります。</p>
               <p><strong>言語が英語のまま</strong> — ギャラリー右上で「日本語」を選んでください。レッスン内部の解説文はまだ英語のものがあります。</p>
               <p><strong>進み具合が保存されない</strong> — ブラウザのプライベートモードや、サイトデータを保存しない設定では記録できません。</p>`
      }
    ]
  },
  en: {
    meta: {
      siteTitle: "netlab User Guide",
      guideLabel: "USER GUIDE",
      languageLabel: "Language",
      searchLabel: "Search",
      searchPlaceholder: "Search the guide...",
      themeLight: "Light",
      themeDark: "Dark",
      noResults: "No matching sections.",
      resultCount: (count) => `${count} section${count === 1 ? "" : "s"}`,
      offlineNote: "This guide works without a network connection."
    },
    sections: [
      {
        id: "getting-started",
        title: "Getting started",
        html: `<p>netlab is for seeing how a packet actually travels. You send one across a diagram of machines and follow it hop by hop: which devices it passed through, where it arrived, and where it stopped.</p>
               <div class="callout">If this is your first visit, start with the <strong>six-step course</strong>, offered at the top of the gallery. It is a single path with one thing to do at each step, so there is nothing to choose before you begin.</div>
               <p>The fifty-two lessons are what comes after. Finish the course, then pick whatever you were curious about.</p>`
      },
      {
        id: "course",
        title: "The six-step course",
        html: `<p>Six small networks in order, one thing to do in each.</p>
               <ul>
                 <li><strong>Two machines on a wire</strong> — on the same network they reach each other directly.</li>
                 <li><strong>Put a switch in the middle</strong> — a switch passes frames along without changing them.</li>
                 <li><strong>A third machine</strong> — the switch sends down one cable, not all of them.</li>
                 <li><strong>Two networks, not joined</strong> — <em>this one is meant to fail.</em> A switch has no idea another network exists.</li>
                 <li><strong>A router fills the gap</strong> — a machine with a foot in both networks carries packets across.</li>
                 <li><strong>How the router decides</strong> — it matches the destination against a row in its table.</li>
               </ul>
               <p>Leave partway through and it resumes at the step you reached.</p>
               <div class="callout">Step four failing is the correct outcome. It says so before you press. Nothing is broken.</div>`
      },
      {
        id: "gallery",
        title: "Using the gallery",
        html: `<p>The gallery lists the lessons. Pick a category on the left, or search by name, protocol or layer at the top.</p>
               <ul>
                 <li>Filter by <strong>difficulty</strong> (beginner, intermediate, advanced) and by tag.</li>
                 <li><strong>Language</strong> is chosen top right. It changes the catalogue, the course and the controls around them; some lesson interiors are not translated yet.</li>
                 <li><strong>Theme</strong> (light or dark) is chosen there too.</li>
                 <li><strong>Your progress</strong> shows how many you have finished and offers to resume.</li>
               </ul>`
      },
      {
        id: "reading-a-lesson",
        title: "Reading a lesson",
        html: `<p>Most lessons are a diagram, some controls, and a result.</p>
               <ul>
                 <li><strong>The diagram</strong> — machines and cables. Press a machine to open its detail. The buttons at the bottom right zoom and fit.</li>
                 <li><strong>The packet timeline</strong> — every hop in order. Press a row to see what the packet looked like at that point.</li>
                 <li><strong>The route table</strong> — what a router holds about where to send which destination.</li>
               </ul>
               <p>Each row is <code>CREATE</code>, <code>FWD</code>, <code>DELIVER</code> or <code>DROP</code>. A dropped row carries its reason.</p>
               <div class="callout">A red cable means that link is down. On the lessons about failure, that is the subject.</div>`
      },
      {
        id: "pcap",
        title: "Exporting packets",
        html: `<p>"Download PCAP" in the packet timeline saves the selected trace as a <code>.pcap</code> file, which opens in Wireshark as it is.</p>
               <p>Only the <strong>selected trace</strong> is written. To export a different one, select it first.</p>`
      },
      {
        id: "sandbox",
        title: "The sandbox",
        html: `<p>Some lessons let you change the configuration and watch the result. They open with <code>?sandbox=1</code> in the URL.</p>
               <ul>
                 <li>Press a machine and change a value; the result changes with it.</li>
                 <li>Every change is kept in a history you can undo, one at a time or all at once.</li>
                 <li>A changed state can be exported and loaded back later.</li>
               </ul>`
      },
      {
        id: "keyboard",
        title: "Keyboard",
        html: `<p>The full list is behind the "?" at the bottom left. The ones worth knowing:</p>
               <ul>
                 <li><code>Space</code> — play or pause</li>
                 <li><code>←</code> <code>→</code> — one step back or forward (with <code>Shift</code>, five)</li>
                 <li><code>Home</code> <code>End</code> — first or last step</li>
                 <li><code>⌘K</code> (<code>Ctrl+K</code> on Windows) — open the command palette</li>
                 <li><code>Esc</code> — close the palette or an overlay</li>
                 <li><code>?</code> — open this list</li>
               </ul>`
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        html: `<p><strong>The packet did not arrive.</strong> Read the reason on the last row of the timeline. <code>no-route</code> means there was no route to it, <code>not-group-member</code> means the host had not joined that multicast group, <code>acl-deny</code> means a filter stopped it. On some lessons, showing you that is the point.</p>
               <p><strong>The diagram does not fit.</strong> Press <code>fit</code> at the bottom right.</p>
               <p><strong>Still in English.</strong> Choose 日本語 at the top right of the gallery. Some lesson interiors are not translated yet.</p>
               <p><strong>Progress is not remembered.</strong> A private window, or a browser set not to keep site data, has nowhere to store it.</p>`
      }
    ]
  }
};
