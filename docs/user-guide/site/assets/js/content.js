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
               <p>最後まで進むと、「次に学ぶことと修了テストへ →」から<a href="#final-test">修了テスト</a>へ進めます。</p>
               <div class="callout">4 番目のステップは失敗するのが正解です。押す前に「これは失敗する例です」と表示されます。壊れているわけではありません。</div>`
      },
      {
        id: "final-test",
        title: "修了テスト",
        html: `<p>修了テストは、学んだことが身についたかを自分で確かめるためのページです。入門コースを最後まで進めると出る「次に学ぶことと修了テストへ →」から開けます。</p>
               <p>レベルは 4 つあり、ページ上部のボタンで切り替えます。</p>
               <ul>
                 <li><strong>レベル 1・入門</strong> — ネットワークの部品、アドレス、どの機器も頼っているサービス。</li>
                 <li><strong>レベル 2・中級</strong> — VLAN とループ、経路の選ばれ方と切り替わり方、パケットの大きさ、フィルタ、IPv6。</li>
                 <li><strong>レベル 3・上級</strong> — 複数経路、障害時の切り替え、輻輳、最近の HTTP、オーバーレイ。</li>
                 <li><strong>レベル 4・エキスパート</strong> — 複数のしくみが重なった場面の正確な結果。レッスンで場面を再現し、表示される数値を読んで答えます。</li>
               </ul>
               <h3>受け方</h3>
               <ol>
                 <li>最初のカード「このテストの範囲と、学ぶ順番」に並ぶレッスンを、上から順に開いて学びます。</li>
                 <li>10 問に答えます。どの問題にも「わからない（まだ習っていない）」があるので、当てずっぽうで選ぶ必要はありません。</li>
                 <li>「採点する」を押します。ボタンの横に、何問に回答済みかが出ます。</li>
               </ol>
               <h3>採点のあと</h3>
               <ul>
                 <li>点数と「合格」または「もう少し」が出ます。<strong>10 問中 8 問で合格</strong>です。</li>
                 <li>すべての問題に解説が付きます。</li>
                 <li>間違えた問題には「復習する：…」のリンクが出て、それを教えているレッスンへ直接行けます。</li>
                 <li>「もう一度受ける」で、回答を消してやり直せます。</li>
               </ul>
               <div class="callout">合格すると、ギャラリーの進み具合に記録されます。レベルを切り替えると、回答は引き継がれず最初からになります。</div>
               <p>アドレスで直接開くこともできます。レベル 1 は <code>#/course/exam</code>、レベル 2〜4 は <code>#/course/exam/2</code> のように末尾へ番号を付けます。</p>`
      },
      {
        id: "gallery",
        title: "ギャラリーの使い方",
        html: `<p>ギャラリーはレッスンの一覧です。左の列でカテゴリを選び、上の検索欄で名前・プロトコル・レイヤーから絞り込めます。</p>
               <ul>
                 <li><strong>むずかしさ</strong>（はじめて／慣れてきた／詳しく）とタグで絞り込めます。</li>
                 <li><strong>言語</strong>は右上で切り替えます。一覧の見出しと説明、入門コース、レッスン内部の解説文、機器の詳細パネル、エディタまで日本語になります。プロトコル名・アドレス・機器名・パケットの項目名や <code>DROP</code> などの記号は、調べるときの手がかりなので英語のままです。</li>
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
        id: "narrow-screens",
        title: "スマートフォンなど幅の狭い画面で",
        html: `<p>図の横にパネルが付くレッスンの多くは、画面の幅に合わせて並び方が変わります。境目は<strong>幅 900px</strong> です。</p>
               <ul>
                 <li><strong>幅の狭い画面（900px 未満）</strong> — レッスン全体が<strong>縦 1 列</strong>になり、上から下へスクロールして読みます。図に重なっていた説明は図の外に出て、その次に図が決まった高さで表示され、最後にパネルが画面の幅いっぱいに並びます。</li>
                 <li><strong>幅の広い画面</strong> — パネルは図の横に並びます。図とパネルの境目をドラッグすると、パネルの幅を広げられます。</li>
               </ul>
               <div class="callout">幅の狭い画面では、説明が図や操作ボタンを隠すことはありません。操作ボタンが見えないときは、図の下までスクロールしてください。</div>`
      },
      {
        id: "lesson-briefs",
        title: "しくみを説明するレッスン",
        html: `<p>次のレッスンには、操作ボタンのそばに<strong>しくみの説明カード</strong>があります。数値が変わるのを眺めるだけでなく、その数値が何を意味するのかを先に読めます。</p>
               <h3>Web の通信</h3>
               <ul>
                 <li><strong>HTTPS（TLS 1.3）</strong> — 「TLS の始まり方」。ClientHello、ServerHello、EncryptedExtensions の順に進みます。サーバが選んだ ALPN は ServerHello ではなく EncryptedExtensions に出ます。このサーバが受け付けるのは h2 だけで、合わないと証明書を送る前に <code>no_application_protocol</code> で打ち切られます。</li>
                 <li><strong>HTTP/2 の多重化</strong> — 「1 つのロスで全部が止まる理由」。4 つのストリームが 1 本の TCP 接続を共有するので、1 つ失われると全部が待ちます。</li>
                 <li><strong>HTTP/3（QUIC）</strong> — 「ここではロスが 1 本だけを止める理由」。ストリーム ID が 0・4・8・12 になる理由と、止まるのがストリーム 4 だけであることを説明します。</li>
               </ul>
               <h3>複数経路と冗長化</h3>
               <ul>
                 <li><strong>ECMP（等コスト複数経路）</strong> — 「ECMP の振り分け方」。Leaf A がフローごとに Spine 1 か Spine 2 を選びます。結果の各行には<strong>フロー番号と送信元ポート</strong>が付くので、2 回送って同じフローが同じ Spine を通ることを確かめられます。「ECMP のフローを送る」を押すたびに、結果は「1 回目」「2 回目」と<strong>回ごとに</strong>まとまり、見出しの下に「10.0.12.2 経由: 5 · 10.0.13.2 経由: 3」のような<strong>次ホップごとの本数</strong>が出ます。前の回と振り分けが同じなら、「1 回目とまったく同じです」と表示されます。</li>
                 <li><strong>ゲートウェイの冗長化とリンク束ね</strong> — 「ゲートウェイが障害を乗り越えるしくみ」。R1 と R2 が <strong>VRRP グループ 10</strong> を組み、仮想ゲートウェイ 10.10.0.1 を共有します。仮想 MAC が <code>00:00:5e:00:01</code> とグループ番号の 16 進数（10 は <code>0a</code>）でできていることも書いてあります。LACP の説明もここにあります。</li>
               </ul>
               <h3>トンネルとオーバーレイ</h3>
               <ul>
                 <li><strong>MPLS L3VPN</strong> — 「2 つのラベルのしくみ」。ラベルは<strong>リンクごと</strong>に「ラベル PE1 → P」「ラベル P → PE2」と表示されます。「PHP を無効にする／有効にする」を押して、P → PE2 のラベルがどう変わるかを見比べてください。</li>
                 <li><strong>VXLAN EVPN</strong> — 「この画面の見方」。VTEP、VNI、Type-2 と Type-5 の経路、ARP 抑止を順に説明します。</li>
               </ul>
               <h3>アドレスとフィルタ</h3>
               <ul>
                 <li><strong>NAT / PAT</strong> — 「NAT のしくみ」。Client A と Client B から送ると、変換表で 2 台が同じグローバルアドレスをポート番号で分け合うのが分かります。この NAT は外側のポートを <strong>1024 から順に</strong>割り当てます。</li>
                 <li><strong>ファイアウォールと ACL</strong> — 「このファイアウォールの決め方」。ルールの一覧が表示され、上から順に照らし合わせて最初に一致したもので決まること、どれにも一致しなければ拒否されることが書いてあります。「戻りの通信」ボタンで、クライアントが始めた接続の返事は通ることを確かめられます。</li>
                 <li><strong>DHCPv6 と SLAAC</strong> — モードが「DHCPv6 でアドレス取得」「SLAAC ＋ DHCPv6（DNS などだけ）」「SLAAC のみ」と言葉で表示されます。</li>
               </ul>
               <h3>スパニングツリー</h3>
               <ul>
                 <li>各スイッチに<strong>ブリッジ ID</strong>（優先度/MAC）と、ルートかどうかが表示されます。</li>
                 <li>「優先度」の欄に、小さいブリッジ ID が勝つという決まりが書いてあります。優先度を変えるとルートが選び直されます。</li>
                 <li>ポートを 1 つ止めると、そのリンクは<strong>両端で</strong>止まります。相手側のポートは「DISABLED (リンクダウン)」と表示されます。</li>
                 <li>なぜリンクを遮断するのか（ブロードキャストストーム）も説明されています。</li>
               </ul>`
      },
      {
        id: "tcp-congestion",
        title: "TCP の輻輳制御のグラフ",
        html: `<p>「TCP の輻輳制御」のレッスンは、送信側が一度に送ってよい量（cwnd）がどう増減するかをグラフで見せます。</p>
               <ul>
                 <li><strong>軸</strong> — 縦軸はバイト、横軸はステップです。目盛りに数値が付いています。</li>
                 <li><strong>線</strong> — cwnd の線のほかに、ssthresh の線と、送信中のバイト数の線があります。</li>
                 <li><strong>ステップのスライダー</strong> — 動かすと、そのステップのフェーズ（スロースタート／輻輳回避／高速リカバリ／RTO）、cwnd、ssthresh、送信中のバイト数が読めます。</li>
                 <li><strong>出来事</strong> — 「重複 ACK が 3 つ届き、… を高速再送」「再送タイムアウト (RTO) が発生し、… を再送」のように文章で並びます。</li>
                 <li><strong>用語</strong> — cwnd、ssthresh、MSS、RTO の意味がグラフのそばにまとめてあります。</li>
               </ul>
               <h3>値が変わる理由を読む</h3>
               <p>「トレースを実行」を押したあと、ステップ <strong>9・10・12</strong> を選ぶと、そのステップの<strong>計算の過程</strong>が表示されます。ssthresh と cwnd がなぜその値になったのかを、送信側がその時点で持っていた実際の数値でたどれます。</p>
               <ul>
                 <li><strong>ステップ 9</strong> — 重複 ACK が 3 つ届いて高速再送に入るときの、ssthresh と cwnd の決まり方。</li>
                 <li><strong>ステップ 10</strong> — 新しい ACK で高速リカバリが終わり、cwnd が ssthresh と同じ値に戻ること。</li>
                 <li><strong>ステップ 12</strong> — 再送タイムアウトのときの ssthresh の決まり方と、cwnd が 1 MSS になること。</li>
               </ul>
               <div class="callout">cwnd は 2000 バイト（2 MSS）から始まり、ssthresh の 4000 バイトまでスロースタートで増えます。タイムアウトの時点でも、ACK されていない 2000 バイトは「送信中」のまま表示されます。</div>`
      },
      {
        id: "lesson-readouts",
        title: "数値の読み方（MTU・無線・QoS・NetFlow）",
        html: `<h3>MTU と分割</h3>
               <ul>
                 <li>スライダーは<strong>トンネル MTU 604 バイト</strong>で開きます。</li>
                 <li>「トレースのメモ」の「断片の数」（英語表示では <code>Fragments</code>）に、いくつに分かれたかが出ます。</li>
                 <li>分割が起きなかったときは、再組み立てが「不要」（英語表示では <code>not needed</code>）と表示されます。</li>
                 <li>分割された ping のあとは、同じメモの下に<strong>断片の数の計算</strong>が出ます。運ぶバイト数（データ ＋ ICMP ヘッダ）、断片 1 つが運べるバイト数（MTU − IP ヘッダを 8 の倍数に切り捨て）、その割り算の順で、「…なので、断片は 3 個」のように読めます。</li>
               </ul>
               <h3>無線 LAN（802.11）</h3>
               <ul>
                 <li>AP から端末までの距離が「距離: 20 m」のように表示されます。スライダーで動かすほか、<strong>数値を直接入力</strong>することもできます。</li>
                 <li>距離を変えると RSSI と損失率が変わります。</li>
                 <li>「電波のモデル」の欄の下にある注記に、計算の前提（送信電力、周波数、距離が 10 倍になるごとに 20 dB 弱くなること）と、損失率の決まり（−65 dBm までは 0%、そこから 1 dB につき 4 ポイントずつ増えて −90 dBm で 100%）が書いてあります。</li>
                 <li><strong>画面の値は丸めて表示</strong>されます。RSSI は小数第 1 位まで、損失率は整数のパーセントです。たとえば 200 m では RSSI が −66.2 dBm で、計算上の損失率 4.8% は 5% と表示されます。手で計算した値と少しずれるのはこのためです。</li>
               </ul>
               <div class="callout">損失率の直線は、このレッスンだけの単純化です。実際の Wi-Fi の決まりではないことが、画面にも明記されています。実際の Wi-Fi では −66 dBm は十分に強い電波で、損失率はノイズ、干渉、使っているデータレートで決まります。</div>
               <h3>リンクごとの QoS</h3>
               <p>操作のそばの説明に、リンクを渡る時間が何でできているかが書いてあります。</p>
               <ul>
                 <li><strong>送り出し時間 ＝ パケットサイズ × 8 ÷ 帯域</strong>です。このレッスンで送るパケットは <strong>1500 バイト</strong>なので、1500 × 8 ＝ 12,000 ビット。帯域が 1,000,000 bps なら 12 ms です。結果は 1 ms 単位に切り上げられます。</li>
                 <li>リンクを渡る時間は、この送り出し時間に<strong>伝搬遅延</strong>を足したものです。</li>
                 <li>帯域、伝搬遅延、損失率を変えても、<strong>「リンクに適用」を押すまでは反映されません</strong>。押したあとで、もう一度「QoS を試すパケットを送る」を押してください。</li>
                 <li>クラスの重みは、複数のクラスが同時に待っているときの分け合い方です。このレッスンはパケットを 1 個ずつ送るので、重みを変えても表示される時間は変わりません。</li>
               </ul>
               <p>パケットが届くと、リンクの通過にかかった時間に加えて、その内訳が、たとえば「送り出し 12 ms ＋ 伝搬 20 ms ＝ 32 ms」のように表示されます。</p>
               <h3>フローの可視化</h3>
               <p>「観測されるフローを送る」を押すたびに、NetFlow のパケット数とバイト数が<strong>積み上がります</strong>。同じフローを 2 回送れば 2 回分になります。</p>`
      },
      {
        id: "routing-tables",
        title: "経路表の数値の読み方",
        html: `<p>「動的ルーティング」と「OSPF の収束」のレッスンで、経路表に出る数値の意味がはっきり読めるようになっています。</p>
               <ul>
                 <li><strong>OSPF のメトリック</strong> — パケットが出ていく各インタフェースのコストに、最後のルータが宛先ネットワークへつながるインタフェースのコストを足した値です。</li>
                 <li><strong>等コストの経路</strong> — 同じくらい良い経路が 2 本あるときは、1 行に次ホップが 2 つ並びます。「動的ルーティング」では「（等コスト）」と付きます。</li>
                 <li><strong>BGP の数値</strong> — BGP を選んでいるときの数値は「メトリック」ではなく「AS パス長」と表示されます。</li>
                 <li><strong>リンクのコスト</strong> — 「OSPF の収束」と、「動的ルーティング」で OSPF を選んだときには、「リンクのコスト」の一覧があります。向きによってコストが違うリンクは、両方向が書かれます。メトリックを自分で足し算して確かめられます。</li>
                 <li><strong>BGP が広告するネットワーク</strong> — 「動的ルーティング」で BGP を選ぶと、各ルータが自分から広告するネットワークが 1 行で示されます。ルータ間のリンクはそこに含まれないので、ほかの 2 台の間のリンクが経路表に現れないのは正しい動きです。</li>
                 <li><strong>落ちたリンク</strong> — リンクを落とすと、そのリンクのネットワークは<strong>すべてのルータ</strong>の経路表から消え、落ちたリンクの先を次ホップにした経路は 1 本も残りません。コストの一覧では「（リンク断）」と表示されます。</li>
                 <li><strong>IPv6 でも同じ</strong> — 「IPv6 のルーティング」で R1-R2 間のリンクを落とすと、R1 の経路表からそのリンクのネットワークが消えます。OSPFv3 の経路は R3 経由になり、そのリンクで受け取っていた MP-BGP の経路はなくなります。</li>
               </ul>
               <h3>リンクを落としたあとの経路表を見比べる</h3>
               <p>「OSPF の収束」で「リンクを落とす」を押すと、経路表のタブの上に案内が出ます。R1 だけでなくすべてのルータが経路を計算し直したことを伝え、R2 と R4 のタブを開いて見比べるよう促します。</p>
               <ul>
                 <li><strong>タブの点</strong> — リンクを落とす前と経路表が変わったルータのタブに、点が付きます。読み上げでは「変化あり」と伝わります。</li>
                 <li><strong>4 つとも点が付きます</strong> — どのルータも、落ちたリンクのネットワーク 10.0.24.0/30 への経路を持っていたからです。</li>
                 <li><strong>リンクを戻すと</strong> — 案内も点も消えます。</li>
               </ul>`
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
               <p><strong>言語が英語のまま</strong> — ギャラリー右上で「日本語」を選んでください。プロトコル名やアドレス、<code>DROP</code> などの記号は、そのまま英語で表示されます。</p>
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
               <p>At the end, “What to learn next, and the final test →” leads on to <a href="#final-test">the final test</a>.</p>
               <div class="callout">Step four failing is the correct outcome. It says so before you press. Nothing is broken.</div>`
      },
      {
        id: "final-test",
        title: "The final test",
        html: `<p>The final test lets you check for yourself that what you studied has stuck. Finish the six-step course and press “What to learn next, and the final test →” to open it.</p>
               <p>There are four levels. Switch between them with the buttons at the top of the page.</p>
               <ul>
                 <li><strong>Level 1 · Beginner</strong> — the parts of a network, addresses, and the services every device relies on.</li>
                 <li><strong>Level 2 · Intermediate</strong> — VLANs and loops, how routes are chosen and changed, packet size, filtering and IPv6.</li>
                 <li><strong>Level 3 · Advanced</strong> — multipath, failover, congestion, modern HTTP and overlays.</li>
                 <li><strong>Level 4 · Expert</strong> — exact results where several mechanisms meet. You reproduce each scenario in its lesson and read the numbers it shows.</li>
               </ul>
               <h3>Taking it</h3>
               <ol>
                 <li>The first card, “What this test covers, in order”, lists the lessons for the level. Open them from the top and study them.</li>
                 <li>Answer the ten questions. Every question also offers “I have not learned this”, so you never need to guess.</li>
                 <li>Press “Mark my answers”. Next to the button you can see how many you have answered.</li>
               </ol>
               <h3>After marking</h3>
               <ul>
                 <li>You get your score and either “Passed” or “Not yet”. <strong>8 of 10 passes.</strong></li>
                 <li>Every question shows its explanation.</li>
                 <li>Each question you missed shows a “Review: …” link that takes you straight to the lesson that teaches it.</li>
                 <li>“Try again” clears your answers so you can start over.</li>
               </ul>
               <div class="callout">A pass is recorded in your progress in the gallery. Switching level starts that level fresh; answers do not carry over.</div>
               <p>You can also open a level by address: level 1 is <code>#/course/exam</code>, and levels 2 to 4 add the number, as in <code>#/course/exam/2</code>.</p>`
      },
      {
        id: "gallery",
        title: "Using the gallery",
        html: `<p>The gallery lists the lessons. Pick a category on the left, or search by name, protocol or layer at the top.</p>
               <ul>
                 <li>Filter by <strong>difficulty</strong> (beginner, intermediate, advanced) and by tag.</li>
                 <li><strong>Language</strong> is chosen top right. It changes the catalogue, the course, the lessons themselves, the device detail panel and the editor; protocol names, addresses, device names and codes such as <code>DROP</code> stay as they are.</li>
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
        id: "narrow-screens",
        title: "On a phone or a narrow screen",
        html: `<p>Many lessons with a panel beside the diagram arrange themselves to fit the screen. The dividing line is a width of <strong>900px</strong>.</p>
               <ul>
                 <li><strong>Narrow screen (under 900px)</strong> — the lesson becomes <strong>one scrolling column</strong>, read from top to bottom. The notes that sat over the diagram move out of it, then comes the diagram at a fixed height, and last the panel at the full width of the screen.</li>
                 <li><strong>Wide screen</strong> — the panel sits beside the diagram. Drag the edge between them to make the panel wider.</li>
               </ul>
               <div class="callout">On a narrow screen no note covers the diagram or the controls. If you cannot see the controls, scroll down past the diagram.</div>`
      },
      {
        id: "lesson-briefs",
        title: "Lessons that explain their mechanism",
        html: `<p>These lessons carry a <strong>brief card</strong> beside their controls. Instead of only watching a number change, you can first read what that number means.</p>
               <h3>Web traffic</h3>
               <ul>
                 <li><strong>HTTPS TLS 1.3</strong> — “How TLS starts”. The handshake runs ClientHello, ServerHello, then EncryptedExtensions. The server's ALPN choice appears in EncryptedExtensions, not in the ServerHello. This server accepts only h2; on a mismatch the handshake ends with <code>no_application_protocol</code> before any certificate is sent.</li>
                 <li><strong>HTTP/2 Multiplexing</strong> — “Why one loss stalls every stream”. Four streams share one TCP connection, so one lost packet makes all of them wait.</li>
                 <li><strong>HTTP/3 over QUIC</strong> — “Why a loss here stalls only one stream”. It explains why the stream IDs are 0, 4, 8 and 12, and that only stream 4 waits.</li>
               </ul>
               <h3>Multipath and redundancy</h3>
               <ul>
                 <li><strong>ECMP Multipath</strong> — “How ECMP spreads traffic”. Leaf A picks Spine 1 or Spine 2 for each flow. Every result row names its <strong>flow number and source port</strong>, so you can send twice and confirm the same flow takes the same spine. Each press of “Send ECMP flows” is a <strong>numbered run</strong> (“Run 1”, “Run 2”), headed by a <strong>tally per next hop</strong> such as “via 10.0.12.2: 5 · via 10.0.13.2: 3”. When a run splits exactly as the one before, it says “Identical to run 1”.</li>
                 <li><strong>Gateway HA And Link Aggregation</strong> — “How the gateway survives a failure”. R1 and R2 form <strong>VRRP group 10</strong> and share the virtual gateway 10.10.0.1. A note shows how the virtual MAC is built: <code>00:00:5e:00:01</code> followed by the group number in hexadecimal (10 is <code>0a</code>). LACP is explained here too.</li>
               </ul>
               <h3>Tunnels and overlays</h3>
               <ul>
                 <li><strong>MPLS L3VPN</strong> — “How the two labels work”. Labels are shown <strong>per link</strong>, as “Labels PE1 → P” and “Labels P → PE2”. Press “Disable PHP” or “Enable PHP” and compare what the P → PE2 link carries.</li>
                 <li><strong>VXLAN EVPN</strong> — “What you are looking at”. It walks through VTEP, VNI, Type-2 and Type-5 routes, and ARP suppression.</li>
               </ul>
               <h3>Addresses and filtering</h3>
               <ul>
                 <li><strong>NAT / PAT</strong> — “How NAT works”. Send from Client A and Client B and the table shows both sharing one global address, told apart by port. This NAT allocates public ports <strong>in order starting at 1024</strong>.</li>
                 <li><strong>Firewalls &amp; ACLs</strong> — “How this firewall decides”. The rules are listed, with how they are read: top to bottom, first match wins, and anything unmatched is denied. Press “Return Traffic” to see that replies to a connection the client opened are let back in.</li>
                 <li><strong>DHCPv6 And SLAAC</strong> — the mode reads in words: “DHCPv6 address”, “SLAAC + stateless DHCPv6 (DNS only)” or “SLAAC only”.</li>
               </ul>
               <h3>Spanning Tree</h3>
               <ul>
                 <li>Every switch shows its <strong>bridge ID</strong> (priority/MAC) and whether it is the root.</li>
                 <li>The “Priorities” card states the rule: the lower bridge ID wins. Change a priority and the root is re-elected.</li>
                 <li>Shut one port and the link goes down <strong>at both ends</strong>. The far port reads “DISABLED (link down)”.</li>
                 <li>The page also says why a link is blocked at all (a broadcast storm).</li>
               </ul>`
      },
      {
        id: "tcp-congestion",
        title: "The TCP congestion chart",
        html: `<p>The “TCP Congestion Control” lesson charts how the amount a sender may have outstanding (cwnd) grows and shrinks.</p>
               <ul>
                 <li><strong>Axes</strong> — bytes up the side, steps along the bottom, both with numbered ticks.</li>
                 <li><strong>Lines</strong> — alongside cwnd there is an ssthresh line and a line for bytes in flight.</li>
                 <li><strong>Step slider</strong> — move it to read that step's phase (Slow Start, Congestion Avoidance, Fast Recovery or RTO), cwnd, ssthresh and in-flight bytes.</li>
                 <li><strong>Events</strong> — listed in words, such as “Fast retransmit of … after three duplicate ACKs” and “Retransmission timeout (RTO) fires; the oldest unacknowledged segment, …, is resent”.</li>
                 <li><strong>Glossary</strong> — cwnd, ssthresh, MSS and RTO are defined next to the chart.</li>
               </ul>
               <h3>Reading why a value changed</h3>
               <p>After pressing “Run trace”, select step <strong>9, 10 or 12</strong> and the lesson <strong>shows its working</strong> for that step: why ssthresh and cwnd came out as they did, in the numbers the sender actually held at that moment.</p>
               <ul>
                 <li><strong>Step 9</strong> — how ssthresh and cwnd are set when three duplicate ACKs trigger a fast retransmit.</li>
                 <li><strong>Step 10</strong> — a new ACK ends fast recovery and cwnd comes back down to ssthresh.</li>
                 <li><strong>Step 12</strong> — how ssthresh is set at the retransmission timeout, and that cwnd drops to one MSS.</li>
               </ul>
               <div class="callout">cwnd starts at 2000 bytes (two MSS) and grows through slow start to ssthresh, 4000 bytes. At the timeout, the 2000 unacknowledged bytes are still shown as in flight.</div>`
      },
      {
        id: "lesson-readouts",
        title: "Reading the numbers (MTU, wireless, QoS, NetFlow)",
        html: `<h3>MTU &amp; Fragmentation</h3>
               <ul>
                 <li>The slider opens at <strong>Tunnel MTU: 604 bytes</strong>.</li>
                 <li>Under “Trace Notes”, <code>Fragments</code> (「断片の数」 in Japanese) says how many pieces the packet was split into.</li>
                 <li>When nothing was split, reassembly reads <code>not needed</code> (「不要」 in Japanese).</li>
                 <li>After a fragmented ping, the same notes show the <strong>sum behind the fragment count</strong>: the bytes to carry (data plus the ICMP header), how much each fragment carries (the MTU minus the IP header, rounded down to a multiple of 8), and the division, ending in “so 3 fragments”.</li>
               </ul>
               <h3>Wireless 802.11</h3>
               <ul>
                 <li>The station's distance is shown, as in “Distance: 20 m”. Drag the slider or <strong>type a number</strong>.</li>
                 <li>RSSI and loss change with the distance.</li>
                 <li>A note under “Radio model” states what the figures rest on: the transmit power, the frequency, that the signal gets 20 dB weaker for every tenfold distance, and the loss rule (0% down to −65 dBm, then 4 points per dB up to 100% at −90 dBm).</li>
                 <li><strong>The values shown are rounded</strong>: RSSI to one decimal place and loss to a whole percent. At 200 m, for example, the RSSI is −66.2 dBm and the worked-out loss of 4.8% is shown as 5%. That is why your own sum can differ slightly from the screen.</li>
               </ul>
               <div class="callout">The loss line is this lesson's simplification, not a rule of Wi-Fi. The page says so itself. On real Wi-Fi, −66 dBm is a healthy signal, and loss depends on noise, interference and the data rate in use.</div>
               <h3>Per-Link QoS</h3>
               <p>The brief beside the controls says what the time to cross a link is made of.</p>
               <ul>
                 <li><strong>Sending time = packet size × 8 ÷ bandwidth.</strong> The packet this lesson sends is <strong>1500 bytes</strong>, so 1500 × 8 = 12,000 bits; at 1,000,000 bps that is 12 ms. The result is rounded up to a whole millisecond.</li>
                 <li>The time to cross the link is that sending time plus the link's <strong>propagation delay</strong>.</li>
                 <li>Changes to bandwidth, propagation delay and loss <strong>take effect only after you press “Apply to the link”</strong>. Then press “Send QoS burst” again.</li>
                 <li>A class's weight is its share when several classes are waiting at once. This lesson sends one packet at a time, so changing the weights does not change the time shown.</li>
               </ul>
               <p>When a packet is delivered, the time to cross the link is followed by its parts, for example “sending 12 ms + propagation 20 ms = 32 ms”.</p>
               <h3>Flow Observability</h3>
               <p>Each press of “Send observed flow” <strong>adds to</strong> the NetFlow packet and byte counts. Send the same flow twice and it counts twice.</p>`
      },
      {
        id: "routing-tables",
        title: "Reading the numbers in a route table",
        html: `<p>The “Dynamic Routing” and “OSPF Convergence” lessons say what each number in a route table means.</p>
               <ul>
                 <li><strong>OSPF metric</strong> — the cost of each interface the packet leaves by, plus the cost of the last router's interface onto the destination network.</li>
                 <li><strong>Equal-cost routes</strong> — when two paths are equally good, one row lists both next hops. “Dynamic Routing” marks it “(equal cost)”.</li>
                 <li><strong>The BGP number</strong> — with BGP selected, the number is labelled “AS path length”, not “metric”.</li>
                 <li><strong>Link costs</strong> — “OSPF Convergence”, and “Dynamic Routing” with OSPF selected, show a “LINK COSTS” list. A link whose two directions differ shows both. You can add a metric up yourself and check it.</li>
                 <li><strong>What BGP originates</strong> — with BGP selected, “Dynamic Routing” states in one line which networks each router is configured to originate. The links between routers are not among them, so it is correct that a link between two other routers is missing from a router's table.</li>
                 <li><strong>A failed link</strong> — take a link down and its network disappears from <strong>every router's</strong> table, and no route keeps a next hop on the failed link. The cost list marks it “(link down)”.</li>
                 <li><strong>The same in IPv6</strong> — in “IPv6 Routing Ecosystem”, fail the R1-R2 link and that link's network leaves R1's table. The OSPFv3 routes go through R3, and the MP-BGP route learned over that link is gone.</li>
               </ul>
               <h3>Comparing the tables after a link fails</h3>
               <p>In “OSPF Convergence”, pressing “Fail link” puts a note above the route-table tabs. It says that every router recomputed its routes, not only R1, and invites you to open the R2 and R4 tabs to compare.</p>
               <ul>
                 <li><strong>The dot on a tab</strong> — a tab gets a dot when that router's table differs from before the failure. A screen reader announces it as “changed”.</li>
                 <li><strong>All four get a dot</strong> — every router had a route to the failed link's network, 10.0.24.0/30.</li>
                 <li><strong>Restore the link</strong> — the note and the dots go away.</li>
               </ul>`
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
               <p><strong>Still in English.</strong> Choose 日本語 at the top right of the gallery. Protocol names, addresses and codes such as <code>DROP</code> stay in English either way.</p>
               <p><strong>Progress is not remembered.</strong> A private window, or a browser set not to keep site data, has nowhere to store it.</p>`
      }
    ]
  }
};
