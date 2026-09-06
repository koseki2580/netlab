/**
 * Centralized `data-testid` constants for Playwright e2e specs.
 *
 * Convention: every locator a spec uses to click, fill, or assert against
 * lives here. Components attach the same string via `data-testid={…}` (or a
 * literal). The `netlab/no-raw-locators-in-e2e` ESLint rule forbids
 * `getByText`, `getByLabel`, regex `getByRole({ name })`, and `locator('text=…')`
 * in `e2e/**` so the catalog stays the single source of truth.
 *
 * Naming: kebab-case `<area>-<element>` or `<area>-<feature>-<element>`. Do
 * NOT rename legacy ids that were grandfathered in (e.g. `gre-outer`,
 * `wireless-loss`); they remain stable contracts with their demos.
 *
 * See {@link ../docs/dev/e2e-locators.md} for the full policy.
 */

export const SEL = {
  app: {
    root: 'netlab-root',
  },
  gallery: {
    heading: 'gallery-heading',
    progressSection: 'gallery-progress-section',
    localeToggleJa: 'gallery-locale-toggle-ja',
    themeMode: (mode: 'light' | 'dark') => `gallery-theme-${mode}`,
    progressExport: 'gallery-progress-export',
    progressClear: 'gallery-progress-clear',
    progressConfirmId: 'gallery-progress-confirm-id',
    progressConfirmClear: 'gallery-progress-confirm-clear',
    progressImport: 'gallery-progress-import',
    progressImportJsonInput: 'gallery-progress-import-json',
    progressExportJsonOutput: 'gallery-progress-export-json',
    assessmentEntryLink: 'gallery-assessment-link',
  },
  commandPalette: {
    search: 'command-palette-search',
    optionFirst: 'command-palette-option',
  },
  nodeDetail: {
    closePanel: 'node-detail-close',
  },
  sandbox: {
    surface: 'sandbox-surface',
    panel: 'sandbox-panel',
    canvasSlot: 'sandbox-canvas-slot',
    resizeHandle: 'sandbox-panel-resize-handle',
    shortcutsHelpBtn: 'sandbox-shortcuts-help-btn',
    shortcutsDialog: 'sandbox-shortcuts-dialog',
    narrationRegion: 'sandbox-narration-region',
    modeSwitch: 'sandbox-mode-switch',
    collapse: 'sandbox-collapse',
    exportSession: 'sandbox-export-session',
    importSessionInput: 'sandbox-import-session-input',
    importSessionPreview: 'sandbox-import-session-preview',
    importSessionApply: 'sandbox-import-session-apply',
    exportScenarioOpen: 'sandbox-export-scenario-open',
    exportScenarioDialog: 'sandbox-export-scenario-dialog',
    exportScenarioId: 'sandbox-export-scenario-id',
    exportScenarioTitle: 'sandbox-export-scenario-title',
    exportScenarioSummary: 'sandbox-export-scenario-summary',
    exportScenarioPreseed: 'sandbox-export-scenario-preseed',
    exportScenarioPreview: 'sandbox-export-scenario-preview',
    exportScenarioDownload: 'sandbox-export-scenario-download',
    pcapDownload: 'sandbox-pcap-download',
    pcapDownloadBaseline: 'sandbox-pcap-download-baseline',
    pcapDownloadWhatif: 'sandbox-pcap-download-whatif',
    pcapDownloadCombined: 'sandbox-pcap-download-combined',
    pcapBranchSelect: 'sandbox-pcap-branch-select',
    fastModeToggle: 'sandbox-fast-mode-toggle',
    proposalPending: 'sandbox-proposal-pending',
    introOverlay: 'sandbox-intro-overlay',
    introStepPanel: 'sandbox-intro-step-panel',
    introStart: 'sandbox-intro-start',
    annotationListItem: 'annotation-list-item',
    annotationsFilter: 'sandbox-annotations-filter',
    linkEditor: {
      root: 'sandbox-link-editor',
      stateDown: 'sandbox-link-state-down',
      apply: 'sandbox-link-state-apply',
    },
    edits: {
      list: 'edit-list-item',
      resetAll: 'sandbox-edits-reset-all',
      revertEdit: (n: number) => `sandbox-edits-revert-${n}`,
    },
    tabs: {
      packet: 'sandbox-tab-packet',
      node: 'sandbox-tab-node',
      parameters: 'sandbox-tab-parameters',
      traffic: 'sandbox-tab-traffic',
      edits: 'sandbox-tab-edits',
      assessment: 'sandbox-tab-assessment',
    },
    parameters: {
      engineTickMs: 'sandbox-param-engine-tick-ms',
      maxTtl: 'sandbox-param-max-ttl',
    },
    traffic: {
      source: 'sandbox-traffic-source',
      destination: 'sandbox-traffic-destination',
      protocol: 'sandbox-traffic-protocol',
      launch: 'sandbox-traffic-launch',
    },
    editPopover: {
      root: 'sandbox-edit-popover',
      mtuInput: 'sandbox-mtu-bytes',
      mtuApply: 'sandbox-mtu-apply',
      natKind: 'sandbox-nat-kind',
      natTranslateTo: 'sandbox-nat-translate-to',
      natAdd: 'sandbox-nat-add',
      natEditor: 'sandbox-nat-editor',
      natEditorRemoveFirst: 'sandbox-nat-editor-remove',
      routeNetwork: 'sandbox-route-network',
      routeNextHop: 'sandbox-route-next-hop',
      routeInterface: 'sandbox-route-interface',
      routeAdd: 'sandbox-route-add',
      nodeNote: 'sandbox-node-note',
      nodeNoteApply: 'sandbox-node-note-apply',
      lossPercent: 'sandbox-link-loss-percent',
      linkApply: 'sandbox-link-apply',
      tcpSynFlag: 'sandbox-tcp-syn-flag',
      tcpRstFlag: 'sandbox-tcp-rst-flag',
      tcpFlagsApply: 'sandbox-tcp-flags-apply',
    },
  },
  tutorial: {
    overlay: 'tutorial-overlay',
    stepPanel: 'tutorial-step-panel',
    start: 'tutorial-start',
  },
  controlledSandbox: {
    pending: 'controlled-sandbox-pending',
    proposeDown: 'controlled-sandbox-propose-down',
    proposeUp: 'controlled-sandbox-propose-up',
    accept: 'controlled-sandbox-accept',
    reject: 'controlled-sandbox-reject',
    topologyJson: 'controlled-topology-json',
  },
  packetViewer: {
    panel: 'packet-viewer-panel',
  },
  demo: {
    // Generic narration / trace log container scoped per-demo. The demo wires
    // `data-testid="demo-trace-log"` on the region that prints simulator
    // narration; specs use `getByTestId(SEL.demo.traceLog)` and `toContainText`.
    traceLog: 'demo-trace-log',
    primaryAction: 'demo-primary-action',
    secondaryAction: 'demo-secondary-action',
    // Per-demo widgets (legacy ids preserved verbatim).
    greOuter: 'gre-outer',
    greShim: 'gre-shim',
    greInner: 'gre-inner',
    greStatus: 'gre-status',
    greKeyChange: 'gre-key-change',
    mplsLdp: 'mpls-ldp',
    mplsPhp: 'mpls-php',
    mplsStack: 'mpls-stack',
    mplsPhpDisable: 'mpls-php-disable',
    vpnv4Route: 'vpnv4-route',
    vxlanOuter: 'vxlan-outer',
    evpnType2: 'evpn-type2',
    evpnType5: 'evpn-type5',
    arpSuppression: 'arp-suppression',
    arpSuppressionToggle: 'arp-suppression-toggle',
    wirelessAssociation: 'wireless-association',
    wirelessLoss: 'wireless-loss',
    wpaMessages: 'wpa-messages',
    hiddenNode: 'hidden-node',
    hiddenNodeToggle: 'hidden-node-toggle',
    stationDistance: 'wireless-station-distance',
    ospfv3Ecmp: 'ospfv3-ecmp',
    mpBgpRoute: 'mp-bgp-route',
    ospfv3LinkFail: 'ospfv3-link-fail',
    ospfFailLink: 'ospf-fail-link',
    slaacMode: 'slaac-mode',
    hostDns: 'host-dns',
    dhcpv6FlagM0O1: 'dhcpv6-flag-m0-o1',
    dhcpv6FlagM0O0: 'dhcpv6-flag-m0-o0',
    vrrpMaster: 'vrrp-master',
    memberCount: 'member-count',
    lacpMember: 'lacp-member',
    haFailGateway: 'ha-fail-gateway',
    haFailLacp: 'ha-fail-lacp',
    h2DataFrame: 'h2-data-frame',
    h2TcpLossToggle: 'h2-tcp-loss-toggle',
    h2Stream: (id: number) => `h2-stream-${id}`,
    h3StreamLossToggle: 'h3-quic-loss-toggle',
    h3Stream: (id: number) => `h3-stream-${id}`,
    /** The negotiated protocol, or the alert when the negotiation failed. */
    tlsAlpn: 'tls-alpn',
    tcpCongestionReset: 'tcp-congestion-reset',
    tcpCongestionRun: 'tcp-congestion-run',
    tcpCongestionChart: 'tcp-congestion-chart',
    tcpCongestionEmpty: 'tcp-congestion-empty',
    /** A step can carry several events, so the id names both. */
    tcpCongestionEvent: (step: number, type: string) => `tcp-congestion-event-${step}-${type}`,
    tlsRunHandshake: 'tls-run-handshake',
    tlsForceAlpnMismatch: 'tls-force-alpn-mismatch',
    httpsAlertBanner: 'https-alert-banner',
    ipv6SendEcho: 'ipv6-send-echo',
    linkQosBurst: 'link-qos-burst',
    linkQosSection: 'link-qos-section',
    observabilityFlow: 'observability-send-flow',
    observabilitySflow: 'observability-sflow-tab',
    dscpSend: 'dscp-send',
    ecmpSend: 'ecmp-send',
    dhcpRun: 'dhcp-run',
    tcpConnect: 'tcp-connect',
  },
  /** The 3-pane topology editor: layer palette, canvas, inspector rail. */
  editor: {
    canvas: 'editor-canvas',
    palette: 'editor-palette',
    paletteEmpty: 'editor-palette-empty',
    paletteItem: (id: string) => `editor-palette-${id}`,
    layerToggle: (layer: string) => `editor-layer-toggle-${layer}`,
    sidebar: 'editor-sidebar',
    sidebarTab: (tab: string) => `editor-sidebar-tab-${tab}`,
    sidebarPanel: (tab: string) => `editor-sidebar-panel-${tab}`,
    run: 'editor-run',
    results: 'editor-results',
    resultsDelivered: 'editor-results-delivered',
    historyEmpty: 'editor-history-empty',
  },
  /** The simulator canvas: area clustering, illustration mode, host control. */
  canvas: {
    /** The simulator canvas's drawing surface, whichever engine renders it. */
    root: 'netlab-canvas',
    /** One device on the canvas, named the same way by every engine. */
    node: 'topology-node',
    areaCluster: 'area-cluster',
    /** The bottom-left legend naming each area and its prefix. */
    areaLegend: 'area-legend',
    controlledJson: 'controlled-topology-json',
  },
  /** The spanning-tree lesson's own trace panel. */
  stp: {
    /** The hop-by-hop path the last ping took, written out. */
    tracePath: 'stp-trace-path',
    /** Whether the segment spanning tree blocked was used. */
    blockedSegment: 'stp-blocked-segment',
    /** Whether the last ping arrived. */
    traceStatus: 'stp-trace-status',
  },
  /** The IGMP snooping lesson's own controls. */
  multicast: {
    /** Join or leave the group, per receiver, named by its label. */
    membership: (label: string) => `multicast-membership-${label.toLowerCase()}`,
    send: 'multicast-send',
  },
  /** The embed demo's simulated light-mode host page. */
  embed: {
    lightHost: 'embed-light-host',
  },
  /** The opt-in maxGraph canvas engine. */
  maxGraph: {
    canvas: 'maxgraph-canvas',
    controls: 'maxgraph-controls',
    minimap: 'maxgraph-minimap',
    zoomIn: 'maxgraph-zoom-in',
    zoomOut: 'maxgraph-zoom-out',
    zoomReset: 'maxgraph-zoom-reset',
    fit: 'maxgraph-fit',
    grid: 'maxgraph-grid',
  },
  traceFilter: {
    searchbox: 'trace-filter-searchbox',
    statusLabel: 'trace-filter-status',
    hop: 'trace-hop',
  },
} as const;

/**
 * The parts of the drawing surface an accessibility scan skips.
 *
 * These name the graph engine's own DOM — the one place a spec cannot avoid
 * doing so, because the excluded regions carry no test id of ours. Collected
 * here so that replacing the engine is one edit rather than twenty, and so it
 * is visible how much of the canvas the scans are not covering.
 *
 * The canvas root is deliberately NOT excluded: the viewport controls beside
 * the drawing must stay in the scan.
 */
export const CANVAS_A11Y_EXCLUSIONS: readonly string[] = [
  '.react-flow__renderer', // the transformed pane, which is role=application
  '.react-flow__attribution', // engine branding, out of scope
];
