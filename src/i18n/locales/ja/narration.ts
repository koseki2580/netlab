import type { Catalog } from '../../types';

export const narration: Catalog = {
  'sandbox.narration.edit.interfaceMtu':
    '{{nodeId}} のインターフェイス {{ifaceId}} の MTU を {{after}} に設定しました。',
  'sandbox.narration.edit.linkState': 'リンク {{edgeId}} を {{after}} に設定しました。',
  'sandbox.narration.edit.routeAdd':
    '{{nodeId}} に静的ルートを追加しました: {{prefix}} via {{nextHop}}。',
  'sandbox.narration.edit.routeRemove': '{{nodeId}} から静的ルートを削除しました。',
  'sandbox.narration.edit.routeEdit': '{{nodeId}} の静的ルートを更新しました。',
  'sandbox.narration.edit.natAdd': '{{nodeId}} に NAT ルールを追加しました。',
  'sandbox.narration.edit.natRemove': '{{nodeId}} から NAT ルールを削除しました。',
  'sandbox.narration.edit.natEdit': '{{nodeId}} の NAT ルールを更新しました。',
  'sandbox.narration.edit.aclAdd': '{{nodeId}} に ACL ルールを追加しました。',
  'sandbox.narration.edit.aclRemove': '{{nodeId}} から ACL ルールを削除しました。',
  'sandbox.narration.edit.aclEdit': '{{nodeId}} の ACL ルールを更新しました。',
  'sandbox.narration.edit.paramSet': 'パラメータ {{key}} を {{after}} に変更しました。',
  'sandbox.narration.edit.packetHeader':
    'パケットヘッダーフィールド {{fieldPath}} を {{after}} に設定しました。',
  'sandbox.narration.edit.packetFlagsTcp': 'TCP フラグを更新しました。',
  'sandbox.narration.edit.packetPayload': 'パケットペイロードを更新しました。',
  'sandbox.narration.edit.packetCompose': '新しいパケットを作成しました。',
  'sandbox.narration.edit.trafficLaunch':
    '{{srcNodeId}} から {{dstNodeId}} へのトラフィックフローを開始しました。',
  'sandbox.narration.edit.generic': '編集を適用しました。',
  'sandbox.narration.undone': 'Undo: {{detail}}',
  'sandbox.narration.undoneGeneric': '最後の編集を Undo しました。',
  'sandbox.narration.redone': 'Redo: {{detail}}',
  'sandbox.narration.redoneGeneric': '最後の編集を Redo しました。',
  'sandbox.narration.modeBeta':
    '比較モードを有効にしました。ベースラインと what-if を並べて実行しています。',
  'sandbox.narration.modeAlpha': '比較モードを終了しました。',
  'sandbox.narration.resetAll':
    'すべての編集をリセットし、サンドボックスをベースラインに戻しました。',
} as const;
