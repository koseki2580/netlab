# Netlab Documentation

This directory contains organized documentation regarding the specifications, architecture, and various features of Netlab.

## Table of Contents

### CLI (`cli/`)

Headless command-line workflows for regression checks and grading.

- [netlab-run CLI](cli/netlab-run.md) - Node runner for scenario plus sandbox session assertions with TAP/JSON output

### 🧰 Developer Tooling (`dev/`)

Developer-facing tooling that does not ship in the published library bundle.

- [Storybook](dev/storybook.md) - Component story harness with sandbox fixtures and axe-core a11y gate
- [i18n](dev/i18n.md) - Translator hook, catalog conventions, locale switching, and the ESLint regression gate

### 🧠 Core Architecture & APIs (`core/`)

Core specifications for the overall design of Netlab and for creating extensions.

- [Overview](core/overview.md) - General concepts and basic structure of Netlab
- [Architecture](core/architecture.md) - Overall system structure and design of key components
- [API](core/api.md) - API specifications for external and internal use
- [API Deprecation Lifecycle](core/deprecation-lifecycle.md) - Required runway, removal tags, and migration guidance for public API deprecations
- [Scenarios](core/scenarios.md) - Pure-data scenario primitive, built-in registry, and registration contract
- [Controlled Topology API](api/controlled-topology.md) - Prop-based controlled/uncontrolled topology state with mutation callbacks
- [Controlled Topology + Sandbox](api/controlled-topology-sandbox.md) - Explicit coexistence modes for parent-owned topology and sandbox-owned edits
- [Mismatch Report](api/mismatch-report.md) - Results of the API documentation audit
- [Hooks](core/hooks.md) - Mechanism of the React-independent event hook engine
- [Plugins](core/plugins.md) - Plugin mechanism for feature extensions
- [Sandbox Edit Plugins](core/sandbox-plugin.md) - Public API for registering custom sandbox edit variants
- [Errors](core/errors.md) - NetlabError taxonomy and recovery guidance

### 💻 UI & Interaction (`ui/`)

Specifications regarding user interface implementation and canvas operations.

- [UI Interaction](ui/ui-interaction.md) - Canvas operations, node/link selection, and context menu specifications
- [Topology Editor](ui/topology-editor.md) - Design of node and link addition/editing features
- [Packet Visualization](ui/packet-visualization.md) - Animation features and timeline display for packet communication
- [Step-by-Step Simulation](ui/step-simulation.md) - Routing decision data model, StepSimulationController, and StepControls component
- [Trace Inspector](ui/trace-inspector.md) - PacketTimeline, HopInspector, and TraceSummary for end-to-end packet trace inspection
- [Trace Display Filter](ui/trace-filter.md) - PacketTimeline display-filter grammar, URL persistence, and accessibility behavior
- [PCAP Export](ui/pcap-export.md) - libpcap export format, trace export API, and PacketTimeline download action
- [Sandbox Trace Annotations](ui/sandbox-annotations.md) - Trace-event notes, author model, markdown subset, and persistence behavior
- [Failure Simulation](ui/failure-simulation.md) - Node/link failure injection, FailureTogglePanel, and visual styling
- [Resizable Sidebar](ui/resizable-sidebar.md) - Drag-to-resize sidebar component used across demo layouts
- [Theming](ui/theming.md) - CSS variable-based color theming for embedding in host pages
- [Node Theming](ui/node-theming.md) - Per-node-type color tokens and CSS variable wiring for theme-aware node rendering
- [Packet Structure Viewer](ui/packet-structure-viewer.md) - Byte-level hex dump and field table showing per-layer color-coded packet structure
- [Accessibility](ui/accessibility.md) - WCAG 2.1 AA compliance: color contrast tokens, keyboard model, ARIA roles, and axe-core verification
- [Interactive Sandbox](ui/sandbox.md) - Sandbox surface, edit tabs, URL persistence, supported demos, and provider mutex
- [Sandbox Introduction](ui/sandbox-intro.md) - Built-in onboarding flows for MTU, TCP, OSPF, and NAT sandbox demos
- [Sandbox Undo And History](ui/sandbox-undo.md) - Undo/redo cursor semantics, edit history UI, reset-all, shortcuts, and hook events
- [Sandbox Session Import / Export](ui/sandbox-session-io.md) - Local JSON session files with schema versioning, import preview, and redo-tail preservation
- [Sandbox Session Recording & Replay](ui/sandbox-recording.md) - Chronological event recording, scrubber-driven replay, fork-from-here, and desync detection
- [Sandbox Named Snapshots](ui/sandbox-snapshots.md) - Named history bookmarks, arbitrary snapshot comparison, revert, and edit-chain inspection
- [Assessment Sandbox](ui/assessments.md) - Goal-based free-form sandbox exercises, rubrics, constraints, hints, and submission files
- [Learner Progress](ui/learner-progress.md) - Opt-in cross-session completion persistence, progress panel, and Gallery badges
- [日本語 i18n ガイド](ui/i18n-ja.md) - Japanese locale contribution flow, parity check, and translation guardrails
- [Sandbox Keyboard Shortcuts & Narration](ui/sandbox-shortcuts.md) - Built-in shortcut registry, dispatcher, help modal, and `aria-live` screen-reader narration
- [Sandbox Scenario Authoring](ui/sandbox-authoring.md) - Browser export flow for turning sandbox states into commit-ready Scenario source
- [Tutorials](ui/tutorials.md) - Scenario-backed guided tutorial mode, tutorial registry, predicate contract, and authoring rules

### 🔄 Simulation (`simulation/`)

Specifications focused on simulation-time packet traversal and trace annotation.

- [ForwardingPipeline](core/architecture.md) - Forwarding loop, route lookup, ARP/ICMP generation, and packet materialization behind the `SimulationEngine` facade
- [TraceRecorder](core/architecture.md) - Trace snapshot ownership, merged trace assembly, and PCAP export support for simulation playback
- [ServiceOrchestrator](core/architecture.md) - DHCP/DNS orchestration plus NAT/ACL runtime processor ownership behind the simulation facade
- [Simulation Engine Coverage Improvements](simulation/simulation-engine-coverage.md) - Shared fixture extraction and deterministic coverage scenarios for routing, TTL, ARP, no-route, and failures
- [Protocol-Driven Forwarding](simulation/interface-aware-forwarding.md) - Forwarder-owned next-hop decisions, engine execution rules, and interface hop annotation
- [RFC Packet Realism](simulation/rfc-packet-realism.md) - Packet materialization, router MAC rewrite, checksum/FCS recomputation, and hop mutation tracking
- [Simulation Worker](simulation/worker.md) - Worker-capable SimulationEngine facade, protocol, fallback, respawn, and determinism contract
- [Sandbox Performance](simulation/performance.md) - Checkpointed sandbox re-runs, fast trace mode, large-topology guardrails, and benchmark procedure
- [Data Transfer Simulation](simulation/data-transfer.md) - Application-level data transfer model with chunking, reassembly, checksum verification, and per-hop forwarding visualization
- [Session Correlation](simulation/session-correlation.md) - Session-aware request/response lifecycle grouping, correlation logic, and SessionList/SessionDetail UI

### ✅ Testing (`testing/`)

Specifications for regression harnesses and shared test infrastructure.

- [Property-Based Testing](testing/property-based.md) - fast-check arbitraries, oracle helpers, seed policy, and failure workflow

### 🌐 Networking Models & Features (`networking/`)

Specifications for protocol implementations based on the OSI model and network device behaviors.

#### Devices & Layers

- [Devices](networking/devices/) - Detailed design for specific devices such as routers (`router.md`) and switches (`switch.md`)
- [Layers](networking/layers/) - Protocol processing and communication flow from L1 to L7 (`l1-physical.md` to `l7-application.md`)

#### Specific Features

- [Routing](networking/routing/) - Operational specifications for OSPF (`ospf.md`), BGP (`bgp.md`), RIP (`rip.md`), and static routing (`static.md`)
- [ARP](networking/arp.md) - Address Resolution Protocol simulation: cache seeding, request/reply hop injection, and node ARP table visualization
- [VLAN (802.1Q)](networking/vlan.md) - 802.1Q tagging, access/trunk ports, router-on-a-stick inter-VLAN routing
- [Spanning Tree (802.1D)](networking/stp.md) - Root election, port roles, and blocked-port enforcement in switch forwarding
- [MTU & IPv4 Fragmentation](networking/mtu-fragmentation.md) - Per-link/per-interface MTU, DF-bit handling, ICMP Fragmentation Needed, and destination reassembly
- [Path MTU Discovery](networking/pmtud.md) - TCP `DF=1` defaults, per-host PMTU cache, and adaptive chunk sizing from ICMP Fragmentation Needed
- [TCP Congestion Control](networking/tcp-congestion.md) - Educational slow start, congestion avoidance, fast retransmit/recovery, RTO, and deterministic loss hooks
- [Per-Link QoS](networking/link-qos.md) - Deterministic bandwidth, propagation delay, loss, and drop-tail queue annotations on topology links
- [DSCP Marking And Shaping](networking/dscp.md) - DSCP code points, DRR class queues, sandbox validation, and shaper trace annotations
- [ECMP Multipath](networking/ecmp.md) - Equal-cost next-hop installation, deterministic flow hashing, and trace bucket annotations
- [IPv6 Dual-Stack](networking/ipv6.md) - RFC 5952 address canonicalization, static v6 routing, ICMPv6 echo, and dual-stack trace display
- [IPv6 Routing Ecosystem](networking/ipv6-routing.md) - OSPFv3, MP-BGP IPv6 unicast, and family-aware route selection
- [DHCPv6 And Stateful SLAAC](networking/dhcpv6.md) - DHCPv6 4-message exchange, DUID-LL, and RA M/O flag semantics
- [High Availability](networking/ha.md) - VRRP/HSRP gateway election, virtual MACs, LACP, and port-channel hashing
- [Wireless 802.11](networking/wireless.md) - RSSI/loss modeling, association state, WPA2 four-way handshake, and hidden-node detection
- [Tunneling](networking/tunneling.md) - GRE encapsulation, MPLS label/VRF helpers, VXLAN EVPN learning, and ARP suppression
- [Flow Observability](networking/observability.md) - NetFlow v9 records, deterministic sFlow samples, and the in-process collector model
- [NAT / PAT](networking/nat.md) - Stateful SNAT, DNAT, port forwarding, and per-router NAT table behavior
- [Firewalls & ACLs](networking/acl.md) - Interface ACL rules, default deny, and optional stateful conn-track behavior
- [UDP](networking/udp.md) - Stateless L4 datagram; real packet plumbing shared by DHCP/DNS and future UDP apps
- [HTTP/1.1](networking/http.md) - Educational subset: request/response builder, line-based parser, TCP-backed client and server
- [TLS 1.3](networking/tls.md) - Deterministic HTTPS handshake subset with placeholder crypto and ALPN trace annotations
- [Crypto Providers](networking/crypto-providers.md) - Deterministic and WebCrypto-backed provider selection for TLS and WPA teaching protocols
- [HTTP/2](networking/http2.md) - Binary framing, HPACK static/literal headers, multiplexed streams, and TCP HOL teaching state
- [QUIC](networking/quic.md) - Varints, frame helpers, CryptoProvider packet protection, stream reassembly, and path validation
- [HTTP/3](networking/http3.md) - HTTP frames over QUIC streams with static-only QPACK and per-stream HOL contrast
- [Services Overview](networking/services/index.md) - DHCP/DNS service sessions, runtime state, and UDP service architecture
- [DHCP](networking/services/dhcp.md) - DORA address assignment simulation for runtime host IPs
- [DNS](networking/services/dns.md) - Static A-record resolution and automatic pre-HTTP lookup
- [Network Areas](networking/network-areas.md) - Mechanisms for managing and rendering OSPF areas and BGP AS
- [Connection Validation](networking/connection-validation.md) - Validation logic for port compatibility and link limits
- [Multicast (IGMPv2)](networking/multicast.md) - Class D forwarding, IGMP Query/Report/Leave, switch snooping with VLAN scope

### �️ Roadmap

- [Protocol Coverage Roadmap](../plan/35.md) - Meta-plan sequencing UDP/HTTP/IGMP/IPv6 work
- [Complete Backlog Execution Plan](../plan/81.md) - Master ledger that ships every Planning-state plan and 15 newly-commissioned sub-plans (81a–81o)

### �🚀 Deployment & Integration (`deployment/`)

Specifications related to demo environment setup, integration using query parameters, and continuous integration.

- [Demo Structure](deployment/demo-structure.md) - Demo screen configurations for tutorials and gallery items, including shared GitHub source links and the All-in-One comprehensive demo
- [Query Params](deployment/query-params.md) - Topology sharing plus sandbox and tutorial restoration via URL parameters
- [CI/CD](deployment/ci-cd.md) - Automated testing and deployment environments setup using GitHub Actions
- [Embed](deployment/embed.md) - Embedding NetlabApp in external web pages with configurable width/height
- [Sandbox Embed Integration](deployment/embed-sandbox.md) - Interactive sandbox iframe integration, parent messages, compact chrome, and URL builder
