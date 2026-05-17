export interface KeymapActions {
  togglePalette?: () => void;
  openHelp?: () => void;
  closeOverlays?: () => void;
  playPause?: () => void;
  stepBackward?: (delta: number) => void;
  stepForward?: (delta: number) => void;
  jumpStart?: () => void;
  jumpEnd?: () => void;
}

export interface InstallKeymapOptions {
  target?: Window;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function installKeymap(
  actions: KeymapActions,
  { target = typeof window === 'undefined' ? undefined : window }: InstallKeymapOptions = {},
): () => void {
  if (!target) return () => {};

  function handler(event: KeyboardEvent) {
    if (isTypingTarget(event.target)) return;

    const key = event.key.toLowerCase();
    if ((event.metaKey || event.ctrlKey) && key === 'k' && actions.togglePalette) {
      event.preventDefault();
      actions.togglePalette();
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === '?' && actions.openHelp) {
      event.preventDefault();
      actions.openHelp();
      return;
    }
    if (event.key === 'Escape' && actions.closeOverlays) {
      event.preventDefault();
      actions.closeOverlays();
      return;
    }
    if (event.key === ' ' && actions.playPause) {
      event.preventDefault();
      actions.playPause();
      return;
    }
    if (event.key === 'ArrowLeft' && actions.stepBackward) {
      event.preventDefault();
      actions.stepBackward(event.shiftKey ? 5 : 1);
      return;
    }
    if (event.key === 'ArrowRight' && actions.stepForward) {
      event.preventDefault();
      actions.stepForward(event.shiftKey ? 5 : 1);
      return;
    }
    if (event.key === 'Home' && actions.jumpStart) {
      event.preventDefault();
      actions.jumpStart();
      return;
    }
    if (event.key === 'End' && actions.jumpEnd) {
      event.preventDefault();
      actions.jumpEnd();
    }
  }

  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}
