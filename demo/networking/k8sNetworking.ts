/**
 * The Kubernetes networking lesson (REQ-447): every Pod has its own IP and
 * Pods reach each other without NAT (the model's requirement); a Service's
 * ClusterIP is a virtual address that kube-proxy rewrites (DNAT) to a backend
 * Pod; a NodePort opens the same port on every node; and
 * externalTrafficPolicy decides between Cluster (any node answers, the source
 * is rewritten to that node and the request may take an extra hop) and Local
 * (only nodes with a backend answer, and the client's address is kept).
 *
 * The rewrites follow kube-proxy in its iptables or IPVS mode, which is an
 * implementation choice: CNI plugins that replace kube-proxy (for example
 * with eBPF) may keep the source address, or answer directly, differently.
 *
 * Simplified: two nodes, one Service with one backend Pod; source ports are
 * kept through SNAT (a real masquerade may change them); Pod-to-ClusterIP
 * traffic is not masqueraded (kube-proxy can be told to, and does for a Pod
 * reaching itself through its own Service); the overlay or routing between
 * nodes is drawn as one hop with no encapsulation shown.
 */

export type NodeId = 'node-a' | 'node-b';

export const NODE_IP: Record<NodeId, string> = { 'node-a': '10.0.0.1', 'node-b': '10.0.0.2' };

/** The Pod that calls the Service, on node-a. */
export const CLIENT_POD = { ip: '10.244.1.5', port: 40_000, node: 'node-a' as NodeId };
/** The Service's only backend, on node-b. */
export const BACKEND_POD = { ip: '10.244.2.7', port: 8080, node: 'node-b' as NodeId };
/** A client on the internet. */
export const EXTERNAL = { ip: '203.0.113.9', port: 51_000 };
export const SERVICE = { clusterIp: '10.96.0.10', port: 80, nodePort: 30_080 };

export type Target = 'pod' | 'cluster-ip' | 'node-port';
export type Policy = 'Cluster' | 'Local';

export interface Packet {
  readonly src: string;
  readonly srcPort: number;
  readonly dst: string;
  readonly dstPort: number;
}

export type Change =
  | 'sent'
  | 'dnat'
  | 'dnat-snat'
  | 'forward'
  | 'deliver'
  | 'drop'
  | 'reply'
  | 'reverse';

/** One place a packet passes, and the packet as it leaves that place. */
export interface Hop {
  readonly at: NodeId | 'client-pod' | 'backend-pod' | 'internet';
  readonly change: Change;
  readonly packet: Packet;
}

export interface Trace {
  readonly delivered: boolean;
  readonly hops: readonly Hop[];
  /** The source address the backend Pod sees, if the request reaches it. */
  readonly backendSees: string | null;
  /** The reply as the original sender receives it. */
  readonly reply: Packet | null;
  /** Node-to-node crossings beyond the node the request entered on. */
  readonly extraHops: number;
}

const swap = (packet: Packet): Packet => ({
  src: packet.dst,
  srcPort: packet.dstPort,
  dst: packet.src,
  dstPort: packet.srcPort,
});

/** Where the request goes, every rewrite on the way, and the reply the sender gets. */
export function trace(target: Target, entry: NodeId = 'node-a', policy: Policy = 'Cluster'): Trace {
  const backend = { dst: BACKEND_POD.ip, dstPort: BACKEND_POD.port };
  if (target !== 'node-port') {
    const sent: Packet = {
      src: CLIENT_POD.ip,
      srcPort: CLIENT_POD.port,
      ...(target === 'pod' ? backend : { dst: SERVICE.clusterIp, dstPort: SERVICE.port }),
    };
    const atBackend: Packet = { ...sent, ...backend };
    const fromBackend = swap(atBackend);
    // conntrack on the client's node undoes the DNAT on the way back.
    const reply = target === 'pod' ? fromBackend : swap(sent);
    const hops: Hop[] = [
      { at: 'client-pod', change: 'sent', packet: sent },
      { at: CLIENT_POD.node, change: target === 'pod' ? 'forward' : 'dnat', packet: atBackend },
      { at: 'backend-pod', change: 'deliver', packet: atBackend },
      { at: 'backend-pod', change: 'reply', packet: fromBackend },
    ];
    if (target === 'cluster-ip')
      hops.push({ at: CLIENT_POD.node, change: 'reverse', packet: reply });
    return { delivered: true, hops, backendSees: atBackend.src, reply, extraHops: 0 };
  }

  const sent: Packet = {
    src: EXTERNAL.ip,
    srcPort: EXTERNAL.port,
    dst: NODE_IP[entry],
    dstPort: SERVICE.nodePort,
  };
  const local = entry === BACKEND_POD.node;
  if (policy === 'Local' && !local) {
    return {
      delivered: false,
      hops: [
        { at: 'internet', change: 'sent', packet: sent },
        { at: entry, change: 'drop', packet: sent },
      ],
      backendSees: null,
      reply: null,
      extraHops: 0,
    };
  }
  // Cluster: the reply must come back through the entry node to be un-NATed,
  // so the source becomes the entry node's address.
  const atBackend: Packet =
    policy === 'Cluster'
      ? { src: NODE_IP[entry], srcPort: EXTERNAL.port, ...backend }
      : { ...sent, ...backend };
  const extraHops = local ? 0 : 1;
  const hops: Hop[] = [
    { at: 'internet', change: 'sent', packet: sent },
    { at: entry, change: policy === 'Cluster' ? 'dnat-snat' : 'dnat', packet: atBackend },
  ];
  if (!local) hops.push({ at: BACKEND_POD.node, change: 'forward', packet: atBackend });
  hops.push({ at: 'backend-pod', change: 'deliver', packet: atBackend });
  hops.push({ at: 'backend-pod', change: 'reply', packet: swap(atBackend) });
  const reply = swap(sent);
  hops.push({ at: entry, change: 'reverse', packet: reply });
  return { delivered: true, hops, backendSees: atBackend.src, reply, extraHops };
}

/**
 * Under Local, kube-proxy serves a health-check port on every node so a load
 * balancer can skip nodes without a backend: 200 with one, 503 without.
 * Under Cluster every node can answer, so every node is healthy.
 */
export function healthCheck(node: NodeId, policy: Policy): 200 | 503 {
  return policy === 'Cluster' || node === BACKEND_POD.node ? 200 : 503;
}
