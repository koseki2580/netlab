import type { Catalog } from '../../types';

/**
 * Device-panel text added so a device's settings read like the settings screen
 * a learner knows: mask, default gateway, and what a DHCP lease handed out.
 * Keys keep the `simulation.` prefix; a key here must not also exist in any
 * other catalogue file.
 */
export const detailPanel: Catalog = {
  'simulation.nodeDetail.hostSettings.heading': 'IP SETTINGS',
  'simulation.nodeDetail.hostSettings.ip': 'IP address',
  'simulation.nodeDetail.hostSettings.mask': 'Subnet mask',
  'simulation.nodeDetail.hostSettings.gateway': 'Default gateway',
  'simulation.nodeDetail.hostSettings.dns': 'DNS server',
  'simulation.nodeDetail.hostSettings.notSet': 'Not set',
  'simulation.nodeDetail.hostSettings.noGatewayHint':
    'Packets for another network have no way out of this LAN.',
  'simulation.nodeDetail.dhcp.subnetMask': 'Subnet Mask',
} as const;
