# Static Routing

**Status: Implemented** | Admin Distance: 1

Static routes are manually configured on router nodes via the `staticRoutes` field in node data.

## Configuration

```typescript
// In router node data:
staticRoutes: [
  { destination: '10.0.0.0/24',  nextHop: 'direct' },
  { destination: '0.0.0.0/0',    nextHop: '203.0.113.254' },
]
```

## How It Works

`StaticProtocol.computeRoutes(topology)`:

1. Iterates over all nodes where `role === 'router'`
2. Reads `node.data.staticRoutes` (array of `StaticRouteConfig`)
3. Produces a `RouteEntry` for each static route with `adminDistance: 1`

## `StaticRouteConfig`

```typescript
interface StaticRouteConfig {
  destination: string;   // CIDR notation
  nextHop: string;       // IP address or 'direct' (connected network)
  metric?: number;       // defaults to 0
}
```

## Default Route

Use `destination: '0.0.0.0/0'` for a default route (gateway of last resort):

```typescript
{ destination: '0.0.0.0/0', nextHop: '203.0.113.254' }
```
