import type { Catalog } from '../../types';

/**
 * Canvas and device-panel text added after the browser UX review: link states
 * drawn on the canvas and their legend, the device panel's overview, header and
 * chrome. Keys keep the `simulation.` prefix; they live in their own file so
 * work on the canvas and on the lesson panels does not collide in one catalogue.
 * A key here must not also exist in `simulation.ts`.
 */
export const canvasPanel: Catalog = {
  'simulation.linkState.down': 'link down',
  'simulation.linkState.downHint': 'This link has failed. Nothing crosses it.',
  'simulation.linkState.blocked': 'blocked',
  'simulation.linkState.blockedHint':
    'This link works, but it is kept out of forwarding, as spanning tree does to break a loop.',
  'simulation.linkState.keyLabel': 'Link states on this diagram',
  'simulation.legend.linkStates': 'link states',
  'simulation.nodeDetail.layer.l1': 'L1 · physical layer',
  'simulation.nodeDetail.layer.l2': 'L2 · data link layer',
  'simulation.nodeDetail.layer.l3': 'L3 · network layer',
  'simulation.nodeDetail.layer.l4': 'L4 · transport layer',
  'simulation.nodeDetail.layer.l7': 'L7 · application layer',
  'simulation.nodeDetail.overview.heading': 'AT A GLANCE',
  'simulation.nodeDetail.overview.role': 'Role',
  'simulation.nodeDetail.overview.roleRouter':
    'Joins subnets together and passes each packet on toward its destination.',
  'simulation.nodeDetail.overview.roleSwitch':
    'Joins the devices of one network and passes each frame on by its MAC address.',
  'simulation.nodeDetail.overview.interfaces': 'Interfaces',
  'simulation.nodeDetail.overview.ports': 'Ports',
  'simulation.nodeDetail.overview.count': '{{count}}',
  'simulation.nodeDetail.overview.subnets': 'Subnets',
  'simulation.nodeDetail.overview.linkedTo': 'Linked to',
  'simulation.nodeDetail.overview.none': 'none',
  'simulation.nodeDetail.mtuUnlimited': 'no limit: a packet of any size passes',
} as const;
