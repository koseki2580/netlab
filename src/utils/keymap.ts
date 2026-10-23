import { dispatchShortcut, type ShortcutHandlers } from '../keyboard/shortcuts';

/** What the global keys do; which key does what is `SHORTCUTS` (keyboard/shortcuts.ts). */
export type KeymapActions = ShortcutHandlers;

export interface InstallKeymapOptions {
  target?: Window;
}

export function installKeymap(
  actions: KeymapActions,
  { target = typeof window === 'undefined' ? undefined : window }: InstallKeymapOptions = {},
): () => void {
  if (!target) return () => {};
  const handler = (event: KeyboardEvent) => {
    dispatchShortcut(event, actions);
  };
  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}
