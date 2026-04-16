/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FailureProvider,
  useFailure,
  useOptionalFailure,
  type FailureContextValue,
} from './FailureContext';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latestFailure: FailureContextValue | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function CaptureFailure() {
  latestFailure = useFailure();
  return null;
}

function OptionalOutsideConsumer() {
  return <div>{String(useOptionalFailure() === null)}</div>;
}

function RequiredOutsideConsumer() {
  useFailure();
  return null;
}

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(ui);
  });
}

function renderProvider() {
  render(
    <FailureProvider>
      <CaptureFailure />
    </FailureProvider>,
  );
}

function currentFailure() {
  if (!latestFailure) {
    throw new Error('Failure context was not captured');
  }

  return latestFailure;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  latestFailure = null;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  latestFailure = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  vi.restoreAllMocks();
});

describe('FailureProvider', () => {
  describe('toggleNode', () => {
    it('marks node as down after first toggle', () => {
      renderProvider();

      act(() => {
        currentFailure().toggleNode('n1');
      });

      expect(currentFailure().isNodeDown('n1')).toBe(true);
    });

    it('marks node as up after second toggle', () => {
      renderProvider();

      act(() => {
        currentFailure().toggleNode('n1');
        currentFailure().toggleNode('n1');
      });

      expect(currentFailure().isNodeDown('n1')).toBe(false);
    });

    it('toggles nodes independently', () => {
      renderProvider();

      act(() => {
        currentFailure().toggleNode('n1');
      });

      expect(currentFailure().isNodeDown('n1')).toBe(true);
      expect(currentFailure().isNodeDown('n2')).toBe(false);
    });
  });

  describe('toggleEdge', () => {
    it('marks edge as down after first toggle', () => {
      renderProvider();

      act(() => {
        currentFailure().toggleEdge('e1');
      });

      expect(currentFailure().isEdgeDown('e1')).toBe(true);
    });

    it('marks edge as up after second toggle', () => {
      renderProvider();

      act(() => {
        currentFailure().toggleEdge('e1');
        currentFailure().toggleEdge('e1');
      });

      expect(currentFailure().isEdgeDown('e1')).toBe(false);
    });
  });

  describe('toggleInterface', () => {
    it('marks interface as down after first toggle', () => {
      renderProvider();

      act(() => {
        currentFailure().toggleInterface('r1', 'eth0');
      });

      expect(currentFailure().isInterfaceDown('r1', 'eth0')).toBe(true);
    });

    it('marks interface as up after second toggle', () => {
      renderProvider();

      act(() => {
        currentFailure().toggleInterface('r1', 'eth0');
        currentFailure().toggleInterface('r1', 'eth0');
      });

      expect(currentFailure().isInterfaceDown('r1', 'eth0')).toBe(false);
    });
  });

  describe('resetFailures', () => {
    it('clears all failed nodes, edges, and interfaces', () => {
      renderProvider();

      act(() => {
        currentFailure().toggleNode('n1');
        currentFailure().toggleEdge('e1');
        currentFailure().toggleInterface('r1', 'eth0');
      });

      act(() => {
        currentFailure().resetFailures();
      });

      expect(currentFailure().failureState.downNodeIds.size).toBe(0);
      expect(currentFailure().failureState.downEdgeIds.size).toBe(0);
      expect(currentFailure().failureState.downInterfaceIds.size).toBe(0);
      expect(currentFailure().isNodeDown('n1')).toBe(false);
      expect(currentFailure().isEdgeDown('e1')).toBe(false);
      expect(currentFailure().isInterfaceDown('r1', 'eth0')).toBe(false);
    });
  });

  describe('isNodeDown / isEdgeDown / isInterfaceDown', () => {
    it('returns false for nodes not toggled down', () => {
      renderProvider();

      expect(currentFailure().isNodeDown('n1')).toBe(false);
      expect(currentFailure().isEdgeDown('e1')).toBe(false);
      expect(currentFailure().isInterfaceDown('r1', 'eth0')).toBe(false);
    });

    it('returns true for nodes toggled down', () => {
      renderProvider();

      act(() => {
        currentFailure().toggleNode('n1');
        currentFailure().toggleEdge('e1');
        currentFailure().toggleInterface('r1', 'eth0');
      });

      expect(currentFailure().isNodeDown('n1')).toBe(true);
      expect(currentFailure().isEdgeDown('e1')).toBe(true);
      expect(currentFailure().isInterfaceDown('r1', 'eth0')).toBe(true);
    });
  });

  describe('useFailure', () => {
    it('throws when used outside FailureProvider', () => {
      expect(() => renderToStaticMarkup(<RequiredOutsideConsumer />)).toThrow(
        '[netlab] useFailure must be used within <FailureProvider>',
      );
    });
  });

  describe('useOptionalFailure', () => {
    it('returns null when used outside FailureProvider', () => {
      expect(renderToStaticMarkup(<OptionalOutsideConsumer />)).toContain('true');
    });
  });
});
