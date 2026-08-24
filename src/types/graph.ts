import type { ComponentType, CSSProperties } from 'react';

/**
 * The shape of a drawn graph, defined here rather than borrowed from a library.
 *
 * These types were React Flow's. They spread through the topology model, the
 * layer registry and every device component, which is what made the graph
 * library impossible to replace without touching all of it. They describe what
 * a netlab topology *is* — a device has a position and some data, a link joins
 * two devices — so they belong to netlab, and whichever engine draws them reads
 * them rather than defining them.
 */

export interface XYPosition {
  x: number;
  y: number;
}

/** A device on the canvas. */
export interface GraphNode<
  Data extends Record<string, unknown> = Record<string, unknown>,
  Type extends string | undefined = string | undefined,
> {
  id: string;
  position: XYPosition;
  data: Data;
  type?: Type;
  selected?: boolean;
  draggable?: boolean;
  /** An area background is drawn but is not the learner's to pick or remove. */
  selectable?: boolean;
  deletable?: boolean;
  hidden?: boolean;
  width?: number;
  height?: number;
  /** Size as the engine measured it, when it measures rather than is told. */
  measured?: { width?: number; height?: number };
  style?: CSSProperties;
  className?: string;
  zIndex?: number;
  parentId?: string;
  extent?: 'parent' | [[number, number], [number, number]];
}

/** A link between two devices. */
export interface GraphEdge<Data extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  source: string;
  target: string;
  /**
   * Which interface the link leaves and enters by. This is a netlab concept —
   * a router interface name — that the simulation reads; it is not a drawing
   * instruction.
   */
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  data?: Data;
  /** The link is being shown with a packet travelling along it. */
  animated?: boolean;
  hidden?: boolean;
  selected?: boolean;
  style?: CSSProperties;
  className?: string;
  label?: string;
  zIndex?: number;
}

/** A link a learner has just drawn, before it becomes an edge. */
export interface GraphConnection {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/** Where the canvas is looking, in screen pixels and scale. */
export interface GraphViewport {
  x: number;
  y: number;
  zoom: number;
}

/** What a device component is handed. */
export interface GraphNodeProps<Data extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  data: Data;
  type?: string | undefined;
  selected?: boolean | undefined;
}

/** Device kind → the component that draws it. */
export type GraphNodeTypes = Record<string, ComponentType<GraphNodeProps>>;

/** A change the engine reports, for the owner to apply. */
export type GraphNodeChange<NodeType extends GraphNode = GraphNode> =
  | { type: 'position'; id: string; position: XYPosition; dragging?: boolean }
  | { type: 'select'; id: string; selected: boolean }
  | { type: 'remove'; id: string }
  | { type: 'add'; item: NodeType }
  | { type: 'dimensions'; id: string; dimensions?: { width: number; height: number } };

export type GraphEdgeChange<EdgeType extends GraphEdge = GraphEdge> =
  | { type: 'select'; id: string; selected: boolean }
  | { type: 'remove'; id: string }
  | { type: 'add'; item: EdgeType };
