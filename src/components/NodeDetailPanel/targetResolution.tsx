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
    title: (
      <>
        {node.data.label}
        <span style={{ color: 'var(--netlab-text-muted)', marginLeft: 8 }}>{node.data.role}</span>
        <span style={{ color: 'var(--netlab-text-faint)', marginLeft: 8 }}>
          {node.data.layerId}
        </span>
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
