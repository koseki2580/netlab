# Netlab Documentation

This directory contains organized documentation regarding the specifications, architecture, and various features of Netlab.

## Table of Contents

### 🧠 Core Architecture & APIs (`core/`)

Core specifications for the overall design of Netlab and for creating extensions.

- [Overview](core/overview.md) - General concepts and basic structure of Netlab
- [Architecture](core/architecture.md) - Overall system structure and design of key components
- [API](core/api.md) - API specifications for external and internal use
- [Controlled Topology API](api/controlled-topology.md) - Prop-based controlled/uncontrolled topology state with mutation callbacks
- [Mismatch Report](api/mismatch-report.md) - Results of the API documentation audit
- [Hooks](core/hooks.md) - Mechanism of the React-independent event hook engine
- [Plugins](core/plugins.md) - Plugin mechanism for feature extensions

### 💻 UI & Interaction (`ui/`)

Specifications regarding user interface implementation and canvas operations.

- [UI Interaction](ui/ui-interaction.md) - Canvas operations, node/link selection, and context menu specifications
- [Topology Editor](ui/topology-editor.md) - Design of node and link addition/editing features
- [Packet Visualization](ui/packet-visualization.md) - Animation features and timeline display for packet communication
- [Step-by-Step Simulation](ui/step-simulation.md) - Routing decision data model, StepSimulationController, and StepControls component
- [Trace Inspector](ui/trace-inspector.md) - PacketTimeline, HopInspector, and TraceSummary for end-to-end packet trace inspection
- [PCAP Export](ui/pcap-export.md) - libpcap export format, trace export API, and PacketTimeline download action
- [Failure Simulation](ui/failure-simulation.md) - Node/link failure injection, FailureTogglePanel, and visual styling
- [Resizable Sidebar](ui/resizable-sidebar.md) - Drag-to-resize sidebar component used across demo layouts
- [Theming](ui/theming.md) - CSS variable-based color theming for embedding in host pages
- [Node Theming](ui/node-theming.md) - Per-node-type color tokens and CSS variable wiring for theme-aware node rendering
- [Packet Structure Viewer](ui/packet-structure-viewer.md) - Byte-level hex dump and field table showing per-layer color-coded packet structure

### 🔄 Simulation (`simulation/`)

Specifications focused on simulation-time packet traversal and trace annotation.

- [ForwardingPipeline](core/architecture.md) - Forwarding loop, route lookup, ARP/ICMP generation, and packet materialization behind the `SimulationEngine` facade
- [TraceRecorder](core/architecture.md) - Trace snapshot ownership, merged trace assembly, and PCAP export support for simulation playback
- [ServiceOrchestrator](core/architecture.md) - DHCP/DNS orchestration plus NAT/ACL runtime processor ownership behind the simulation facade
- [Simulation Engine Coverage Improvements](simulation/simulation-engine-coverage.md) - Shared fixture extraction and deterministic coverage scenarios for routing, TTL, ARP, no-route, and failures
- [Protocol-Driven Forwarding](simulation/interface-aware-forwarding.md) - Forwarder-owned next-hop decisions, engine execution rules, and interface hop annotation
- [RFC Packet Realism](simulation/rfc-packet-realism.md) - Packet materialization, router MAC rewrite, checksum/FCS recomputation, and hop mutation tracking
- [Session Correlation](simulation/session-correlation.md) - Session-aware request/response lifecycle grouping, correlation logic, and SessionList/SessionDetail UI

### 🌐 Networking Models & Features (`networking/`)

Specifications for protocol implementations based on the OSI model and network device behaviors.

#### Devices & Layers

- [Devices](networking/devices/) - Detailed design for specific devices such as routers (`router.md`) and switches (`switch.md`)
- [Layers](networking/layers/) - Protocol processing and communication flow from L1 to L7 (`l1-physical.md` to `l7-application.md`)

#### Specific Features

- [Routing](networking/routing/) - Operational specifications for OSPF (`ospf.md`), BGP (`bgp.md`), RIP (`rip.md`), and static routing (`static.md`)
- [ARP](networking/arp.md) - Address Resolution Protocol simulation: cache seeding, request/reply hop injection, and node ARP table visualization
- [NAT / PAT](networking/nat.md) - Stateful SNAT, DNAT, port forwarding, and per-router NAT table behavior
- [Firewalls & ACLs](networking/acl.md) - Interface ACL rules, default deny, and optional stateful conn-track behavior
- [Services Overview](networking/services/index.md) - DHCP/DNS service sessions, runtime state, and UDP service architecture
- [DHCP](networking/services/dhcp.md) - DORA address assignment simulation for runtime host IPs
- [DNS](networking/services/dns.md) - Static A-record resolution and automatic pre-HTTP lookup
- [Network Areas](networking/network-areas.md) - Mechanisms for managing and rendering OSPF areas and BGP AS
- [Connection Validation](networking/connection-validation.md) - Validation logic for port compatibility and link limits

### 🚀 Deployment & Integration (`deployment/`)

Specifications related to demo environment setup, integration using query parameters, and continuous integration.

- [Demo Structure](deployment/demo-structure.md) - Demo screen configurations for tutorials and gallery items, including shared GitHub source links and the All-in-One comprehensive demo
- [Query Params](deployment/query-params.md) - Topology data sharing and restoration methods via URL parameters
- [CI/CD](deployment/ci-cd.md) - Automated testing and deployment environments setup using GitHub Actions
- [Embed](deployment/embed.md) - Embedding NetlabApp in external web pages with configurable width/height
