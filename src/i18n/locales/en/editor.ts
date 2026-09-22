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

  'editor.run.label': '▶ Run',
  'editor.run.running': '… running',
  'editor.run.unavailable': 'Simulation is not available here',
  'editor.run.needAddresses': 'Give at least two nodes an IP address first',
  'editor.run.send': 'Send a packet {{src}} → {{dst}}',

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

  'editor.validation.none': '✅ No issues found',
  'editor.validation.heading': 'Topology Issues',
  'editor.validation.errors': '{{count}} errors',
  'editor.validation.warnings': '{{count}} warnings',

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
