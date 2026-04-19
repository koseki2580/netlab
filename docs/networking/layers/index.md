# OSI Layers

> **Status**: ✅ Implemented

netlab supports all relevant OSI layers. Each layer has its own plugin with React Flow node types
and optional packet forwarding logic.

## Layer Overview

| Layer | ID   | Name        | Status      | Key Devices        |
| ----- | ---- | ----------- | ----------- | ------------------ |
| 1     | `l1` | Physical    | Stub        | Hub, Cable         |
| 2     | `l2` | Data Link   | Implemented | Switch, Host (NIC) |
| 3     | `l3` | Network     | Implemented | Router, Host (IP)  |
| 4     | `l4` | Transport   | Stub        | Host (Port)        |
| 7     | `l7` | Application | Visual only | Client, Server     |

## Layer Visibility Rules

Which devices appear at each layer:

| Device | L1  | L2  | L3  | L4  | L7  |
| ------ | --- | --- | --- | --- | --- |
| Hub    | ✓   |     |     |     |     |
| Switch | ✓   | ✓   |     |     |     |
| Router | ✓   | ✓   | ✓   |     |     |
| Host   | ✓   | ✓   | ✓   | ✓   | ✓   |
| Server | ✓   | ✓   | ✓   | ✓   | ✓   |

## Layer Details

- [L1 Physical](./l1-physical.md)
- [L2 Data Link](./l2-datalink.md)
- [L3 Network](./l3-network.md)
- [L4 Transport](./l4-transport.md)
- [L7 Application](./l7-application.md)
