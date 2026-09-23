import type { Catalog } from '../../types';

export const editor: Catalog = {
  'editor.toolbar.add': '追加',
  'editor.toolbar.addRouter': 'ルータを追加',
  'editor.toolbar.router': '+ ルータ',
  'editor.toolbar.addSwitch': 'スイッチを追加',
  'editor.toolbar.switch': '+ スイッチ',
  'editor.toolbar.addClient': 'クライアントを追加',
  'editor.toolbar.client': '+ クライアント',
  'editor.toolbar.addServer': 'サーバを追加',
  'editor.toolbar.server': '+ サーバ',
  'editor.toolbar.undoTitle': '元に戻す（直前の操作）',
  'editor.toolbar.undo': '↩ 元に戻す',
  'editor.toolbar.redoTitle': 'やり直す',
  'editor.toolbar.redo': '↪ やり直す',
  'editor.toolbar.shortcuts':
    'ショートカット: Ctrl/⌘+Z で元に戻す · Ctrl/⌘+Y または ⌘+Shift+Z でやり直す · Delete キーで選んだものを削除',

  'editor.run.label': '▶ 実行',
  'editor.run.running': '… 実行中',
  'editor.run.unavailable': 'ここではシミュレーションを使えません',
  'editor.run.needAddresses': 'まず 2 台以上の機器に IP アドレスを設定してください',
  'editor.run.send': '{{src}} → {{dst}} へパケットを送る',
  'editor.run.outcome.delivered': '{{src}} → {{dst}}：届いた',
  'editor.run.outcome.dropped':
    '{{src}} → {{dst}}：届かなかった — {{node}} で捨てられました（{{reason}}：{{explanation}}）',
  'editor.run.outcome.droppedNoReason':
    '{{src}} → {{dst}}：届かなかった — {{node}} で捨てられました',
  'editor.run.outcome.notSent': '{{src}} → {{dst}}：パケットを送れませんでした',

  'editor.dropReason.noRoute':
    'ルータが宛先への経路を知りません。宛先のサブネットにつながるインタフェースを設定するか、静的ルートを追加してください',
  'editor.dropReason.ttlExceeded':
    'TTL が 0 になりました。ルータ同士がパケットを回し合っていないか、ルートを確認してください',
  'editor.dropReason.ttlExpired':
    'TTL が 0 になりました。ルータ同士がパケットを回し合っていないか、ルートを確認してください',
  'editor.dropReason.routingLoop': 'ルートが輪になっていて、パケットが同じ所を回り続けます',
  'editor.dropReason.nodeDown': '途中の機器が停止しています',
  'editor.dropReason.linkFailed': '途中のリンクが切れています',
  'editor.dropReason.interfaceDown': '途中のインタフェースが停止しています',
  'editor.dropReason.nodeNotFound': '宛先の機器が見つかりません',
  'editor.dropReason.noEgressInVlan': 'スイッチにそのVLANで送り出せるポートがありません',
  'editor.dropReason.stpPortBlocked':
    'ループを防ぐため、スパニングツリーがこのポートを止めています',
  'editor.dropReason.queueFull': 'キューがいっぱいで、パケットが捨てられました',
  'editor.dropReason.loss': 'リンクの途中でパケットが失われました',
  'editor.dropReason.unknown': 'この理由コードの説明はまだありません',

  'editor.connect.hint':
    '2 台をつなぐには、機器にマウスを乗せて出る ⊕ を、もう 1 台の上までドラッグします。',
  'editor.connect.refused.endpointToEndpoint':
    '{{source}} と {{target}} は直接つなげません。クライアントとサーバは、間にスイッチを置いてつなぎます。スイッチを追加して、両方をそのスイッチにつないでください。',
  'editor.connect.refused.duplicateEdge': '{{source}} と {{target}} はもうつながっています。',
  'editor.connect.refused.selfLoop':
    '機器を自分自身にはつなげません。⊕ は別の機器の上で離してください。',
  'editor.connect.refused.interfaceInUse':
    'そのインタフェースはもう使われています。別のインタフェースを選んでください。',
  'editor.connect.refused.other': '{{source}} と {{target}} はつなげません。',
  'editor.connect.dismiss': '閉じる',

  'editor.palette.label': 'レイヤー別の機器',
  'editor.palette.empty': '選んだレイヤーには置ける機器がありません。',
  'editor.palette.layer.l1': 'L1 — 物理層',
  'editor.palette.layer.l2': 'L2 — データリンク層',
  'editor.palette.layer.l3': 'L3 — ネットワーク層',
  'editor.palette.layer.l4': 'L4 — トランスポート層',
  'editor.palette.layer.l7': 'L7 — アプリケーション層',
  'editor.palette.showLayer': '{{layer}} を表示する',
  'editor.palette.hideLayer': '{{layer}} を非表示にする',
  'editor.palette.shown': '表示中',
  'editor.palette.hidden': '非表示',
  'editor.palette.item.switch.label': 'スイッチ',
  'editor.palette.item.switch.hint':
    'MAC アドレスを見て、同じブロードキャストドメインの中でフレームを転送します',
  'editor.palette.item.router.label': 'ルータ',
  'editor.palette.item.router.hint': 'IP アドレスを見て、サブネットの間でパケットを転送します',
  'editor.palette.item.client.label': 'クライアント',
  'editor.palette.item.client.hint': 'リクエストを送り出す側',
  'editor.palette.item.server.label': 'サーバ',
  'editor.palette.item.server.hint': 'リクエストに応える側',

  'editor.sidebar.label': '詳細パネル',
  'editor.sidebar.tab.node': '機器',
  'editor.sidebar.tab.validation': '検証',
  'editor.sidebar.tab.history': '実行',

  'editor.node.heading': '機器の編集',
  'editor.node.empty':
    'キャンバス上の機器を選ぶと、アドレス・インタフェース・ルートを編集できます。',
  'editor.node.label': '表示名',
  'editor.node.ipAddress': 'IP アドレス',
  'editor.node.ipPlaceholder': '例: 10.0.0.10',
  'editor.node.macAddress': 'MAC アドレス',
  'editor.node.macPlaceholder': '例: aa:bb:cc:dd:ee:ff',
  'editor.node.interfaces': 'インタフェース',
  'editor.node.addInterface': '+ インタフェースを追加',
  'editor.node.removeInterface': 'インタフェースを削除',
  'editor.node.ports': 'ポート',
  'editor.node.addPort': '+ ポートを追加',
  'editor.node.removePort': 'ポートを削除',
  'editor.node.staticRoutes': '静的ルート',
  'editor.node.addRoute': '+ ルートを追加',
  'editor.node.nextHopPlaceholder': "ネクストホップ または 'direct'",
  'editor.node.removeRoute': 'ルートを削除',
  'editor.node.delete': '機器を削除',
  'editor.node.deleteHint': 'Delete キーでも選んだ機器を削除できます。Ctrl/⌘+Z で元に戻せます。',

  'editor.validation.none': '✅ 問題は見つかりませんでした',
  'editor.validation.heading': 'トポロジの問題',
  'editor.validation.errors': 'エラー {{count}} 件',
  'editor.validation.warnings': '警告 {{count}} 件',
  'editor.check.isolated':
    '{{name}} はどこにもつながっていません。マウスを乗せて出る ⊕ を、別の機器までドラッグしてください。',
  'editor.check.hostUnlinked':
    '{{name}} にはケーブルがないので、送ることも受け取ることもできません。スイッチにつないでください。',
  'editor.check.routerNoAddress':
    '{{name}} には IP アドレスのついたインタフェースがないので、ルーティングできません。選んで「インタフェースを追加」し、アドレスを入れてください。',

  'editor.history.delivered': '届いた',
  'editor.history.dropped': '落ちた',
  'editor.history.longestPath': '最長の経路',
  'editor.history.hops': '{{count}} ホップ',
  'editor.history.empty': 'まだパケットはありません。実行すると履歴が記録されます。',

  'editor.canvas.ifaceDown': '停止中の IF: {{count}}',
  'editor.canvas.ifacesDown': '停止中の IF: {{count}}',

  'editor.load.editorHeading': 'エディタを読み込めませんでした',
  'editor.load.editorBody':
    'トポロジエディタのプログラムをダウンロードできませんでした。接続を確認して、もう一度お試しください。',
  'editor.load.canvasHeading': 'キャンバスを読み込めませんでした',
  'editor.load.canvasBody':
    '図を描くエンジンのプログラムをダウンロードできませんでした。接続を確認して、もう一度お試しください。',
  'editor.load.retry': '再試行',
} as const;
