import { useRef } from 'react';

/**
 * Hook that increments a counter on every render.
 * Attach the return value to `data-render-count` for test assertions.
 */
export function useRenderCount(): number {
  const ref = useRef(0);
  ref.current += 1;
  return ref.current;
}
