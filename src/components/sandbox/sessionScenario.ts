const ROUTE_SCENARIOS = new Map<string, string>([
  ['/networking/mtu-fragmentation', 'fragmented-echo'],
  ['/simulation/tcp-handshake', 'tcp-handshake'],
  ['/routing/ospf-convergence', 'ospf-convergence'],
  ['/networking/arp', 'basic-arp'],
]);

export function currentSandboxScenarioId(): string {
  const hashRoute = window.location.hash.replace(/^#/, '').split('?')[0] ?? '';
  const routeScenario = ROUTE_SCENARIOS.get(hashRoute);
  if (routeScenario) return routeScenario;

  const fallback = hashRoute.replace(/^\//, '').replace(/\//g, '-');
  return fallback.length > 0 ? fallback : 'unknown';
}
