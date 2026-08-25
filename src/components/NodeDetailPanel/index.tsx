import { CANVAS_LAYER } from '../canvasLayers';
import { memo, useContext, useEffect } from 'react';
import { SimulationContext } from '../../simulation/SimulationContext';
import type { TopologySnapshot } from '../../types/topology';
import { useNetlabContext } from '../NetlabContext';
import { NetlabThemeScopeContext } from '../NetlabThemeScope';
import { useNetlabUI } from '../NetlabUIContext';
import { useViewport } from '../../utils/useViewport';
import {
  getDefaultTab,
  getPanelStyle,
  getTabOrientation,
  getVisibleTabs,
  LearnerExplainerCallout,
  PanelHeader,
  ResizeHandle,
  TabNav,
} from './PanelChrome';
import { resolveLearnerExplainer, resolvePanelTarget } from './targetResolution';
import { vlanColor } from './_colors';
import { EdgeTab } from './tabs/EdgeTab';
import { NodeTabs } from './tabs/NodeTabs';
import { resolveDpTab, useNodeDetailDock, type DpMode } from './useNodeDetailDock';

export { vlanColor };

export interface NodeDetailPanelProps {
  editable?: boolean;
  onTopologyChange?: (topology: TopologySnapshot) => void;
}

export const NodeDetailPanel = memo(function NodeDetailPanel({
  editable = false,
  onTopologyChange,
}: NodeDetailPanelProps = {}) {
  const { selectedNodeId, setSelectedNodeId, selectedEdgeId, setSelectedEdgeId } = useNetlabUI();
  const { topology } = useNetlabContext();
  const simCtx = useContext(SimulationContext);
  const themeScope = useContext(NetlabThemeScopeContext);
  const dock = useNodeDetailDock();
  const { isNarrow } = useViewport();
  const activeSelectionId = selectedEdgeId ?? selectedNodeId;
  const canEdit = editable && onTopologyChange !== undefined;

  useEffect(() => {
    if (!activeSelectionId) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId?.(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSelectionId, setSelectedEdgeId, setSelectedNodeId]);

  if (!selectedNodeId && !selectedEdgeId) return null;

  const panelTarget = resolvePanelTarget(topology, selectedNodeId, selectedEdgeId);
  if (!panelTarget) return null;

  const visibleTabs = getVisibleTabs(panelTarget.target, canEdit);
  const defaultTab =
    canEdit && visibleTabs.includes('sandbox') ? 'sandbox' : getDefaultTab(panelTarget.target);
  const activeTab = resolveDpTab(dock.persistedTab, visibleTabs, defaultTab);
  const { learnerKind, learnerCopy } = resolveLearnerExplainer(
    panelTarget.target.kind === 'node' ? panelTarget.node : undefined,
    themeScope?.audience ?? 'pro',
  );

  const closePanel = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId?.(null);
  };
  const updateSnapshot = (update: (snapshot: TopologySnapshot) => TopologySnapshot) => {
    if (!onTopologyChange) return;
    onTopologyChange(
      update({ nodes: topology.nodes, edges: topology.edges, areas: topology.areas }),
    );
  };
  const orientation = getTabOrientation(dock.width);

  return (
    <>
      {isNarrow && (
        <div
          data-netlab-dp-backdrop
          aria-hidden="true"
          onClick={closePanel}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: CANVAS_LAYER.panelScrim,
            background: 'color-mix(in srgb, var(--netlab-bg-primary) 55%, transparent)',
          }}
        />
      )}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={panelTarget.ariaLabel}
        tabIndex={0}
        className="netlab-dp-slide-in"
        data-netlab-dp
        data-dp-mode={isNarrow ? 'drawer' : dock.mode}
        data-dp-width={dock.width}
        style={getPanelStyle(dock.mode, dock.width, isNarrow)}
      >
        <ResizeHandle currentWidth={dock.width} onResize={dock.setWidth} />

        <PanelHeader
          targetKind={panelTarget.target.kind}
          title={panelTarget.title}
          headerEyebrow={panelTarget.headerEyebrow}
          mode={dock.mode}
          onToggleMode={() => dock.setMode(dock.mode === 'overlay' ? 'pinned' : 'overlay')}
          onClose={closePanel}
        />

        {learnerCopy && (
          <LearnerExplainerCallout learnerKind={learnerKind} learnerCopy={learnerCopy} />
        )}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: orientation === 'column' ? 'row' : 'column',
          }}
        >
          <TabNav
            tabs={visibleTabs}
            activeTab={activeTab}
            orientation={orientation}
            onSelect={dock.setTab}
          />
          <div
            data-netlab-dp-content
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              overflow: 'auto',
              padding: '10px 14px',
            }}
          >
            {panelTarget.edge ? (
              <EdgeTab
                edge={panelTarget.edge}
                topology={topology}
                onTopologyChange={onTopologyChange}
                updateSnapshot={updateSnapshot}
              />
            ) : panelTarget.node && selectedNodeId ? (
              <NodeTabs
                activeTab={activeTab}
                node={panelTarget.node}
                nodeId={selectedNodeId}
                canEdit={canEdit}
                topology={topology}
                updateSnapshot={updateSnapshot}
                simCtx={simCtx}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
});

export type { DpMode };
