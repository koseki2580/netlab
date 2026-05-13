import type { Catalog } from '../../types';

export const intro = {
  'sandbox.intro.chrome.label': 'サンドボックス入門',
  'sandbox.intro.progress': 'ステップ {{current}} / {{total}}',
  'sandbox.intro.undoBlocked': 'この入門ステップでは Undo はブロックされています。',
  'sandbox.intro.start': '入門を開始',
  'sandbox.intro.restart': '入門をやり直す',
  'sandbox.intro.skip': '入門をスキップ',

  'sandbox.intro.mtu.title': 'サンドボックス入門',
  'sandbox.intro.mtu.summary':
    'MTU を編集し、トラフィックを流し、結果を比較しながらサンドボックスの基本ループを学びます。',
  'sandbox.intro.mtu.step.openNodeTab.title': 'ノードタブを開く',
  'sandbox.intro.mtu.step.openNodeTab.description':
    'サンドボックスパネルのノードタブを開き、ノードとリンクの編集に集中します。',
  'sandbox.intro.mtu.step.editMtu.title': 'MTU を小さくする',
  'sandbox.intro.mtu.step.editMtu.description':
    'ルーティングノードを右クリックし、MTU エディターを開いて、インターフェイス MTU を小さくして適用します。',
  'sandbox.intro.mtu.step.launchTraffic.title': 'サンドボックストラフィックを開始',
  'sandbox.intro.mtu.step.launchTraffic.description':
    'トラフィックタブから、編集後のトポロジーを通る合成フローを開始します。',
  'sandbox.intro.mtu.step.enterCompare.title': '比較モードに入る',
  'sandbox.intro.mtu.step.enterCompare.description':
    'サンドボックスをライブから比較へ切り替え、ベースラインと what-if を並べて確認します。',
  'sandbox.intro.mtu.step.exitCompare.title': '比較モードを終了',
  'sandbox.intro.mtu.step.exitCompare.description': 'ライブモードに戻り、自由に探索を続けます。',

  'sandbox.intro.tcp.title': 'TCP 入門',
  'sandbox.intro.tcp.summary': 'SYN を RST に切り替えます。',
  'sandbox.intro.tcp.step.openPacketTab.title': 'パケットを開く',
  'sandbox.intro.tcp.step.openPacketTab.description': 'パケットタブを開きます。',
  'sandbox.intro.tcp.step.pauseOnSyn.title': 'TCP を開始',
  'sandbox.intro.tcp.step.pauseOnSyn.description': 'TCP を開始します。',
  'sandbox.intro.tcp.step.flipSynToRst.title': 'SYN を RST に切り替える',
  'sandbox.intro.tcp.step.flipSynToRst.description': 'SYN をオフ、RST をオンにします。',
  'sandbox.intro.tcp.step.resumeAfterEdit.title': '再開',
  'sandbox.intro.tcp.step.resumeAfterEdit.description': '続行します。',
  'sandbox.intro.tcp.step.observeHandshakeFailure.title': 'リセットを観察',
  'sandbox.intro.tcp.step.observeHandshakeFailure.description': 'リセットを確認します。',

  'sandbox.intro.ospf.title': 'OSPF 入門',
  'sandbox.intro.ospf.summary': '経路を落として迂回します。',
  'sandbox.intro.ospf.step.openNodeTab.title': 'ノードを開く',
  'sandbox.intro.ospf.step.openNodeTab.description': 'ノードタブを開きます。',
  'sandbox.intro.ospf.step.disablePrimaryLink.title': 'リンクを無効化',
  'sandbox.intro.ospf.step.disablePrimaryLink.description': 'リンクを障害状態にします。',
  'sandbox.intro.ospf.step.observeBackupPath.title': 'トラフィックを開始',
  'sandbox.intro.ospf.step.observeBackupPath.description': 'トラフィックを開始します。',
  'sandbox.intro.ospf.step.addStaticBackup.title': 'ルートを追加',
  'sandbox.intro.ospf.step.addStaticBackup.description': 'バックアップを追加します。',
  'sandbox.intro.ospf.step.confirmBackupTraffic.title': '経路を確認',
  'sandbox.intro.ospf.step.confirmBackupTraffic.description': 'もう一度開始します。',

  'sandbox.intro.nat.title': 'NAT 入門',
  'sandbox.intro.nat.summary': 'DNAT を追加し、試して、削除します。',
  'sandbox.intro.nat.step.openNodeTab.title': 'ノードを開く',
  'sandbox.intro.nat.step.openNodeTab.description': 'ノードタブを開きます。',
  'sandbox.intro.nat.step.addDnatRule.title': 'DNAT を追加',
  'sandbox.intro.nat.step.addDnatRule.description': 'DNAT を追加します。',
  'sandbox.intro.nat.step.launchExternalProbe.title': '外部から開始',
  'sandbox.intro.nat.step.launchExternalProbe.description': '外部から開始します。',
  'sandbox.intro.nat.step.observeDnatTranslation.title': 'DNAT を観察',
  'sandbox.intro.nat.step.observeDnatTranslation.description': '書き換えを確認します。',
  'sandbox.intro.nat.step.removeRuleAndRetry.title': '削除して再試行',
  'sandbox.intro.nat.step.removeRuleAndRetry.description': '再試行します。',
} as const satisfies Catalog;
