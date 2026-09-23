import type { Catalog } from '../../types';

/**
 * The topology editor: toolbar, element palette and layer toggles, the
 * inspector rail (node editor, checks, run results and history), the Run
 * button, and the messages shown when the editor or its canvas fails to load.
 *
 * The canvas zoom/fit/grid controls are shared with the simulator and live in
 * `simulation.canvas.*`. Validation messages and fix labels come from the
 * connection validator and are not here. Hop events, device roles, layer ids,
 * addresses and field names such as IP/MAC/TTL are codes and stay as they are.
 */
export const editor: Catalog = {
  'editor.toolbar.add': 'ADD',
  'editor.toolbar.addRouter': 'Add Router',
  'editor.toolbar.router': '+ Router',
  'editor.toolbar.addSwitch': 'Add Switch',
  'editor.toolbar.switch': '+ Switch',
  'editor.toolbar.addClient': 'Add Client',
  'editor.toolbar.client': '+ Client',
  'editor.toolbar.addServer': 'Add Server',
  'editor.toolbar.server': '+ Server',
  'editor.toolbar.undoTitle': 'Undo (last action)',
  'editor.toolbar.undo': '↩ Undo',
  'editor.toolbar.redoTitle': 'Redo',
  'editor.toolbar.redo': '↪ Redo',
  'editor.toolbar.shortcuts':
    'Shortcuts: Ctrl/⌘+Z undo · Ctrl/⌘+Y or ⌘+Shift+Z redo · Delete removes the selection',

  'editor.run.label': '▶ Run',
  'editor.run.running': '… running',
  'editor.run.unavailable': 'Simulation is not available here',
  'editor.run.needAddresses': 'Give at least two nodes an IP address first',
  'editor.run.send': 'Send a packet {{src}} → {{dst}}',
  'editor.run.outcome.delivered': '{{src}} → {{dst}}: delivered',
  'editor.run.outcome.dropped':
    '{{src}} → {{dst}}: did not arrive — dropped at {{node}} ({{reason}}: {{explanation}})',
  'editor.run.outcome.droppedNoReason': '{{src}} → {{dst}}: did not arrive — dropped at {{node}}',
  'editor.run.outcome.notSent': '{{src}} → {{dst}}: the packet could not be sent',

  'editor.dropReason.noRoute':
    'the router has no route towards the destination; give it an interface in that subnet or add a static route',
  'editor.dropReason.ttlExceeded':
    'the TTL ran out, usually because routers keep passing the packet around; check the routes',
  'editor.dropReason.ttlExpired':
    'the TTL ran out, usually because routers keep passing the packet around; check the routes',
  'editor.dropReason.routingLoop': 'the routes form a loop, so the packet goes round in circles',
  'editor.dropReason.nodeDown': 'a device on the way is switched off',
  'editor.dropReason.linkFailed': 'a link on the way is broken',
  'editor.dropReason.interfaceDown': 'an interface on the way is down',
  'editor.dropReason.nodeNotFound': 'the destination device does not exist',
  'editor.dropReason.noEgressInVlan': 'the switch has no port in that VLAN to send it out of',
  'editor.dropReason.stpPortBlocked': 'spanning tree has blocked this port to prevent a loop',
  'editor.dropReason.queueFull': 'the queue was full, so the packet was thrown away',
  'editor.dropReason.loss': 'the link lost the packet',
  'editor.dropReason.unknown': 'no explanation for this code yet',

  'editor.connect.hint': 'To link two devices, hover one and drag its ⊕ onto the other.',
  'editor.connect.refused.endpointToEndpoint':
    '{{source}} and {{target}} cannot be linked directly: clients and servers connect through a switch. Add a switch and link both of them to it.',
  'editor.connect.refused.duplicateEdge': '{{source}} and {{target}} are already linked.',
  'editor.connect.refused.selfLoop':
    'A device cannot be linked to itself. Release the ⊕ over a different device.',
  'editor.connect.refused.interfaceInUse':
    'That interface is already in use. Pick a different one.',
  'editor.connect.refused.other': '{{source}} and {{target}} cannot be linked.',
  'editor.connect.dismiss': 'Close',

  'editor.palette.label': 'Elements by layer',
  'editor.palette.empty': 'No elements available for the selected layers.',
  'editor.palette.layer.l1': 'L1 — Physical',
  'editor.palette.layer.l2': 'L2 — Data link',
  'editor.palette.layer.l3': 'L3 — Network',
  'editor.palette.layer.l4': 'L4 — Transport',
  'editor.palette.layer.l7': 'L7 — Application',
  'editor.palette.showLayer': 'Show {{layer}}',
  'editor.palette.hideLayer': 'Hide {{layer}}',
  'editor.palette.shown': 'shown',
  'editor.palette.hidden': 'hidden',
  'editor.palette.item.switch.label': 'Switch',
  'editor.palette.item.switch.hint': 'Forwards frames by MAC within one broadcast domain',
  'editor.palette.item.router.label': 'Router',
  'editor.palette.item.router.hint': 'Forwards packets between subnets by IP',
  'editor.palette.item.client.label': 'Client',
  'editor.palette.item.client.hint': 'Originates requests',
  'editor.palette.item.server.label': 'Server',
  'editor.palette.item.server.hint': 'Answers requests',

  'editor.sidebar.label': 'Inspector',
  'editor.sidebar.tab.node': 'Node',
  'editor.sidebar.tab.validation': 'Checks',
  'editor.sidebar.tab.history': 'Run',

  'editor.node.heading': 'EDIT NODE',
  'editor.node.empty':
    'Select a device on the canvas to edit its addresses, interfaces and routes.',
  'editor.node.label': 'LABEL',
  'editor.node.ipAddress': 'IP ADDRESS',
  'editor.node.ipPlaceholder': 'e.g. 10.0.0.10',
  'editor.node.macAddress': 'MAC ADDRESS',
  'editor.node.macPlaceholder': 'e.g. aa:bb:cc:dd:ee:ff',
  'editor.node.interfaces': 'INTERFACES',
  'editor.node.addInterface': '+ Add Interface',
  'editor.node.removeInterface': 'Remove interface',
  'editor.node.ports': 'PORTS',
  'editor.node.addPort': '+ Add Port',
  'editor.node.removePort': 'Remove port',
  'editor.node.staticRoutes': 'STATIC ROUTES',
  'editor.node.addRoute': '+ Add Route',
  'editor.node.nextHopPlaceholder': "next-hop or 'direct'",
  'editor.node.removeRoute': 'Remove route',
  'editor.node.delete': 'Delete Node',
  'editor.node.deleteHint':
    'The Delete key also removes the selected device; Ctrl/⌘+Z brings it back.',

  'editor.validation.none': '✅ No issues found',
  'editor.validation.heading': 'Topology Issues',
  'editor.validation.errors': '{{count}} errors',
  'editor.validation.warnings': '{{count}} warnings',
  'editor.check.isolated':
    '{{name}} is not linked to anything. Hover it and drag its ⊕ onto another device.',
  'editor.check.hostUnlinked':
    '{{name}} has no link, so it cannot send or receive. Link it to a switch.',
  'editor.check.routerNoAddress':
    '{{name}} has no interface with an IP address, so it cannot route. Select it, add an interface and give it an address.',

  'editor.history.delivered': 'delivered',
  'editor.history.dropped': 'dropped',
  'editor.history.longestPath': 'longest path',
  'editor.history.hops': '{{count}} hops',
  'editor.history.empty': 'No packets yet — run the topology to record a history.',

  'editor.canvas.ifaceDown': '{{count}} iface down',
  'editor.canvas.ifacesDown': '{{count}} ifaces down',

  'editor.load.editorHeading': 'Editor could not be loaded',
  'editor.load.editorBody':
    'The code for the topology editor failed to download. Check your connection and try again.',
  'editor.load.canvasHeading': 'Canvas could not be loaded',
  'editor.load.canvasBody':
    'The code for the diagram engine failed to download. Check your connection and try again.',
  'editor.load.retry': 'Retry',
} as const;
