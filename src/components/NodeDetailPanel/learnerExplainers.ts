/**
 * Learner-mode "what is this?" copy shown above a section's detail
 * content when the resolved {@link NetlabThemeScopeValue#audience} is
 * `'learner'`. The registry is keyed by `kind:section` (e.g.
 * `'router:overview'`) so contributors can add explainers for any
 * combination without changing the panel renderer. Each value is an i18n
 * catalog key; the caller translates it.
 *
 * Empty by default — copy is added incrementally as sections gain
 * scaffolding. Components that render explainers fall back to no UI
 * when no copy is registered.
 */

export type LearnerNodeKind = 'router' | 'switch' | 'host' | 'edge';
export type LearnerSection = 'overview' | 'interfaces' | 'routes' | 'arp' | 'acls' | 'sandbox';

export type LearnerSectionKey = `${LearnerNodeKind}:${LearnerSection}`;

export const LEARNER_EXPLAINER_KEYS: Partial<Record<LearnerSectionKey, string>> = {
  'router:overview': 'simulation.nodeDetail.explainer.routerOverview',
  'router:routes': 'simulation.nodeDetail.explainer.routerRoutes',
  'switch:overview': 'simulation.nodeDetail.explainer.switchOverview',
  'host:overview': 'simulation.nodeDetail.explainer.hostOverview',
  'host:arp': 'simulation.nodeDetail.explainer.hostArp',
};

export function explainerKeyFor(
  kind: LearnerNodeKind | null | undefined,
  section: LearnerSection,
): string | undefined {
  if (!kind) return undefined;
  return LEARNER_EXPLAINER_KEYS[`${kind}:${section}` as LearnerSectionKey];
}
