import type React from 'react';
import type { TranslatorFn } from '../../i18n/types';
import type { NetlabNode, NetworkTopology } from '../../types/topology';
import { explainerKeyFor, type LearnerNodeKind } from './learnerExplainers';
import type { ResolvedTarget } from './PanelChrome';

export interface ResolvedPanelTarget {
  target: ResolvedTarget;
  title: React.ReactNode;
  ariaLabel: string;
  headerEyebrow: string;
  node?: NetlabNode;
  edge?: NetworkTopology['edges'][number];
}

const NODE_KIND_KEYS: Readonly<Record<string, string>> = {
  router: 'simulation.nodeKind.router',
  switch: 'simulation.nodeKind.switch',
  client: 'simulation.nodeKind.client',
  server: 'simulation.nodeKind.server',
};

const LAYER_KEYS: Readonly<Record<string, string>> = {
  l1: 'simulation.nodeDetail.layer.l1',
  l2: 'simulation.nodeDetail.layer.l2',
  l3: 'simulation.nodeDetail.layer.l3',
  l4: 'simulation.nodeDetail.layer.l4',
  l7: 'simulation.nodeDetail.layer.l7',
};

export function resolvePanelTarget(
  topology: NetworkTopology,
  selectedNodeId: string | null,
  selectedEdgeId: string | null | undefined,
  t: TranslatorFn,
): ResolvedPanelTarget | null {
  if (selectedEdgeId) {
    const edge = topology.edges.find((candidate) => candidate.id === selectedEdgeId);
    if (!edge) return null;
    return {
      edge,
      target: { kind: 'edge' },
      ariaLabel: t('simulation.nodeDetail.edgeAria', { id: edge.id }),
      headerEyebrow: t('simulation.nodeDetail.edgeHeading'),
      title: (
        <>
          {edge.id}
          <span style={{ color: 'var(--netlab-text-muted)', marginLeft: 8 }}>
            {t('simulation.nodeDetail.link')}
          </span>
        </>
      ),
    };
  }

  if (!selectedNodeId) return null;
  const node = topology.nodes.find((candidate) => candidate.id === selectedNodeId);
  if (!node) return null;
  return {
    node,
    target: { kind: 'node', role: node.data.role },
    ariaLabel: t('simulation.nodeDetail.nodeAria', { label: node.data.label }),
    headerEyebrow: t('simulation.nodeDetail.nodeHeading'),
    // The kind and the layer in words: `router l3` read as two raw tokens.
    // A role the catalogue does not name is shown as it is written.
    title: (
      <>
        {node.data.label}
        <span data-dp-node-kind style={{ color: 'var(--netlab-text-muted)', marginLeft: 8 }}>
          {NODE_KIND_KEYS[node.data.role] ? t(NODE_KIND_KEYS[node.data.role]!) : node.data.role}
        </span>
        {LAYER_KEYS[node.data.layerId] && (
          <span data-dp-node-layer style={{ color: 'var(--netlab-text-faint)', marginLeft: 8 }}>
            {t(LAYER_KEYS[node.data.layerId]!)}
          </span>
        )}
      </>
    ),
  };
}

export function resolveLearnerExplainer(
  node: NetlabNode | undefined,
  audience: string,
  t: TranslatorFn,
) {
  if (!node) return { learnerKind: null, learnerCopy: undefined };
  const role = node.data.role;
  const learnerKind: LearnerNodeKind | null =
    role === 'router'
      ? 'router'
      : role === 'switch'
        ? 'switch'
        : role === 'client' || role === 'server'
          ? 'host'
          : null;
  const learnerKey = audience === 'learner' ? explainerKeyFor(learnerKind, 'overview') : undefined;
  return {
    learnerKind,
    learnerCopy: learnerKey ? t(learnerKey) : undefined,
  };
}
