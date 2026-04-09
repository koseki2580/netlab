# DHCP Service

**Status: Implemented**

Netlab simulates DHCP as a four-message DORA exchange carried over UDP.

## Node Configuration

### DHCP Server

```typescript
interface DhcpServerConfig {
  leasePool: string;       // e.g. '192.168.1.100/28'
  subnetMask: string;      // e.g. '255.255.255.0'
  defaultGateway: string;  // e.g. '192.168.1.1'
  dnsServer?: string;      // optional DNS server IP to hand out
  leaseTime: number;       // seconds
}
```

### DHCP Client

```typescript
interface DhcpClientConfig {
  enabled: boolean;
}
```

## Packet Model

```typescript
interface DhcpMessage {
  layer: 'L7';
  messageType: 'DISCOVER' | 'OFFER' | 'REQUEST' | 'ACK' | 'NAK';
  transactionId: number;
  clientMac: string;
  offeredIp?: string;
  serverIp?: string;
  options: {
    subnetMask?: string;
    router?: string;
    dnsServer?: string;
    leaseTime?: number;
  };
}
```

DHCP messages are carried inside:

```typescript
interface UdpDatagram {
  layer: 'L4';
  srcPort: number; // 68 client, 67 server
  dstPort: number;
  payload: RawPayload | DhcpMessage | DnsMessage;
}
```

## Flow

The engine performs the following exchange for `simulateDhcp(clientNodeId)`:

1. Client sends `DISCOVER` from `0.0.0.0:68` to `255.255.255.255:67`
2. Server sends `OFFER` from `serverIp:67` to `255.255.255.255:68`
3. Client sends `REQUEST` from `0.0.0.0:68` to `255.255.255.255:67`
4. Server sends `ACK` or `NAK` from `serverIp:67` to `255.255.255.255:68`

All four messages are simulated as distinct traces that share one `sessionId`.

## Runtime State

The engine stores per-client lease state:

```typescript
interface DhcpLeaseState {
  status: 'init' | 'selecting' | 'requesting' | 'bound';
  transactionId: number;
  offeredIp?: string;
  serverIp?: string;
  assignedIp?: string;
  subnetMask?: string;
  defaultGateway?: string;
  dnsServerIp?: string;
}
```

When the final message is `ACK`, the engine writes the assigned IP into its runtime IP map. The
immutable topology is not mutated.

## Broadcast Delivery Rules

`SimulationEngine` treats DHCP broadcast traffic as a targeted educational shortcut:

- `DISCOVER` and `REQUEST` are routed toward the configured DHCP server node
- `OFFER`, `ACK`, and `NAK` are routed back toward the requesting DHCP client node
- The IP header still uses `255.255.255.255`, but delivery is constrained by `dstNodeId`

This produces a clean trace without simulating a true packet fan-out to every endpoint in the LAN.

## Allocation Rules

- The first DHCP server in `topology.nodes` wins when multiple servers exist
- The lease pool is expanded from the configured CIDR and allocated sequentially
- Pool exhaustion returns a simulated `NAK`
- No renewal timers are modeled

## Limitations

- Single authoritative server per topology walk
- No relay agent across routed subnets
- No renewal or expiration during the current simulation run
- No retry loop after `NAK`
