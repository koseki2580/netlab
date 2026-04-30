import { useCallback, useEffect, type RefObject } from 'react';
import { useOptionalReplay } from './recording/useReplay';
import { useSandbox } from './useSandbox';

function isEditableTarget(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  return Boolean(element.closest('input, textarea, select, [contenteditable="true"]'));
}

export function useUndoRedo(): {
  undo(): void;
  redo(): void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  resetAll(): void;
} {
  const sandbox = useSandbox();
  const replay = useOptionalReplay();
  const replayActive = replay?.isActive ?? false;

  const undo = useCallback(() => {
    if (replayActive) return;
    sandbox.undo();
  }, [replayActive, sandbox]);

  const redo = useCallback(() => {
    if (replayActive) return;
    sandbox.redo();
  }, [replayActive, sandbox]);

  return {
    undo,
    redo,
    canUndo: !replayActive && sandbox.session.canUndo(),
    canRedo: !replayActive && sandbox.session.canRedo(),
    resetAll: sandbox.resetAll,
  };
}

export function useSandboxShortcuts({
  enabled,
  rootRef,
  undo,
  redo,
}: {
  readonly enabled: boolean;
  readonly rootRef: RefObject<HTMLElement | null>;
  readonly undo: () => void;
  readonly redo: () => void;
}) {
  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== 'z' && event.key !== 'Z') || (!event.metaKey && !event.ctrlKey)) {
        return;
      }

      const activeElement = document.activeElement;
      const scope = rootRef.current;
      if (scope && activeElement && !scope.contains(activeElement)) {
        return;
      }

      if (isEditableTarget(activeElement)) {
        return;
      }

      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, redo, rootRef, undo]);
}
