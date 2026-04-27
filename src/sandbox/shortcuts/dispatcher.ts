import { shortcutRegistry } from './registry';

function isEditableTarget(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  return Boolean(element.closest('input, textarea, select, [contenteditable="true"]'));
}

function normalizeKey(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push('Cmd');
  if (event.shiftKey) parts.push('Shift');
  if (event.key.length === 1) {
    parts.push(event.key.toUpperCase());
  } else {
    parts.push(event.key);
  }
  return parts.join('+');
}

export function createShortcutDispatcher(): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (isEditableTarget(document.activeElement)) return;

    const normalized = normalizeKey(event);

    for (const entry of shortcutRegistry.list()) {
      if (entry.key !== normalized) continue;
      if (entry.enabled && !entry.enabled()) continue;
      event.preventDefault();
      entry.action();
      return;
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
