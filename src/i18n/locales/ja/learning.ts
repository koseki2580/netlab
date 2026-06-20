import type { Catalog } from '../../types';

export const learning: Catalog = {
  // ドリル共通
  'learning.drill.correct': '✓ 正解',
  'learning.drill.incorrect': '✗ 不正解 — 答え: {{expected}}',
  'learning.drill.check': '判定',
  'learning.drill.next': '次の問題',
  'learning.drill.seeResults': '結果を見る',
  'learning.drill.practiceAgain': 'もう一度練習',
  'learning.drill.sessionComplete': 'セッション完了',
  'learning.drill.progress': '問題 {{current}} / {{total}}',

  // サブネット計算ドリル
  'learning.subnet.title': 'サブネット計算の練習',
  'learning.subnet.primer.title': 'サブネットが初めて？ まずはここから',
  'learning.subnet.primer.body':
    'サブネットはアドレスをネットワーク部(プレフィックス、例: /24)とホスト部に分割します。ネットワークアドレスはホストビットがすべて0、ブロードキャストはすべて1です。使用可能ホスト数 = 2^(ホストビット数) − 2(ネットワークとブロードキャストは割り当て不可)。マスクはネットワークビットを1で示すため、/24 = 255.255.255.0 となります。',
  'learning.subnet.answerLabel': 'あなたの答え',
  'learning.subnet.mastered': '習得済み',
  'learning.subnet.review': '次に復習しよう',
  'learning.subnet.placeholder.yesNo': 'yes / no',
  'learning.subnet.placeholder.prefix': '例: /24',
  'learning.subnet.placeholder.count': '例: 254',
  'learning.subnet.placeholder.address': '例: 192.168.1.0',
  'learning.subnet.kind.networkAddress': 'ネットワークアドレス',
  'learning.subnet.kind.broadcastAddress': 'ブロードキャストアドレス',
  'learning.subnet.kind.subnetMask': 'サブネットマスク',
  'learning.subnet.kind.prefixFromMask': 'マスクからプレフィックス',
  'learning.subnet.kind.usableHostCount': '使用可能ホスト数',
  'learning.subnet.kind.firstUsableHost': '最初の使用可能ホスト',
  'learning.subnet.kind.lastUsableHost': '最後の使用可能ホスト',
  'learning.subnet.kind.containsHost': 'ホストの所属判定',
  'learning.subnet.prompt.networkAddress': '{{cidr}} のネットワークアドレスは？',
  'learning.subnet.prompt.broadcastAddress': '{{cidr}} のブロードキャストアドレスは？',
  'learning.subnet.prompt.subnetMask':
    '/{{prefix}} ネットワークのサブネットマスク(ドット区切り10進)は？',
  'learning.subnet.prompt.prefixFromMask':
    'サブネットマスク {{mask}} が表すプレフィックス長(/n)は？',
  'learning.subnet.prompt.usableHostCount': '{{cidr}} の使用可能ホスト数は？',
  'learning.subnet.prompt.firstUsableHost': '{{cidr}} の最初の使用可能ホストは？',
  'learning.subnet.prompt.lastUsableHost': '{{cidr}} の最後の使用可能ホストは？',
  'learning.subnet.prompt.containsHost':
    'ホスト {{probe}} はサブネット {{cidr}} に含まれますか？(yes/no)',
  'learning.subnet.explain.networkAddress':
    'ホストとマスク {{mask}} の AND を取り、ホストビットを0にします。',
  'learning.subnet.explain.broadcastAddress':
    'ホストビットをすべて1に: ネットワークとワイルドカード {{wildcard}} の OR。',
  'learning.subnet.explain.subnetMask':
    '/{{prefix}} は上位 {{prefix}} ビットを1にする → {{mask}}。',
  'learning.subnet.explain.prefixFromMask':
    '{{mask}} は連続する {{prefix}} 個の1ビットなので /{{prefix}}。',
  'learning.subnet.explain.usableHostCount':
    '2^(32-{{prefix}}) - 2 = {{count}} 台の使用可能ホスト。',
  'learning.subnet.explain.firstUsableHost': 'ネットワーク {{network}} の1つ上です。',
  'learning.subnet.explain.lastUsableHost': 'ブロードキャスト {{broadcast}} の1つ下です。',
  'learning.subnet.explain.containsHostInside':
    '{{probe}} は {{network}}–{{broadcast}} の範囲内です。',
  'learning.subnet.explain.containsHostOutside':
    '{{probe}} は {{network}}–{{broadcast}} の範囲外です。',

  // サブネット可視化
  'learning.visual.caption': '{{cidr}} — 全 {{total}} アドレス、使用可能 {{usable}}',
  'learning.visual.network': 'ネットワーク {{address}}',
  'learning.visual.hosts': 'ホスト {{first}} – {{last}}',
  'learning.visual.broadcast': 'ブロードキャスト {{address}}',

  // ルーティングドリル(テキスト + キャンバス)
  'learning.route.title': 'ルーティング判断',
  'learning.route.visualTitle': 'ルーティング判断 — ネットワーク上で',
  'learning.route.primer.title': 'ルーティングテーブルが初めて？ まずはここから',
  'learning.route.primer.body':
    '宛先は複数の経路に同時に一致することがあります — デフォルトルート、集約プレフィックス、特定のサブネット。ルータは常に最も具体的な一致、つまり最長プレフィックス(/n が最大)で転送します。テーブルの並び順や他の経路は関係ありません — 宛先を最も狭く含むサブネットだけが決め手です。',
  'learning.route.visualPrimer.title': '答え方',
  'learning.route.visualPrimer.body':
    '中央が R1、周囲の各ルータがネクストホップです。ルーティングテーブルを読み、宛先を含む最も具体的な経路(最長プレフィックスが勝ち)を見つけて、ネットワーク上でその隣接ルータをクリックしてください — キャンバス下の回答ボタンも使えます。',
  'learning.route.prompt': '宛先 {{dst}} のパケット。ルータはどのネクストホップを選ぶ？',
  'learning.route.explain.matched':
    '最長プレフィックス一致: {{destination}} → {{nextHop}} — 他の一致経路より具体的です。',
  'learning.route.explain.dropped': '{{dst}} に一致する経路がないため、パケットは破棄されます。',
  'learning.route.table.caption': 'ルーティングテーブル',
  'learning.route.table.destination': '宛先',
  'learning.route.table.nextHop': 'ネクストホップ',
  'learning.route.answerLabel': '選んだネクストホップ',
  'learning.route.placeholder': 'ネクストホップ 例: 192.0.2.3',
  'learning.route.answerGroup': 'ネクストホップで回答',
  'learning.route.summary.lesson':
    'ルータは常に最も具体的な一致経路 — 最長プレフィックス — を選びます。テーブルの並び順は関係ありません。',

  // パケットジャーニー(予測→観測)
  'learning.journey.title': 'パケットジャーニー — 予測して、見届ける',
  'learning.journey.primer.title': '遊び方',
  'learning.journey.primer.body':
    '本物のパケットが netlab の実エンジンでこのネットワークを横断します。各ルータで「次はどこへ?」を予測してください — ネットワーク上のノードをクリックするか、ボタンで回答。エンジンが実際の結果とその理由を明かします。ジャーニーは3つ: 特定経路、デフォルトルート、そして死ぬパケット。',
  'learning.journey.label': 'ジャーニー {{current}} / {{total}} — 宛先 {{dst}}',
  'learning.journey.prompt': 'パケットは {{node}} にいます。次はどこへ転送される？',
  'learning.journey.outcome.delivered': '📬 配送成功 — パケットは {{dst}} に届きました。',
  'learning.journey.outcome.dropped':
    '💀 破棄 — 最後のルータで一致する経路がありませんでした(理由: {{reason}})。',
  'learning.journey.engineSays': 'エンジンの判断: {{explanation}}',
  'learning.journey.originHop':
    'パケットはホストから始まります。ホストのリンクは {{node}} への1本だけなので、送信するパケットはすべてそこから始まります。',
  'learning.journey.nextJourney': '次のジャーニー',
  'learning.journey.summary.lesson':
    '本物の転送エンジンの仕事を見届けました: 最も具体的な経路が勝ち、デフォルトルートが残りを受け止め、一致する経路のないルータはパケットを破棄します。',

  // レジリエンスラボ(障害結果を予測)
  'learning.resilience.title': 'レジリエンスラボ — 障害を予測する',
  'learning.resilience.primer.title': '遊び方',
  'learning.resilience.primer.body':
    '各シナリオはネットワークの一部を壊し、実エンジンで動かします。結果を見る前に予測してください: パケットは迂回して生き残る？ それとも破棄される？ このネットワークには冗長な R2–R3 リンクがあるため、答えは常に同じではありません — それこそが冗長性の意味です。',
  'learning.resilience.label': 'シナリオ {{current}} / {{total}} — 宛先 {{dst}}',
  'learning.resilience.break': '💥 {{what}}が故障。パケットは {{dst}} に届く？',
  'learning.resilience.fail.r1r2Link': 'R1–R2 リンク',
  'learning.resilience.fail.r2Node': 'ルータ R2',
  'learning.resilience.fail.r1r3Link': 'R1–R3 リンク',
  'learning.resilience.predict.survived': '✅ 迂回して生き残る',
  'learning.resilience.predict.dropped': '❌ 破棄される',
  'learning.resilience.outcome.survived': '✅ 生存 — 迂回して {{dst}} に到達。',
  'learning.resilience.outcome.dropped': '💀 {{node}} で破棄 — {{reason}}。',
  'learning.resilience.lesson.reroute':
    '冗長な R2–R3 リンクが迂回路になりました: R1 → R3 → R2 → サーバ。冗長性はリンク断を「障害」ではなく「遠回り」に変えます。',
  'learning.resilience.lesson.lastHop':
    'Server A は R2 にしか接続していません。R2 自体が死ぬと、他のどこに冗長性があっても到達できません — 最後の1ホップは単一障害点です。',
  'learning.resilience.lesson.uselessBackup':
    'バックアップリンクは、それを使う経路があって初めて役立ちます。R1 は Server B へ R3 経由の経路しか持たないため、そのリンクを失うと即破棄 — 場所違いの冗長は冗長ではありません。',
  'learning.resilience.next': '次のシナリオ',
  'learning.resilience.summary.lesson':
    '冗長性は「経路」と「ルート」の両方です: 予備リンクは何かがそこを通れるときだけ救い、単一接続のホストは常に危険にさらされます。',
} as const;
