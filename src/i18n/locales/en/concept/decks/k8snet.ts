import type { Catalog } from '../../../../types';

/** The `k8snet` deck's questions (en); its name is in the core chunk. */
export const k8snet: Catalog = {
  'learning.concept.k8snet.q1.prompt':
    'A Pod at 10.244.1.5 on node-a (10.0.0.1) calls a Service’s ClusterIP, 10.96.0.10:80; the only backend Pod, 10.244.2.7:8080, is on node-b. kube-proxy runs in iptables mode with default settings. What source address does the backend see?',
  'learning.concept.k8snet.q1.a': '10.96.0.10, the ClusterIP',
  'learning.concept.k8snet.q1.b': '10.0.0.1, node-a',
  'learning.concept.k8snet.q1.c': '10.244.1.5, the calling Pod',
  'learning.concept.k8snet.q1.why':
    'kube-proxy rewrites only the destination (DNAT) from the ClusterIP to a backend Pod. The source is left as it is, because Pods reach each other without NAT.',
  'learning.concept.k8snet.q1.a.why':
    'The ClusterIP is the destination the client asked for; nothing puts it in the source on the way in.',
  'learning.concept.k8snet.q1.b.why':
    'The node’s address would appear only with SNAT, which kube-proxy does not apply to Pod-to-ClusterIP traffic by default.',
  'learning.concept.k8snet.q2.prompt':
    'In the same call (Pod 10.244.1.5 to ClusterIP 10.96.0.10:80, DNATed to 10.244.2.7:8080), the backend replies. From which address does the calling Pod see the reply come?',
  'learning.concept.k8snet.q2.a': '10.96.0.10:80, the address it asked',
  'learning.concept.k8snet.q2.b': '10.244.2.7:8080, the backend Pod',
  'learning.concept.k8snet.q2.c': '10.0.0.2:8080, node-b',
  'learning.concept.k8snet.q2.why':
    'conntrack on the calling Pod’s node remembers the DNAT and undoes it on the reply, so the source becomes the ClusterIP again and the connection matches.',
  'learning.concept.k8snet.q2.b.why':
    'That is the reply as it leaves the backend; it is rewritten back before it reaches the caller, which would otherwise drop it as unknown.',
  'learning.concept.k8snet.q2.c.why':
    'No SNAT happened, so the node’s address is never involved; conntrack restores the ClusterIP.',
  'learning.concept.k8snet.q3.prompt':
    'A NodePort Service with externalTrafficPolicy: Cluster; kube-proxy in iptables mode. A client at 203.0.113.9 connects to node-b (10.0.0.2), the node that runs the only backend Pod. Take the masquerade address as the node’s own. What source does the backend see?',
  'learning.concept.k8snet.q3.a': '203.0.113.9: no extra hop, so no SNAT',
  'learning.concept.k8snet.q3.b': '10.0.0.2: Cluster SNATs to the node',
  'learning.concept.k8snet.q3.c': '10.0.0.1: the other node',
  'learning.concept.k8snet.q3.why':
    'Under Cluster kube-proxy masquerades external NodePort traffic whichever backend it picks, so even with a local backend the source becomes the entry node, 10.0.0.2. Only Local keeps the client’s address.',
  'learning.concept.k8snet.q3.a.why':
    'The rule does not look at where the chosen backend is: under Cluster the source is always rewritten.',
  'learning.concept.k8snet.q3.c.why':
    'The SNAT uses the node the request entered, node-b; node-a is not on this path.',
  'learning.concept.k8snet.q4.prompt':
    'A NodePort Service with externalTrafficPolicy: Local; kube-proxy in iptables mode. The only backend Pod runs on node-b (10.0.0.2). A client connects to the NodePort on node-a (10.0.0.1), which has no backend. What happens?',
  'learning.concept.k8snet.q4.a': 'Forwarded to node-b with SNAT to node-a',
  'learning.concept.k8snet.q4.b': 'Forwarded to node-b, client address kept',
  'learning.concept.k8snet.q4.c': 'Dropped on node-a: it has no backend',
  'learning.concept.k8snet.q4.why':
    'Under Local a node sends NodePort traffic only to backends on itself, which is what lets it keep the client address. node-a has none, so it drops the request; if the Service were of type LoadBalancer, its health check (503 on node-a) would keep the load balancer away from it.',
  'learning.concept.k8snet.q4.a.why':
    'That is what Cluster does. Local never sends to another node, so it never needs the SNAT.',
  'learning.concept.k8snet.q4.b.why':
    'If node-b replied straight to the client, the reply would not pass node-a’s conntrack to be un-DNATed; Local avoids this by never forwarding.',
};
