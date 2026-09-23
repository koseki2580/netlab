import type { Catalog } from '../../types';

/**
 * Text for the shared lesson panels added after the browser UX review: the
 * timeline, route table, NAT, observability, failure and sandbox panels. Keys
 * keep the `simulation.` (or `sandbox.`) prefix; they live in their own file
 * so work on the canvas and on the lesson panels does not collide in one
 * catalogue. A key here must not also exist in any other catalogue file.
 */
export const lessonPanels: Catalog = {
  // Sandbox panel header: file actions wrap onto their own row, and undo is a button.
  'sandbox.header.actions.label': 'Sandbox actions',
  'sandbox.header.export.text': 'Export',
  'sandbox.header.export.label': 'Export sandbox session',
  'sandbox.header.undo.text': '↶ Undo',
  'sandbox.header.undo.label': 'Undo the last edit (Ctrl+Z)',
  'sandbox.header.redo.text': '↷ Redo',
  'sandbox.header.redo.label': 'Redo the edit you undid (Ctrl+Shift+Z)',

  // Sandbox wording aligned with the rest of the product (機器, インタフェース in Japanese).
  'sandbox.terms.nodeTab.description':
    'Right-click a node or link on the canvas and choose sandbox editing actions.',
  'sandbox.terms.nodeTab.mtu': 'Interface MTU',
  'sandbox.terms.editor.nodeMissing': 'Node not found.',
  'sandbox.terms.editor.mtu.empty': 'No editable interfaces.',
  'sandbox.terms.editor.mtu.heading': 'Interface MTU',
  'sandbox.terms.editor.mtu.interface': 'Interface',
  'sandbox.terms.editor.nat.empty': 'No NAT-capable interfaces.',
  'sandbox.terms.editor.nat.outboundInterface': 'Outbound interface',
  'sandbox.terms.editor.route.interface': 'Interface',
  'sandbox.terms.editor.route.interfaceLabel': 'Route interface',
  'sandbox.terms.largeTopology.critical': '{{count}} nodes exceeds the tested bound.',
  'sandbox.terms.largeTopology.warning': '{{count}} nodes may replay more slowly.',

  // Failure panel: one group of switches at a time.
  'simulation.failureGroups.label': 'What to break',
  'simulation.failureGroups.downCount': '{{count}} down',

  // Flow collector (NetFlow / sFlow).
  'simulation.flowView.empty': 'No flows yet. Send a flow and each record appears here.',
  'simulation.flowView.explainer':
    'NetFlow counts every packet of every flow through the router. sFlow picks only some packets on the switch and reports those samples.',
  'simulation.flowView.kind.netflowUpdate': 'Flow record updated',
  'simulation.flowView.kind.netflowExport': 'Flow record exported',
  'simulation.flowView.kind.sflowSampled': 'Packet sampled',
  'simulation.flowView.kind.sflowDropped': 'Sample discarded',

  // NAT table.
  'simulation.natView.pickRouter':
    'Select a NAT router, or send traffic through one, to see its translations.',

  // Codes in the route tables and the timeline, kept as codes but explained.
  'simulation.panelGloss.af.title': 'AF = address family: v4 is an IPv4 route, v6 an IPv6 route.',
  'simulation.panelGloss.ad.title':
    'AD = administrative distance: how far the router trusts where it learned a route. Lower wins (connected 0, static 1, OSPF 110).',
  'simulation.panelGloss.routeTableCaption':
    'AF = address family (v4/v6) · AD = administrative distance, lower wins',
  'simulation.panelGloss.adCaption': 'AD = administrative distance, lower wins',
  'simulation.panelGloss.event.create': 'CREATE = the packet is made',
  'simulation.panelGloss.event.forward': 'FWD = forwarded to the next device',
  'simulation.panelGloss.event.deliver': 'DELIVER = reached its destination',
  'simulation.panelGloss.event.drop': 'DROP = thrown away',
  'simulation.panelGloss.event.arpRequest': 'ARP-REQ = ARP request: who has this IP address?',
  'simulation.panelGloss.event.arpReply': 'ARP-REP = ARP reply: the owner answers with its MAC',
  'simulation.panelGloss.filterPlaceholder': 'field == value, e.g. ip.addr == 10.0.0.1',
  'simulation.panelGloss.filterHint':
    'Fields: protocol, ip.src, ip.dst, ip.addr, tcp.port, udp.port, eth.addr. Join with && (and) or || (or).',

  // Routing verdict shown under the step simulation and the hop inspector.
  'simulation.verdict.matched':
    'Matched {{destination}} via {{nextHop}} ({{protocol}}, AD={{adminDistance}})',
  'simulation.verdict.fallback':
    'Fallback via {{destination}} ({{nextHop}}) — primary route {{primaryDestination}} ({{primaryNextHop}}) unreachable',
  'simulation.verdict.noReachable':
    'No reachable route for {{dstIp}} — matching routes are unavailable',
  'simulation.verdict.noMatch': 'No matching route for {{dstIp}} — packet will be dropped',
} as const;
