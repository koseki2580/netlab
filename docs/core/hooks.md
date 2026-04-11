# Hook System

> **Status**: ✅ Implemented

netlab provides a Koa-style middleware hook system that lets you observe and modify the simulation pipeline.

## Hook Points

| Hook Point        | Trigger                                          |
| ----------------- | ------------------------------------------------ |
| `packet:create`   | A new packet is created (e.g., from fetch())     |
| `packet:forward`  | A packet moves from one device to another        |
| `packet:deliver`  | A packet reaches its destination device          |
| `packet:drop`     | A packet is dropped (TTL=0, no route, etc.)      |
| `switch:learn`    | A switch learns a new MAC→port mapping           |
| `router:lookup`   | A router performs a route table lookup           |
| `fetch:intercept` | `window.fetch` is called and intercepted         |
| `fetch:respond`   | A mock response is about to be returned          |

## Usage

```typescript
import { useNetlabHooks } from 'netlab';

function MyComponent() {
  const { on } = useNetlabHooks();

  useEffect(() => {
    const unsubscribe = on('packet:forward', async (ctx, next) => {
      console.log(`Packet ${ctx.packet.id}: ${ctx.fromNodeId} → ${ctx.toNodeId}`);
      await next(); // must call next() to continue the chain
    });
    return unsubscribe; // cleanup on unmount
  }, [on]);
}
```

## Direct Registration (outside React)

```typescript
import { hookEngine } from 'netlab';

hookEngine.on('router:lookup', async (ctx, next) => {
  if (ctx.resolvedRoute === null) {
    console.warn(`[netlab] No route to ${ctx.destination} on router ${ctx.nodeId}`);
  }
  await next();
});
```

## Hook Context Types

### `packet:create`

```typescript
{ packet: InFlightPacket; sourceNodeId: string }
```

### `packet:forward`

```typescript
{
  packet: InFlightPacket;
  fromNodeId: string;
  toNodeId: string;
  decision: ForwardDecision;
}
```

### `packet:deliver`

```typescript
{ packet: InFlightPacket; destinationNodeId: string }
```

### `packet:drop`

```typescript
{ packet: InFlightPacket; nodeId: string; reason: string }
```

### `switch:learn`

```typescript
{ nodeId: string; mac: string; port: string }
```

### `router:lookup`

```typescript
{ nodeId: string; destination: string; resolvedRoute: RouteEntry | null }
```

### `fetch:intercept`

```typescript
{ request: Request; nodeId: string }
```

### `fetch:respond`

```typescript
{ request: Request; response: Response; nodeId: string }
```

## Middleware Chain Behavior

- Handlers are called in registration order.
- Each handler **must** call `next()` to continue to the next handler.
- Omitting `next()` short-circuits: later handlers and the default behavior are skipped.
- Hooks are `async`; you can `await` inside them.

```typescript
// Short-circuit example: block all packets to a specific IP
on('packet:forward', async (ctx, next) => {
  const dstIp = ctx.packet.frame.payload.dstIp;
  if (dstIp === '10.0.0.99') {
    // do NOT call next() — packet is blocked
    return;
  }
  await next();
});
```
