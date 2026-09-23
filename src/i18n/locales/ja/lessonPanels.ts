import type { Catalog } from '../../types';

/**
 * Text for the shared lesson panels added after the browser UX review: the
 * timeline, route table, NAT, observability, failure and sandbox panels. Keys
 * keep the `simulation.` (or `sandbox.`) prefix; they live in their own file
 * so work on the canvas and on the lesson panels does not collide in one
 * catalogue. A key here must not also exist in any other catalogue file.
 */
export const lessonPanels: Catalog = {
  'sandbox.header.actions.label': 'サンドボックスの操作',
  'sandbox.header.export.text': '書き出す',
  'sandbox.header.export.label': 'サンドボックスの編集内容をファイルに書き出す',
  'sandbox.header.undo.text': '↶ 元に戻す',
  'sandbox.header.undo.label': '直前の編集を元に戻す（Ctrl+Z）',
  'sandbox.header.redo.text': '↷ やり直す',
  'sandbox.header.redo.label': '元に戻した編集をやり直す（Ctrl+Shift+Z）',

  'sandbox.terms.nodeTab.description':
    'キャンバス上の機器かリンクを右クリックすると、サンドボックスで変えられる項目が開きます。',
  'sandbox.terms.nodeTab.mtu': 'インタフェース MTU',
  'sandbox.terms.editor.nodeMissing': '機器が見つかりません。',
  'sandbox.terms.editor.mtu.empty': '編集できるインタフェースはありません。',
  'sandbox.terms.editor.mtu.heading': 'インタフェース MTU',
  'sandbox.terms.editor.mtu.interface': 'インタフェース',
  'sandbox.terms.editor.nat.empty': 'NAT に対応したインタフェースはありません。',
  'sandbox.terms.editor.nat.outboundInterface': '外向きインタフェース',
  'sandbox.terms.editor.route.interface': 'インタフェース',
  'sandbox.terms.editor.route.interfaceLabel': '経路の出口インタフェース',
  'sandbox.terms.largeTopology.critical':
    '機器が {{count}} 台あり、動作を確かめた上限を超えています。',
  'sandbox.terms.largeTopology.warning':
    '機器が {{count}} 台あるため、再生が遅くなることがあります。',

  'simulation.failureGroups.label': '障害を起こす対象',
  'simulation.failureGroups.downCount': '{{count}} 件停止中',

  'simulation.flowView.empty': 'まだ通信はありません。フローを送ると、記録がここに並びます。',
  'simulation.flowView.explainer':
    'NetFlow はルータを通るすべてのフローのパケットを数えます。sFlow はスイッチで一部のパケットだけを抜き取って報告します。',
  'simulation.flowView.kind.netflowUpdate': 'フローの記録を更新',
  'simulation.flowView.kind.netflowExport': 'フローの記録を送出',
  'simulation.flowView.kind.sflowSampled': 'パケットを抜き取り',
  'simulation.flowView.kind.sflowDropped': '抜き取りを破棄',

  'simulation.natView.pickRouter':
    'NAT ルータを選ぶか、NAT ルータを通る通信を送ると、ここにアドレス変換の表が出ます。',

  'simulation.panelGloss.af.title': 'AF＝アドレスの種類。v4 は IPv4、v6 は IPv6 の経路です。',
  'simulation.panelGloss.ad.title':
    'AD＝管理距離。経路をどこから知ったかの信頼度で、小さいほど優先されます（直結 0、静的 1、OSPF 110）。',
  'simulation.panelGloss.routeTableCaption':
    'AF＝アドレスの種類（v4/v6）・AD＝管理距離（小さいほど優先）',
  'simulation.panelGloss.adCaption': 'AD＝管理距離（小さいほど優先）',
  'simulation.panelGloss.event.create': 'CREATE＝パケットを作る',
  'simulation.panelGloss.event.forward': 'FWD＝次の機器へ転送',
  'simulation.panelGloss.event.deliver': 'DELIVER＝宛先に到着',
  'simulation.panelGloss.event.drop': 'DROP＝破棄',
  'simulation.panelGloss.event.arpRequest': 'ARP-REQ＝ARP 要求（この IP アドレスの持ち主は？）',
  'simulation.panelGloss.event.arpReply': 'ARP-REP＝ARP 応答（持ち主が MAC アドレスを返す）',
  'simulation.panelGloss.filterPlaceholder': '項目 == 値（例: ip.addr == 10.0.0.1）',
  'simulation.panelGloss.filterHint':
    '使える項目: protocol, ip.src, ip.dst, ip.addr, tcp.port, udp.port, eth.addr。&&（かつ）や ||（または）でつなげます。',

  'simulation.verdict.matched':
    '{{destination}} に一致したので {{nextHop}} へ送ります（{{protocol}}、AD={{adminDistance}}）',
  'simulation.verdict.fallback':
    '主経路 {{primaryDestination}}（{{primaryNextHop}}）に届かないため、予備の {{destination}}（{{nextHop}}）を使います',
  'simulation.verdict.noReachable':
    '{{dstIp}} へ届く経路がありません — 一致する経路はどれも使えない状態です',
  'simulation.verdict.noMatch': '{{dstIp}} に一致する経路がありません — パケットは破棄されます',
} as const;
