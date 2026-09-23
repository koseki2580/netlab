import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NetlabProvider } from '../../components/NetlabProvider';
import { NetlabThemeScope } from '../../components/NetlabThemeScope';
import { NetlabUIContext } from '../../components/NetlabUIContext';
import { TopologyEditorProvider } from '../context/TopologyEditorProvider';
import { useTopologyEditorContext } from '../context/TopologyEditorContext';
import { EditorToolbar } from './EditorToolbar';
import { EditorSidebar, type EditorSidebarTab } from './EditorSidebar';
import { useI18n } from '../../i18n/useI18n';
import { LayerPalette } from './LayerPalette';
import { MaxGraphEngine } from '../engine/MaxGraphEngine';
import type { GraphConnection, GraphEngine } from '../engine/types';
import { NodeEditorPanel } from './NodeEditorPanel';
import { ValidationPanel } from './ValidationPanel';
import { applyTopologyPatch } from '../../utils/connectionFixers';
import { validateConnection, type ValidationError } from '../../utils/connectionValidator';
import { paletteByLayer } from '../palette';
import { SimulationProvider } from '../../simulation/SimulationContext';
import type { PacketHop } from '../../types/simulation';
import type { LayerId } from '../../types/layers';
import type { EditorTopology } from '../types';

export interface TopologyEditorProps {
  initialTopology?: EditorTopology;
  onTopologyChange?: (topology: EditorTopology) => void;
  /**
   * Scope the editor to these layers — `['l4']` mounts a transport-only
   * exercise. Omit for every layer. Elements outside the scope are absent from
   * the palette, so they cannot be placed.
   */
  layers?: readonly LayerId[];
  /** Swap the canvas engine. Defaults to the maxGraph adapter. */
  engine?: GraphEngine;
  style?: React.CSSProperties;
  className?: string;
}

/** Plain-language refusal per validator code; the validator's own text is English. */
const REFUSAL_KEY: Readonly<Record<ValidationError['code'], string>> = {
  'endpoint-to-endpoint': 'editor.connect.refused.endpointToEndpoint',
  'duplicate-edge': 'editor.connect.refused.duplicateEdge',
  'self-loop': 'editor.connect.refused.selfLoop',
  'interface-in-use': 'editor.connect.refused.interfaceInUse',
};

/** Typing in a field must never undo the diagram. */
function isTextEntry(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  const tag = element?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || !!element?.isContentEditable;
}

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  top: 12,
  right: 12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 6,
  zIndex: 3,
  pointerEvents: 'none',
  fontFamily: 'monospace',
  fontSize: 12,
};

const NOTE_STYLE: React.CSSProperties = {
  maxWidth: 560,
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--netlab-border)',
  background: 'color-mix(in srgb, var(--netlab-bg-surface) 92%, transparent)',
  color: 'var(--netlab-text-secondary)',
  lineHeight: 1.45,
};

// Inner component: can read editor context to pass NetlabUIContext values
function TopologyEditorInner({
  layers,
  engine: Engine = MaxGraphEngine,
}: {
  layers?: readonly LayerId[];
  engine?: GraphEngine;
}) {
  const {
    state,
    setSelectedNodeId,
    replaceTopology,
    addEdge,
    deleteNode,
    deleteEdge,
    updateNodePositions,
    undo,
    redo,
  } = useTopologyEditorContext();
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  // The rail follows what the learner just did: Run opens the result, placing
  // a device opens its editor.
  const [sidebarTab, setSidebarTab] = useState<EditorSidebarTab>('node');
  // Why the last connection was refused, in words; null once acted on.
  const [refusal, setRefusal] = useState<string | null>(null);
  const [highlightEdgeId, setHighlightEdgeId] = useState<string | null>(null);
  const [highlightedAreaId, setHighlightedAreaId] = useState<string | null>(null);
  // Every scoped layer starts visible: the editor opens showing what it holds,
  // and hiding is something the learner chooses to do.
  const scopedLayers = useMemo(
    () => paletteByLayer(layers).map((group) => group.layerId),
    [layers],
  );
  const [visibleLayers, setVisibleLayers] = useState<ReadonlySet<LayerId>>(
    () => new Set(scopedLayers),
  );
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  // Where the canvas is looking, so the palette drops a new element in view.
  const [viewCentre, setViewCentre] = useState<{ x: number; y: number } | null>(null);
  const onSelectHop = useCallback((hop: PacketHop, edgeId: string | null) => {
    setSelectedStep(hop.step);
    setHighlightEdgeId(edgeId);
  }, []);
  const toggleLayer = useCallback((layerId: LayerId) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }, []);

  const labelOf = useCallback(
    (id: string) => state.topology.nodes.find((n) => n.id === id)?.data.label ?? id,
    [state.topology.nodes],
  );
  const explainRefusal = useCallback(
    (c: GraphConnection) => {
      const result = validateConnection(
        state.topology.nodes,
        state.topology.edges,
        c.source,
        c.target,
        c.sourceHandle,
        c.targetHandle,
      );
      const code = result.errors[0]?.code;
      const names = { source: labelOf(c.source), target: labelOf(c.target) };
      setRefusal(t(code ? REFUSAL_KEY[code] : 'editor.connect.refused.other', names));
    },
    [state.topology, labelOf, t],
  );

  // Ctrl/Cmd+Z undoes, Ctrl/Cmd+Y or Cmd+Shift+Z redoes — while the editor has
  // focus (or nothing else does), and never while typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (isTextEntry(event.target)) return;
      const target = event.target as Node | null;
      const inEditor =
        target === document.body ||
        target === document.documentElement ||
        (target !== null && !!rootRef.current?.contains(target));
      if (!inEditor) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const selectFromChecks = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setSidebarTab('node');
    },
    [setSelectedNodeId],
  );

  const uiCtx = useMemo(
    () => ({
      selectedNodeId: state.selectedNodeId,
      setSelectedNodeId,
      highlightedAreaId,
      setHighlightedAreaId,
    }),
    [state.selectedNodeId, setSelectedNodeId, highlightedAreaId],
  );

  // Build a NetworkTopology from the editor's EditorTopology for NetlabProvider.
  // routeTables are excluded — NetlabProvider recomputes them.
  const netlabTopology = useMemo(
    () => ({
      nodes: state.topology.nodes,
      edges: state.topology.edges,
      areas: [],
      routeTables: new Map(),
    }),
    [state.topology],
  );

  useEffect(() => {
    if (!highlightEdgeId) {
      return;
    }

    if (!state.topology.edges.some((edge) => edge.id === highlightEdgeId)) {
      setHighlightEdgeId(null);
    }
  }, [highlightEdgeId, state.topology.edges]);

  return (
    <NetlabProvider topology={netlabTopology}>
      <SimulationProvider>
        {/* display: contents keeps the flex layout while giving the shortcut
            handler an element to ask "is focus inside the editor?". */}
        <div ref={rootRef} style={{ display: 'contents' }}>
          <EditorToolbar
            onPlaced={() => setSidebarTab('node')}
            onRan={() => setSidebarTab('history')}
          />
          <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
            <LayerPalette
              {...(layers !== undefined ? { layers } : {})}
              visibleLayers={visibleLayers}
              onToggleLayer={toggleLayer}
              {...(viewCentre !== null ? { viewCentre } : {})}
              onPlaced={() => setSidebarTab('node')}
            />
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <NetlabUIContext.Provider value={uiCtx}>
                <Engine
                  key={state.reactFlowKey}
                  nodes={state.topology.nodes}
                  edges={state.topology.edges}
                  visibleLayers={visibleLayers}
                  highlightEdgeId={highlightEdgeId}
                  isValidConnection={(c) =>
                    validateConnection(
                      state.topology.nodes,
                      state.topology.edges,
                      c.source,
                      c.target,
                      c.sourceHandle,
                      c.targetHandle,
                    ).valid
                  }
                  onConnectionRefused={explainRefusal}
                  onConnect={(c) => {
                    setRefusal(null);
                    addEdge({
                      id: `e-${Date.now()}`,
                      source: c.source,
                      target: c.target,
                      ...(c.sourceHandle != null ? { sourceHandle: c.sourceHandle } : {}),
                      ...(c.targetHandle != null ? { targetHandle: c.targetHandle } : {}),
                      type: 'smoothstep',
                    });
                  }}
                  onNodesMoved={(moves) => updateNodePositions([...moves])}
                  // Selecting a device on the canvas is how its editor is opened;
                  // without this the inspector only ever showed its empty state.
                  onSelectNode={setSelectedNodeId}
                  selectedNodeId={state.selectedNodeId}
                  onDeleteNode={deleteNode}
                  onDeleteEdge={deleteEdge}
                  onViewCentre={setViewCentre}
                />
              </NetlabUIContext.Provider>
              <div style={OVERLAY_STYLE}>
                <p data-testid="editor-connect-hint" style={{ ...NOTE_STYLE, margin: 0 }}>
                  {t('editor.connect.hint')}
                  <span style={{ display: 'block', fontSize: 11 }}>
                    {t('editor.toolbar.shortcuts')}
                  </span>
                </p>
                {refusal !== null ? (
                  <div
                    role="alert"
                    data-testid="editor-connect-refusal"
                    style={{
                      ...NOTE_STYLE,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      pointerEvents: 'auto',
                      color: 'var(--netlab-text-primary)',
                      borderColor: 'var(--netlab-accent-red, #ef4444)',
                    }}
                  >
                    <span>{refusal}</span>
                    <button
                      type="button"
                      data-testid="editor-connect-refusal-dismiss"
                      onClick={() => setRefusal(null)}
                      style={{
                        flexShrink: 0,
                        font: 'inherit',
                        fontSize: 11,
                        cursor: 'pointer',
                        border: '1px solid var(--netlab-border)',
                        borderRadius: 4,
                        background: 'transparent',
                        color: 'var(--netlab-text-primary)',
                        padding: '1px 6px',
                      }}
                    >
                      {t('editor.connect.dismiss')}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <NetlabUIContext.Provider value={uiCtx}>
              <EditorSidebar
                node={<NodeEditorPanel docked />}
                validation={
                  <ValidationPanel
                    nodes={state.topology.nodes}
                    edges={state.topology.edges}
                    onEdgeClick={setHighlightEdgeId}
                    editable
                    docked
                    deviceChecks
                    onNodeClick={selectFromChecks}
                    onApplyFix={(patch) =>
                      replaceTopology(applyTopologyPatch(patch, state.topology))
                    }
                  />
                }
                selectedStep={selectedStep}
                onSelectHop={onSelectHop}
                tab={sidebarTab}
                onTabChange={setSidebarTab}
              />
            </NetlabUIContext.Provider>
          </div>
        </div>
      </SimulationProvider>
    </NetlabProvider>
  );
}

export function TopologyEditor({
  initialTopology,
  onTopologyChange,
  layers,
  engine,
  style,
  className,
}: TopologyEditorProps) {
  return (
    <TopologyEditorProvider
      {...(initialTopology !== undefined ? { initialTopology } : {})}
      {...(onTopologyChange !== undefined ? { onTopologyChange } : {})}
    >
      <NetlabThemeScope
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          ...style,
        }}
        {...(className !== undefined ? { className } : {})}
      >
        <TopologyEditorInner
          {...(layers !== undefined ? { layers } : {})}
          {...(engine !== undefined ? { engine } : {})}
        />
      </NetlabThemeScope>
    </TopologyEditorProvider>
  );
}
