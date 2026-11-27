/** REQ-447 — Kubernetes networking: Pod IPs, ClusterIP DNAT, NodePort and externalTrafficPolicy (TC-2590..TC-2596). */
import { describe, expect, it } from 'vitest';
import { healthCheck, trace } from './k8sNetworking';

describe('TC-2590: Pod to Pod goes without NAT', () => {
  it('the backend sees the client Pod’s own address and no hop rewrites it', () => {
    const result = trace('pod');
    expect(result.backendSees).toBe('10.244.1.5');
    expect(result.hops.map((hop) => hop.change)).toEqual(['sent', 'forward', 'deliver', 'reply']);
    expect(result.reply).toEqual({
      src: '10.244.2.7',
      srcPort: 8080,
      dst: '10.244.1.5',
      dstPort: 40_000,
    });
  });
});

describe('TC-2591: a ClusterIP is DNATed to a Pod and the reply un-DNATed', () => {
  it('the destination becomes 10.244.2.7:8080, the source stays the client Pod', () => {
    const result = trace('cluster-ip');
    expect(result.hops[0]!.packet).toMatchObject({ dst: '10.96.0.10', dstPort: 80 });
    expect(result.hops[1]).toMatchObject({
      at: 'node-a',
      change: 'dnat',
      packet: { src: '10.244.1.5', dst: '10.244.2.7', dstPort: 8080 },
    });
    expect(result.backendSees).toBe('10.244.1.5');
  });
  it('the client gets its reply from the ClusterIP, not the Pod', () => {
    expect(trace('cluster-ip').reply).toEqual({
      src: '10.96.0.10',
      srcPort: 80,
      dst: '10.244.1.5',
      dstPort: 40_000,
    });
  });
});

describe('TC-2592: NodePort under Cluster on a node with no backend: SNAT and an extra hop', () => {
  it('node-a rewrites both addresses; the backend sees 10.0.0.1', () => {
    const result = trace('node-port', 'node-a', 'Cluster');
    expect(result.delivered).toBe(true);
    expect(result.backendSees).toBe('10.0.0.1');
    expect(result.extraHops).toBe(1);
    expect(result.reply).toMatchObject({ src: '10.0.0.1', srcPort: 30_080, dst: '203.0.113.9' });
  });
});

describe('TC-2593: NodePort under Local on a node with no backend is not answered', () => {
  it('node-a drops it; nothing reaches the backend', () => {
    const result = trace('node-port', 'node-a', 'Local');
    expect(result).toMatchObject({ delivered: false, backendSees: null, reply: null });
    expect(result.hops[result.hops.length - 1]!.change).toBe('drop');
  });
});

describe('TC-2594: NodePort under Local on the backend’s node keeps the client address', () => {
  it('the backend sees 203.0.113.9 and there is no extra hop', () => {
    const result = trace('node-port', 'node-b', 'Local');
    expect(result.backendSees).toBe('203.0.113.9');
    expect(result.extraHops).toBe(0);
  });
});

describe('TC-2595: under Cluster the source is rewritten even on the backend’s node', () => {
  it('entering on node-b: the backend sees 10.0.0.2, no extra hop', () => {
    const result = trace('node-port', 'node-b', 'Cluster');
    expect(result.backendSees).toBe('10.0.0.2');
    expect(result.extraHops).toBe(0);
  });
});

describe('TC-2596: under Local only nodes with a backend pass the health check', () => {
  it('node-a 503, node-b 200; under Cluster both 200', () => {
    expect(healthCheck('node-a', 'Local')).toBe(503);
    expect(healthCheck('node-b', 'Local')).toBe(200);
    expect(healthCheck('node-a', 'Cluster')).toBe(200);
  });
});
