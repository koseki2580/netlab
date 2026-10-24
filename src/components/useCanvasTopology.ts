import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
} from './graphState';
import type {
  GraphConnection as Connection,
  GraphEdge as Edge,
  GraphEdgeChange as EdgeChange,
  GraphNodeChange as NodeChange,
} from '../types/graph';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { NetlabEdge, NetlabNode, NetworkTopology, TopologySnapshot } from '../types/topology';
import { validateConnection as validateCanvasConnection } from '../utils/connectionValidator';
import { AREA_NODE_PREFIX } from './canvasViewModel';

function excludeAreaNodes(nodes: { id: string }[]): NetlabNode[] {
  return nodes.filter((node) => !node.id.startsWith(AREA_NODE_PREFIX)) as NetlabNode[];
}

export interface CanvasTopologyInputs {
  readonly topology: Pick<NetworkTopology, 'nodes' | 'edges' | 'areas'>;
  /** The area backgrounds, drawn as nodes under the devices. */
  readonly areaNodes: NetlabNode[];
  /** The host owns the topology and is told of every change. */
  readonly isControlled: boolean;
  /** Redraw from the host's topology on every change even when uncontrolled. */
  readonly followTopology: boolean;
  readonly onNodesChange: ((nodes: NetlabNode[]) => void) | undefined;
  readonly onEdgesChange: ((edges: NetlabEdge[]) => void) | undefined;
  readonly onTopologyChange: ((topology: TopologySnapshot) => void) | undefined;
}

/**
 * The canvas's own copy of the devices and links, and how it follows the host.
 *
 * A controlled canvas (or one told to follow) redraws from the host's topology
 * on every change and reports its edits back. An uncontrolled one keeps its
 * first snapshot, so a drag on the canvas survives, but still takes the host's
 * links when they really change.
 */
export function useCanvasTopology({
  topology,
  areaNodes,
  isControlled,
  followTopology,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onTopologyChange,
}: CanvasTopologyInputs) {
  const initialNodes = useMemo(
    () => [...areaNodes, ...topology.nodes],
    [areaNodes, topology.nodes],
  );

  const [nodes, setNodes, rfOnNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, rfOnEdgesChange] = useEdgesState(topology.edges);

  useEffect(() => {
    if (!isControlled && !followTopology) return;
    setNodes([...areaNodes, ...topology.nodes]);
  }, [topology.nodes, areaNodes, setNodes, isControlled, followTopology]);

  useEffect(() => {
    if (!isControlled && !followTopology) return;
    setEdges(topology.edges);
  }, [topology.edges, setEdges, isControlled, followTopology]);

  // An uncontrolled canvas keeps its first snapshot so an in-canvas drag
  // survives, but it must not keep drawing links the host has changed: the
  // simulation runs on the host's links. A lesson that fails a link by taking
  // it out of its topology left it drawn as healthy, and a link a lesson marks
  // down or blocked never showed as such. Compared by content, so a host that
  // rebuilds the same links on every render does not wipe links drawn here.
  const hostEdgesKey = useMemo(() => JSON.stringify(topology.edges), [topology.edges]);
  const syncedEdgesKeyRef = useRef(hostEdgesKey);
  useEffect(() => {
    if (isControlled || followTopology) return;
    if (syncedEdgesKeyRef.current === hostEdgesKey) return;
    syncedEdgesKeyRef.current = hostEdgesKey;
    setEdges(topology.edges);
  }, [hostEdgesKey, topology.edges, setEdges, isControlled, followTopology]);

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

  const onNodeDragStop = useCallback(
    (_node: NetlabNode, allNodes: NetlabNode[]) => {
      if (!isControlled) return;

      const nextNodes = excludeAreaNodes(allNodes);
      onNodesChangeProp?.(nextNodes);
      emitTopologyChange(nextNodes, edges);
    },
    [isControlled, onNodesChangeProp, emitTopologyChange, edges],
  );

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

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
    isConnectionValid,
  };
}
