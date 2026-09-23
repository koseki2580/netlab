import type { Catalog } from '../../types';

/**
 * Canvas and device-panel text added after the browser UX review: link states
 * drawn on the canvas and their legend, the device panel's overview, header and
 * chrome. Keys keep the `simulation.` prefix; they live in their own file so
 * work on the canvas and on the lesson panels does not collide in one catalogue.
 * A key here must not also exist in `simulation.ts`.
 */
export const canvasPanel: Catalog = {
  'simulation.linkState.down': 'リンク故障',
  'simulation.linkState.downHint': 'このリンクは故障していて、何も通りません。',
  'simulation.linkState.blocked': 'ブロック中',
  'simulation.linkState.blockedHint':
    'このリンクはつながっていますが、ループを防ぐため（スパニングツリー）転送には使われていません。',
  'simulation.linkState.keyLabel': 'この図のリンクの状態',
  'simulation.legend.linkStates': 'リンクの状態',
  'simulation.nodeDetail.layer.l1': 'L1 物理層',
  'simulation.nodeDetail.layer.l2': 'L2 データリンク層',
  'simulation.nodeDetail.layer.l3': 'L3 ネットワーク層',
  'simulation.nodeDetail.layer.l4': 'L4 トランスポート層',
  'simulation.nodeDetail.layer.l7': 'L7 アプリケーション層',
  'simulation.nodeDetail.overview.heading': 'この機器のあらまし',
  'simulation.nodeDetail.overview.role': '役割',
  'simulation.nodeDetail.overview.roleRouter':
    'サブネットとサブネットをつなぎ、パケットを宛先へ向けて次の機器へ送ります。',
  'simulation.nodeDetail.overview.roleSwitch':
    '同じネットワークの機器どうしをつなぎ、MAC アドレスを見てフレームを送ります。',
  'simulation.nodeDetail.overview.interfaces': 'インタフェース',
  'simulation.nodeDetail.overview.ports': 'ポート',
  'simulation.nodeDetail.overview.count': '{{count}} 個',
  'simulation.nodeDetail.overview.subnets': 'つながるサブネット',
  'simulation.nodeDetail.overview.linkedTo': 'つながる機器',
  'simulation.nodeDetail.overview.none': 'なし',
  'simulation.nodeDetail.mtuUnlimited': '上限なし（どの大きさのパケットも通ります）',
} as const;
