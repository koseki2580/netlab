import type { Catalog } from '../../types';

/**
 * The controls every lesson shares: timeline, step controls, route table, hop
 * inspector, packet structure and the display filter.
 *
 * Hop events (CREATE, FWD, DELIVER, DROP), drop reasons, protocol field names
 * and the display-filter syntax are not here on purpose. They are codes: the
 * user guide documents them by name and a learner searches for them.
 */
export const simulation: Catalog = {
  'simulation.timeline.heading': 'PACKET TIMELINE',
  'simulation.timeline.clear': 'Clear timeline',
  'simulation.timeline.hopsShown': '{{shown}} of {{total}} hops shown',
  'simulation.timeline.downloadPcap': 'Download PCAP',
  'simulation.timeline.hops': 'Packet hops',
  'simulation.timeline.empty': 'No trace yet — click "Send Packet" to start.',

  'simulation.steps.heading': 'STEP-BY-STEP SIMULATION',
  'simulation.steps.hopOf': 'Hop {{current}} of {{total}}',
  'simulation.steps.lpmHeading': 'LPM ROUTING TABLE',
  'simulation.steps.column.destination': 'DESTINATION',
  'simulation.steps.column.nextHop': 'NEXT HOP',
  'simulation.steps.column.protocol': 'PROTOCOL',
  'simulation.steps.column.metric': 'METRIC',
  'simulation.steps.match': 'MATCH ✓',
  'simulation.steps.matched': 'MATCHED',
  'simulation.steps.dropReason': 'Drop reason: {{reason}}',
  'simulation.steps.logIdle': 'Send a packet to begin.',
  'simulation.steps.logLoaded': 'Press Next Step to start stepping.',
  'simulation.steps.next': '→ Next Step',
  'simulation.steps.reset': '⟳ Reset',
  'simulation.steps.statusIdle': 'Send a packet to begin',
  'simulation.steps.statusLoaded': 'Loaded — press Next Step',
  'simulation.steps.statusPaused': 'Paused at hop {{current}} of {{total}}',
  'simulation.steps.statusRunning': 'Running — hop {{current}}',
  'simulation.steps.statusDone': 'Complete — {{total}} hops',

  'simulation.routeTable.heading': 'ROUTE TABLE',
  'simulation.routeTable.collapse': 'Collapse route table',
  'simulation.routeTable.expand': 'Expand route table',
  'simulation.routeTable.none': 'No routes',
  'simulation.routeTable.caption': 'Route table for {{router}}',
  'simulation.routeTable.column.destination': 'Destination',
  'simulation.routeTable.column.nextHop': 'Next Hop',
  'simulation.routeTable.direct': 'direct',

  'simulation.hop.heading': 'HOP INSPECTOR',
  'simulation.hop.empty': 'No hop selected. Click a timeline row to inspect packet details.',
  'simulation.hop.position': 'Hop {{current}} / {{total}}',
  'simulation.hop.fields': 'HOP FIELDS',
  'simulation.hop.arpFields': 'ARP FIELDS',
  'simulation.hop.nat': 'NAT TRANSLATION',
  'simulation.hop.routing': 'ROUTING DECISION',
  'simulation.hop.noCandidates': 'No routing candidates.',
  'simulation.hop.dropReason': 'DROP REASON',
  'simulation.hop.mutated': 'MUTATED FIELDS',
  'simulation.hop.field.node': 'Node',
  'simulation.hop.field.nextHop': 'Next Hop',
  'simulation.hop.field.protocol': 'Protocol',
  'simulation.hop.field.ingress': 'Ingress If',
  'simulation.hop.field.egress': 'Egress If',
  'simulation.hop.field.action': 'Action',
  'simulation.hop.field.fragment': 'Fragment',
  'simulation.hop.field.fragmentTotal': '{{count}} total',
  'simulation.hop.field.type': 'Type',
  'simulation.hop.field.operation': 'Operation',
  'simulation.hop.column.protocol': 'PROTO',
  'simulation.hop.match': 'MATCH',

  'simulation.packet.heading': 'PACKET STRUCTURE',
  'simulation.packet.empty':
    'No packet selected — step through the simulation to inspect packet bytes.',
  'simulation.packet.hexDump': 'HEX DUMP',
  'simulation.packet.moreBytes': '+{{count}} more bytes…',
  'simulation.packet.fieldDetails': 'FIELD DETAILS',
  'simulation.packet.column.layer': 'Layer',
  'simulation.packet.column.field': 'Field',
  'simulation.packet.column.value': 'Value',

  'simulation.filter.label': 'Display filter',
  'simulation.filter.aria': 'Trace display filter',
  'simulation.filter.parseError': 'Parse error at column {{column}}: {{message}}',

  'simulation.canvas.zoomIn': 'Zoom in',
  'simulation.canvas.zoomOut': 'Zoom out',
  'simulation.canvas.zoomReset': 'Reset zoom to 100%',
  'simulation.canvas.fitLabel': 'Fit the diagram in view',
  'simulation.canvas.fit': 'fit',
  'simulation.canvas.gridLabel': 'Snap to grid',
  'simulation.canvas.grid': 'grid',
} as const;
