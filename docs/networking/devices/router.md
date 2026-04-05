# Router Device

An L3 router forwards IP packets using a routing table with Longest Prefix Match.

## Properties

```typescript
// In NetlabNodeData
{
  role: 'router',
  label: 'R-1',
  layerId: 'l3',
  // Router-specific:
  interfaces: RouterInterface[];
  staticRoutes?: StaticRouteConfig[];
}

interface RouterInterface {
  id: string;
  name: string;            // e.g. 'eth0', 'ge0/0'
  ipAddress: string;       // e.g. '10.0.0.1'
  prefixLength: number;    // e.g. 24
  macAddress: string;
}

interface StaticRouteConfig {
  destination: string;     // CIDR, e.g. '203.0.113.0/24'
  nextHop: string;         // IP or 'direct'
  metric?: number;         // defaults to 0
}
```

## Routing Protocols

Routing protocols are configured via `ProtocolRegistry`. The router's `staticRoutes` field
feeds into `StaticProtocol.computeRoutes()`.

For OSPF/BGP/RIP (future), the router will need additional config fields (area ID, AS number, etc.).

## Demo Configuration

```typescript
{
  id: 'router-1',
  type: 'router',
  position: { x: 450, y: 200 },
  data: {
    label: 'R-1',
    role: 'router',
    layerId: 'l3',
    interfaces: [
      { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:00:02:00' },
      { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:00:02:01' },
    ],
    staticRoutes: [
      { destination: '10.0.0.0/24', nextHop: 'direct' },
      { destination: '203.0.113.0/24', nextHop: 'direct' },
      { destination: '0.0.0.0/0', nextHop: '203.0.113.254' },
    ],
  },
}
```

## Admin Distance Reference

| Protocol | Admin Distance |
| -------- | -------------- |
| Static | 1 |
| eBGP | 20 |
| OSPF | 110 |
| RIP | 120 |
| iBGP | 200 |

Lower admin distance wins when multiple protocols have a route to the same destination.
