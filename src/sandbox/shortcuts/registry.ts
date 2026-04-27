export interface ShortcutEntry {
  readonly key: string;
  readonly description: string;
  readonly action: () => void;
  readonly enabled?: () => boolean;
}

type Listener = () => void;

let entries: ShortcutEntry[] = [];
let listeners: Listener[] = [];

function notify() {
  for (const listener of listeners) listener();
}

export const shortcutRegistry = {
  register(entry: ShortcutEntry): () => void {
    entries = [...entries, entry];
    notify();
    return () => {
      entries = entries.filter((e) => e !== entry);
      notify();
    };
  },

  list(): readonly ShortcutEntry[] {
    return entries;
  },

  subscribe(listener: Listener): () => void {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  _reset(): void {
    entries = [];
    listeners = [];
  },
};
