import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type NodeTypes,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { AreaBackground } from '../areas/AreaBackground';
import { areasToNodes } from '../areas/AreaRegistry';
import { layerRegistry } from '../registry/LayerRegistry';
import { useOptionalFailure } from '../simulation/FailureContext';
import { SimulationContext } from '../simulation/SimulationContext';
import type { NetlabEdge, NetlabNode, TopologySnapshot } from '../types/topology';
import { validateConnection as validateCanvasConnection } from '../utils/connectionValidator';
import type { NetlabColorMode } from '../utils/themeUtils';
import { useNetlabContext } from './NetlabContext';
import { NetlabThemeScopeContext } from './NetlabThemeScope';
import { NetlabUIContext } from './NetlabUIContext';
import { NodeDetailPanel } from './NodeDetailPanel';
import { ValidationSmoothStepEdge } from './ValidationEdgeLabel';

const AREA_NODE_TYPE: NodeTypes = {
  'netlab-area': AreaBackground as NodeTypes[string],
};
const AREA_NODE_PREFIX = '__area__';

function excludeAreaNodes(nodes: { id: string }[]): NetlabNode[] {
  return nodes.filter((node) => !node.id.startsWith(AREA_NODE_PREFIX)) as NetlabNode[];
}

function withValidationEdgeType(edge: NetlabEdge): NetlabEdge {
  if (edge.type && edge.type !== 'smoothstep') {
    return edge;
  }

  return { ...edge, type: 'validation-smoothstep' };
}

export interface NetlabCanvasProps {
  style?: React.CSSProperties;
  className?: string;
  colorMode?: NetlabColorMode;
  onNodesChange?: (nodes: NetlabNode[]) => void;
  onEdgesChange?: (edges: NetlabEdge[]) => void;
  onTopologyChange?: (topology: TopologySnapshot) => void;
}

export function NetlabCanvas({
  style,
  className,
  colorMode,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onTopologyChange,
}: NetlabCanvasProps) {
  const { topology, areas } = useNetlabContext();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const isControlled = Boolean(onTopologyChange || onNodesChangeProp || onEdgesChangeProp);

  // Optional: read active edge IDs from SimulationContext (non-throwing)
  const simCtx = useContext(SimulationContext);
  const activeEdgeIds = simCtx?.state.activeEdgeIds ?? [];
  const themeScope = useContext(NetlabThemeScopeContext);
  const resolvedColorMode = colorMode ?? themeScope?.colorMode ?? 'dark';

  // Optional: read failure state for visual styling
  const failureCtx = useOptionalFailure();

  const nodeTypes = useMemo(
    () => ({
      ...AREA_NODE_TYPE,
      ...layerRegistry.getAllNodeTypes(),
    }),
    [],
  );
  const edgeTypes = useMemo(
    () => ({
      'validation-smoothstep': ValidationSmoothStepEdge,
    }),
    [],
  );

  const areaNodes = useMemo(() => areasToNodes(areas), [areas]);

  const initialNodes = useMemo(
    () => [...areaNodes, ...topology.nodes],
    [areaNodes, topology.nodes],
  );

  const [nodes, setNodes, rfOnNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, rfOnEdgesChange] = useEdgesState(topology.edges);

  useEffect(() => {
    if (!isControlled) return;
    setNodes([...areaNodes, ...topology.nodes]);
  }, [topology.nodes, areaNodes, setNodes, isControlled]);

  useEffect(() => {
    if (!isControlled) return;
    setEdges(topology.edges);
  }, [topology.edges, setEdges, isControlled]);

  const emitTopologyChange = useCallback(
    (nextNodes: NetlabNode[], nextEdges: NetlabEdge[]) => {
      onTopologyChange?.({
        nodes: nextNodes,
        edges: nextEdges,
        areas: topology.areas,
      });
    },
    [onTopologyChange, topology.areas],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<NetlabNode>[]) => {
      rfOnNodesChange(changes);

      if (!isControlled || !changes.some((change) => change.type === 'remove')) return;

      const nextNodes = excludeAreaNodes(applyNodeChanges(changes, nodes));
      onNodesChangeProp?.(nextNodes);
      emitTopologyChange(nextNodes, edges);
    },
    [rfOnNodesChange, isControlled, nodes, onNodesChangeProp, emitTopologyChange, edges],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<NetlabEdge>[]) => {
      rfOnEdgesChange(changes);

      if (!isControlled || !changes.some((change) => change.type === 'remove')) return;

      const nextEdges = applyEdgeChanges(changes, edges);
      onEdgesChangeProp?.(nextEdges);
      emitTopologyChange(excludeAreaNodes(nodes), nextEdges);
    },
    [rfOnEdgesChange, isControlled, edges, onEdgesChangeProp, emitTopologyChange, nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const nextEdges = addEdge({ ...connection, type: 'smoothstep' }, edges);
      setEdges(nextEdges);

      if (!isControlled) return;

      onEdgesChangeProp?.(nextEdges);
      emitTopologyChange(excludeAreaNodes(nodes), nextEdges);
    },
    [edges, setEdges, isControlled, onEdgesChangeProp, emitTopologyChange, nodes],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, _node, allNodes) => {
      if (!isControlled) return;

      const nextNodes = excludeAreaNodes(allNodes);
      onNodesChangeProp?.(nextNodes);
      emitTopologyChange(nextNodes, edges);
    },
    [isControlled, onNodesChangeProp, emitTopologyChange, edges],
  );

  const selectNode = useCallback((id: string | null) => {
    setSelectedEdgeId(null);
    setSelectedNodeId(id);
  }, []);

  const selectEdge = useCallback((id: string | null) => {
    setSelectedNodeId(null);
    setSelectedEdgeId(id);
  }, []);

  const isConnectionValid = useCallback(
    (connection: Connection | Edge) =>
      validateCanvasConnection(
        nodes,
        edges,
        connection.source ?? '',
        connection.target ?? '',
        connection.sourceHandle,
        connection.targetHandle,
      ).valid,
    [nodes, edges],
  );

  const styledNodes = useMemo(
    () =>
      nodes.map((node) => {
        const downInterfaceCount = (node.data.interfaces ?? []).filter((iface) =>
          failureCtx?.isInterfaceDown(node.id, iface.id),
        ).length;

        if (!failureCtx?.isNodeDown(node.id) && downInterfaceCount === 0) {
          return node;
        }

        return {
          ...node,
          style: failureCtx?.isNodeDown(node.id)
            ? { ...node.style, opacity: 0.4, filter: 'grayscale(80%)' }
            : node.style,
          data:
            downInterfaceCount > 0
              ? { ...node.data, _downInterfaceCount: downInterfaceCount }
              : node.data,
        };
      }),
    [nodes, failureCtx],
  );

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => {
        const validationEdge = withValidationEdgeType(edge);

        if (failureCtx?.isEdgeDown(edge.id)) {
          return {
            ...validationEdge,
            animated: false,
            style: {
              ...validationEdge.style,
              stroke: 'var(--netlab-accent-red)',
              strokeDasharray: '6 3',
              strokeWidth: 2,
              opacity: 0.7,
            },
          };
        }
        if (activeEdgeIds.includes(edge.id)) {
          return {
            ...validationEdge,
            animated: true,
            style: {
              ...validationEdge.style,
              stroke: 'var(--netlab-accent-cyan)',
              strokeWidth: 2,
            },
          };
        }
        const validationResult = validateCanvasConnection(
          nodes,
          edges.filter((candidate) => candidate.id !== edge.id),
          edge.source,
          edge.target,
          edge.sourceHandle,
          edge.targetHandle,
        );

        if (!validationResult.valid) {
          return {
            ...validationEdge,
            style: {
              ...validationEdge.style,
              stroke: 'var(--netlab-accent-red)',
            },
            data: { ...validationEdge.data, validationResult },
          };
        }

        if (validationResult.warnings.length > 0) {
          return {
            ...validationEdge,
            style: {
              ...validationEdge.style,
              stroke: 'var(--netlab-accent-orange, orange)',
            },
            data: { ...validationEdge.data, validationResult },
          };
        }

        return validationEdge;
      }),
    [edges, nodes, activeEdgeIds, failureCtx],
  );

  const uiCtx = useMemo(
    () => ({
      selectedNodeId,
      setSelectedNodeId: selectNode,
      selectedEdgeId,
      setSelectedEdgeId: selectEdge,
    }),
    [selectedNodeId, selectNode, selectedEdgeId, selectEdge],
  );

  return (
    <NetlabUIContext.Provider value={uiCtx}>
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          ...style,
        }}
        className={className}
      >
        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode={resolvedColorMode}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onEdgeClick={(_event, edge) => selectEdge(edge.id)}
          onPaneClick={() => {
            selectNode(null);
            selectEdge(null);
          }}
          isValidConnection={isConnectionValid}
          connectionMode={ConnectionMode.Loose}
          fitView
          proOptions={{ hideAttribution: false }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
        <NodeDetailPanel onTopologyChange={onTopologyChange} />
      </div>
    </NetlabUIContext.Provider>
  );
}
