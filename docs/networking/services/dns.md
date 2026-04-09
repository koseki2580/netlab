# DNS Service

**Status: Implemented**

Netlab simulates DNS as a direct UDP query/response exchange backed by static A records.

## Node Configuration

```typescript
interface DnsZoneEntry {
  name: string;    // FQDN
  address: string; // IPv4
}

interface DnsServerConfig {
  zones: DnsZoneEntry[];
}
```

## Packet Model

```typescript
interface DnsMessage {
  layer: 'L7';
  transactionId: number;
  isResponse: boolean;
  questions: Array<{ name: string; type: 'A' }>;
  answers: Array<{ name: string; type: 'A'; ttl: number; address: string }>;
}
```

DNS messages are carried in UDP datagrams on port `53`.

## Flow

The engine performs the following exchange for `simulateDns(clientNodeId, hostname)`:

1. Build a UDP query from the client runtime IP to the resolved DNS server IP
2. Precompute the query trace
3. Build a response from the DNS server zone table
4. Precompute the response trace
5. Cache the returned A record on the client

Both traces share one `sessionId`.

## Cache Model

```typescript
interface DnsCacheEntry {
  address: string;
  ttl: number;
  resolvedAt: number;
}

type DnsCache = Record<string, DnsCacheEntry>;
```

- Cache lookups are keyed by hostname
- TTL is stored for inspection
- TTL expiry is not enforced during the current simulation run

## Automatic HTTP Integration

If an outgoing HTTP request contains a hostname:

```typescript
http://web.example.com/api
```

the engine:

1. extracts `web.example.com`
2. skips DNS when the host is already an IPv4 literal
3. performs DNS resolution when needed
4. rewrites the destination IP on the outgoing packet before precomputing the HTTP trace

If resolution fails, the packet is dropped before application delivery with
`reason = 'dns-resolution-failed'`.

## DNS Server Selection

The engine resolves the DNS server IP in this order:

1. `dhcpLeaseState.dnsServerIp`
2. the first topology node configured with `dnsServer`

## Limitations

- A records only
- No recursive resolution
- No CNAME, MX, TXT, AAAA, or DNSSEC
- NXDOMAIN is represented as a failed resolution rather than a richer response code model
