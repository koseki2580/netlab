# L1 – Physical Layer

> **Status**: 🧪 Spec only — not yet implemented

The physical layer represents the raw transmission medium: cables, electrical signals, and hubs.

## Devices

- **Hub**: Broadcasts all incoming signals to every port (no intelligence)
- **Cable**: Represents a physical link between two devices

## Node Types (Stub)

- `hub` — Hub device node

## Forwarding Logic

Hubs broadcast everything: all frames received on one port are retransmitted on all other ports.
This is identical to a switch with no MAC table (always floods).

## Plugin Import

```typescript
import 'netlab/layers/l1-physical'; // stub – registers empty nodeTypes
```

## Future Implementation

- Signal propagation delay based on cable length
- Collision domain simulation
- Half-duplex vs full-duplex link modes
