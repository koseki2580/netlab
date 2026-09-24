import type { Catalog } from '../../types';

/**
 * Device-panel text added so a device's settings read like the settings screen
 * a learner knows: mask, default gateway, and what a DHCP lease handed out.
 * Keys keep the `simulation.` prefix; a key here must not also exist in any
 * other catalogue file.
 */
export const detailPanel: Catalog = {
  'simulation.nodeDetail.hostSettings.heading': 'IP 設定',
  'simulation.nodeDetail.hostSettings.ip': 'IP アドレス',
  'simulation.nodeDetail.hostSettings.mask': 'サブネットマスク',
  'simulation.nodeDetail.hostSettings.gateway': 'デフォルトゲートウェイ',
  'simulation.nodeDetail.hostSettings.dns': 'DNS サーバ',
  'simulation.nodeDetail.hostSettings.notSet': '未設定',
  'simulation.nodeDetail.hostSettings.noGatewayHint':
    '別のネットワーク宛てのパケットは、この LAN の外へ出られません。',
  'simulation.nodeDetail.dhcp.subnetMask': 'サブネットマスク',
} as const;
