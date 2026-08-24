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
  /**
   * Where the learner is looking, in graph coordinates: the point at the centre
   * of the visible canvas. The palette drops new elements there — placing them
   * at a fixed spot near the origin meant that after panning away, the button
   * added a device the learner could not see.
   */
  readonly onViewCentre?: (centre: { x: number; y: number }) => void;

  /**
   * Interaction profile. The simulator mounts the same canvas twice over: as an
   * editable diagram, and as a picture in the middle of a page.
   *
   * `presentational` must not hijack the page — wheeling or pinching over a
   * mid-page canvas has to scroll the article, not zoom the graph — and must not
   * put its nodes in the tab order, since they are illustration rather than
   * controls. Defaults to `interactive`.
   */
  readonly interaction?: 'interactive' | 'presentational';

  /** Live zoom, so the owner can collapse detail as the learner zooms out. */
  readonly onZoomChange?: (zoom: number) => void;

  /** Fit the diagram on mount, with this much padding. */
  readonly fitOnMount?: { readonly padding: number } | false;
}

/** What `interaction` means, in the terms every engine has to honour. */
export interface InteractionProfile {
  readonly zoomOnScroll: boolean;
  readonly zoomOnPinch: boolean;
  readonly panOnDrag: boolean;
  readonly preventPageScroll: boolean;
  readonly nodesDraggable: boolean;
  readonly nodesFocusable: boolean;
  /** Lowest zoom `fitOnMount` may reach — a wide topology must fit a phone. */
  readonly minZoom: number;
}

export function interactionProfile(
  interaction: GraphEngineProps['interaction'] = 'interactive',
): InteractionProfile {
  const interactive = interaction === 'interactive';
  return {
    zoomOnScroll: interactive,
    zoomOnPinch: interactive,
    panOnDrag: interactive,
    // Presentational canvases sit inside prose: the page must keep scrolling.
    preventPageScroll: interactive,
    nodesDraggable: interactive,
    // Illustration is not a control, so it does not belong in the tab order.
    nodesFocusable: interactive,
    // Presentational canvases may zoom out further than the interactive floor so
    // a wide topology plus padding fits a narrow phone without clipping.
    minZoom: interactive ? 0.5 : 0.2,
  };
}

export type GraphEngine = ComponentType<GraphEngineProps>;
