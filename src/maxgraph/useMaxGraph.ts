import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Graph, InternalEvent } from '@maxgraph/core';

/**
 * The maxGraph lifecycle both canvases share: one Graph per host element,
 * made on mount and destroyed on unmount. `setup` configures the graph the
 * canvas needs and may return a teardown, which runs before the graph is
 * destroyed (an overview drawn from the graph has to go first).
 *
 * The graph comes back twice: as state, so effects that need it run once it
 * exists, and as a ref that is set within the mount itself, for code that
 * reads it later in the same commit.
 */
export function useMaxGraph(
  hostRef: RefObject<HTMLDivElement | null>,
  setup: (graph: Graph, host: HTMLDivElement) => (() => void) | void,
): { readonly graph: Graph | null; readonly graphRef: RefObject<Graph | null> } {
  const [graph, setGraph] = useState<Graph | null>(null);
  const graphRef = useRef<Graph | null>(null);

  // Mount once: rebuilding the Graph would drop selection, the viewport and
  // any gesture in progress.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    InternalEvent.disableContextMenu(host);
    const created = new Graph(host);
    const teardown = setup(created, host);
    graphRef.current = created;
    setGraph(created);
    return () => {
      teardown?.();
      created.destroy();
      graphRef.current = null;
      setGraph(null);
    };
    // The setup is fixed for the life of a canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { graph, graphRef };
}

/** The snap grid's switch: whether it is on, and a toggle that tells the graph. */
export function useGridToggle(graph: Graph | null, initial: boolean): [boolean, () => void] {
  const [enabled, setEnabled] = useState(initial);
  const toggle = useCallback(() => {
    setEnabled((on) => {
      const next = !on;
      graph?.setGridEnabled(next);
      return next;
    });
  }, [graph]);
  return [enabled, toggle];
}
