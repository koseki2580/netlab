import type { ComponentType } from 'react';
import type { LayerId } from '../../types/layers';
import type { NetlabEdge, NetlabNode } from '../../types/topology';

/** A connection the learner drew, before it becomes an edge. */
export interface GraphConnection {
  readonly source: string;
  readonly target: string;
  readonly sourceHandle?: string | null | undefined;
  readonly targetHandle?: string | null | undefined;
}

export interface GraphNodeMove {
  readonly id: string;
  readonly position: { x: number; y: number };
}

/**
 * Everything a canvas engine must do for the editor, and nothing else.
 *
 * The point of naming this is that only the adapter may know which library
 * draws the graph. Two engines then have to agree on behaviour rather than on
 * an import path, which is what lets the same tests run against both.
 */
export interface GraphEngineProps {
  readonly nodes: readonly NetlabNode[];
  readonly edges: readonly NetlabEdge[];
  /**
   * Layers to paint. The engine is expected to hide the rest; an engine with a
   * native layer model uses it, one without filters. Omit to paint everything.
   */
  readonly visibleLayers?: ReadonlySet<LayerId>;
  /** Drawn thicker — used to point at the link a history row crossed. */
  readonly highlightEdgeId?: string | null;

  /** Rejected connections must not become edges; the engine also draws the refusal. */
  readonly isValidConnection: (connection: GraphConnection) => boolean;
  readonly onConnect: (connection: GraphConnection) => void;
  readonly onNodesMoved: (moves: readonly GraphNodeMove[]) => void;
  readonly onDeleteNode: (nodeId: string) => void;
  readonly onDeleteEdge: (edgeId: string) => void;
  readonly onSelectNode?: (nodeId: string | null) => void;
}

export type GraphEngine = ComponentType<GraphEngineProps>;
