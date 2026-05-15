/**
 * Learner-mode "what is this?" copy shown above a section's detail
 * content when the resolved {@link NetlabThemeScopeValue#audience} is
 * `'learner'`. The registry is keyed by `kind:section` (e.g.
 * `'router:overview'`) so contributors can add explainers for any
 * combination without changing the panel renderer.
 *
 * Empty by default — copy is added incrementally as sections gain
 * scaffolding. Components that render explainers fall back to no UI
 * when no copy is registered.
 */

export type LearnerNodeKind = 'router' | 'switch' | 'host' | 'edge';
export type LearnerSection = 'overview' | 'interfaces' | 'routes' | 'arp' | 'acls' | 'sandbox';

export type LearnerSectionKey = `${LearnerNodeKind}:${LearnerSection}`;

export const LEARNER_EXPLAINERS: Partial<Record<LearnerSectionKey, string>> = {
  'router:overview':
    'Routers forward packets between subnets by consulting their routing table. Open the routes section to see entries learned via static config, OSPF, or BGP.',
  'router:routes':
    'Each routing table row maps a destination prefix to a next-hop interface. Protocols compete; the lowest administrative distance wins.',
  'switch:overview':
    'Switches forward frames at L2 using the MAC address table. Unknown destinations are flooded out every port in the same VLAN.',
  'host:overview':
    'Hosts (clients and servers) own IP addresses and source traffic. Their ARP cache resolves destination IPs into MAC addresses on the local segment.',
  'host:arp':
    'ARP caches map IPv4 addresses to MACs on the local subnet. Entries expire after a few minutes so stale mappings recover automatically.',
};

export function explainerFor(
  kind: LearnerNodeKind | null | undefined,
  section: LearnerSection,
): string | undefined {
  if (!kind) return undefined;
  return LEARNER_EXPLAINERS[`${kind}:${section}` as LearnerSectionKey];
}
