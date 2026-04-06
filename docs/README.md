# Netlab Documentation

This directory contains organized documentation regarding the specifications, architecture, and various features of Netlab.

## Table of Contents

### 🧠 Core Architecture & APIs (`core/`)

Core specifications for the overall design of Netlab and for creating extensions.

- [Overview](core/overview.md) - General concepts and basic structure of Netlab
- [Architecture](core/architecture.md) - Overall system structure and design of key components
- [API](core/api.md) - API specifications for external and internal use
- [Hooks](core/hooks.md) - Mechanism of the React-independent event hook engine
- [Plugins](core/plugins.md) - Plugin mechanism for feature extensions

### 💻 UI & Interaction (`ui/`)

Specifications regarding user interface implementation and canvas operations.

- [UI Interaction](ui/ui-interaction.md) - Canvas operations, node/link selection, and context menu specifications
- [Topology Editor](ui/topology-editor.md) - Design of node and link addition/editing features
- [Packet Visualization](ui/packet-visualization.md) - Animation features and timeline display for packet communication
- [Step-by-Step Simulation](ui/step-simulation.md) - Routing decision data model, StepSimulationController, and StepControls component
- [Failure Simulation](ui/failure-simulation.md) - Node/link failure injection, FailureTogglePanel, and visual styling

### 🌐 Networking Models & Features (`networking/`)

Specifications for protocol implementations based on the OSI model and network device behaviors.

#### Devices & Layers

- [Devices](networking/devices/) - Detailed design for specific devices such as routers (`router.md`) and switches (`switch.md`)
- [Layers](networking/layers/) - Protocol processing and communication flow from L1 to L7 (`l1-physical.md` to `l7-application.md`)

#### Specific Features

- [Routing](networking/routing/) - Operational specifications for OSPF (`ospf.md`), BGP (`bgp.md`), RIP (`rip.md`), and static routing (`static.md`)
- [Network Areas](networking/network-areas.md) - Mechanisms for managing and rendering OSPF areas and BGP AS
- [Connection Validation](networking/connection-validation.md) - Validation logic for port compatibility and link limits

### 🚀 Deployment & Integration (`deployment/`)

Specifications related to demo environment setup, integration using query parameters, and continuous integration.

- [Demo Structure](deployment/demo-structure.md) - Demo screen configurations for tutorials and gallery items
- [Query Params](deployment/query-params.md) - Topology data sharing and restoration methods via URL parameters
- [CI/CD](deployment/ci-cd.md) - Automated testing and deployment environments setup using GitHub Actions
