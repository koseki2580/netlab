# Switch Device

> **Status**: ✅ Implemented

An L2 switch forwards Ethernet frames based on MAC address learning.

## Properties

```typescript
// In NetlabNodeData
{
  role: 'switch',
  label: 'SW-1',
  layerId: 'l2',
  // Switch-specific:
  ports: DevicePort[];   // e.g. [{ id: 'p1', name: 'fa0/1', macAddress: 'aa:bb:cc:dd:ee:01' }]
}
```

## Forwarding Behavior

See [l2-datalink.md](../layers/l2-datalink.md) for the full forwarding specification.

1. **Learn**: Record `srcMac → ingressPort` on every received frame
2. **Forward**:
   - Broadcast (`ff:ff:ff:ff:ff:ff`): choose the simulated path toward the intended destination node
   - Known unicast: send to the matching path
   - Unknown unicast: choose the path that leads toward the destination node

In the current engine, switch traversal is modeled as a single destination-aware path through the
topology graph. The engine does not duplicate one frame into multiple concurrent branch traces for
every flooded port.

## Demo Configuration

```typescript
{
  id: 'switch-1',
  type: 'switch',
  position: { x: 200, y: 200 },
  data: {
    label: 'SW-1',
    role: 'switch',
    layerId: 'l2',
    ports: [
      { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:00:01:00' },
      { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:00:01:01' },
    ],
  },
}
```
