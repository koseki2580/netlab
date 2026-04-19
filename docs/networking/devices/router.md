# Router Device

> **Status**: ✅ Implemented

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
  ospfConfig?: OspfConfig;
  ripConfig?: RipConfig;
  bgpConfig?: BgpConfig;
  portForwardingRules?: PortForwardingRule[];
  statefulFirewall?: boolean;
}

interface RouterInterface {
  id: string;
  name: string;            // e.g. 'eth0', 'ge0/0'
  ipAddress: string;       // e.g. '10.0.0.1'
  prefixLength: number;    // e.g. 24
  macAddress: string;
  nat?: 'inside' | 'outside';
  inboundAcl?: AclRule[];
  outboundAcl?: AclRule[];
  subInterfaces?: SubInterface[];
}

interface SubInterface {
  id: string;              // e.g. 'eth0.10'
  parentInterfaceId: string;
  vlanId: number;
  ipAddress: string;
  prefixLength: number;
}

interface PortForwardingRule {
  proto: 'tcp' | 'udp';
  externalPort: number;
  internalIp: string;
  internalPort: number;
}

interface StaticRouteConfig {
  destination: string;     // CIDR, e.g. '203.0.113.0/24'
  nextHop: string;         // IP or 'direct'
  metric?: number;         // defaults to 0
}
```

## Routing Protocols

Routing protocols are configured via `ProtocolRegistry`. The router's `staticRoutes` field
feeds into `StaticProtocol.computeRoutes()`. Dynamic routing uses router-local config fields on
`NetlabNodeData`:

- `ospfConfig` for SPF routing over router adjacency
- `ripConfig` for hop-count distance-vector routing
- `bgpConfig` for explicit-neighbor path-vector routing

## NAT / PAT

Routers may optionally participate in NAT by tagging interfaces with `nat: 'inside'` and
`nat: 'outside'`. Port-forwarding rules are configured with `portForwardingRules`.

Detailed NAT semantics, runtime table behavior, and trace annotation live in
[`docs/networking/nat.md`](../nat.md).

## Firewalls & ACLs

Routers may attach ordered ACL rule lists directly to interfaces and may optionally enable
stateful return-traffic handling with `statefulFirewall: true`.

```typescript
{
  role: 'router',
  layerId: 'l3',
  statefulFirewall: true,
  interfaces: [
    {
      id: 'eth0',
      name: 'eth0',
      ipAddress: '10.0.0.1',
      prefixLength: 24,
      macAddress: '00:00:00:00:02:00',
      inboundAcl: [
        {
          id: 'allow-http',
          priority: 10,
          action: 'permit',
          protocol: 'tcp',
          srcIp: '10.0.0.0/24',
          dstPort: 80,
        },
      ],
    },
  ],
}
```

Detailed ACL semantics, evaluation order, conn-track behavior, and trace annotation live in
[`docs/networking/acl.md`](../acl.md).

## Router-on-a-Stick

Routers may terminate multiple VLANs on one parent interface by defining `subInterfaces`.

- Tagged ingress frames resolve to the sub-interface whose `vlanId` matches the 802.1Q tag.
- Untagged ingress may still use the parent interface IP if the parent interface is configured.
- Each sub-interface contributes its own connected network to route-table derivation.
- ARP resolution is scoped per VLAN so overlapping downstream addressing remains isolated.
- Trace annotation surfaces the logical interface name, such as `eth0.10` or `eth0.20`.

See [vlan.md](../vlan.md) for the full VLAN forwarding and per-VLAN ARP model.

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
      {
        id: 'eth0',
        name: 'eth0',
        ipAddress: '10.0.0.1',
        prefixLength: 24,
        macAddress: '00:00:00:00:02:00',
        nat: 'inside',
        subInterfaces: [
          {
            id: 'eth0.10',
            parentInterfaceId: 'eth0',
            vlanId: 10,
            ipAddress: '10.0.10.1',
            prefixLength: 24,
          },
        ],
      },
      { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:00:02:01', nat: 'outside' },
    ],
    staticRoutes: [
      { destination: '10.0.0.0/24', nextHop: 'direct' },
      { destination: '203.0.113.0/24', nextHop: 'direct' },
      { destination: '0.0.0.0/0', nextHop: '203.0.113.254' },
    ],
    portForwardingRules: [
      { proto: 'tcp', externalPort: 8080, internalIp: '10.0.0.10', internalPort: 80 },
    ],
  },
}
```

## Admin Distance Reference

| Protocol | Admin Distance |
| -------- | -------------- |
| Static   | 1              |
| eBGP     | 20             |
| OSPF     | 110            |
| RIP      | 120            |
| iBGP     | 200            |

Lower admin distance wins when multiple protocols have a route to the same destination.
