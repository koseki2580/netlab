/**
 * R09 R5 — Toast event bus.
 *
 * A module-scoped singleton: emit a toast from anywhere via the `toast` helper,
 * and the single mounted `<ToastViewport>` renders it. Toasts are ephemeral —
 * never persisted across reloads. Each emit also dispatches a
 * `netlab:toast-emit` window event so the StatusLine can briefly mirror the
 * latest message.
 */

export type ToastLevel = 'info' | 'success' | 'warn' | 'error';

export interface ToastOpts {
  /** Override auto-dismiss; errors are sticky by default. */
  sticky?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastEntry {
  id: string;
  level: ToastLevel;
  message: string;
  sticky: boolean;
  actionLabel?: string;
  onAction?: () => void;
  createdAt: number;
}

/** Auto-dismiss in ms; 0 = sticky (manual dismiss only). */
export const DEFAULT_TTL: Record<ToastLevel, number> = {
  info: 4000,
  success: 4000,
  warn: 6000,
  error: 0,
};

export const TOAST_EMIT_EVENT = 'netlab:toast-emit';

export interface ToastEmitDetail {
  id: string;
  level: ToastLevel;
  message: string;
}

type Listener = (entries: ToastEntry[]) => void;

class ToastBusClass {
  private entries: ToastEntry[] = [];
  private listeners = new Set<Listener>();
  private idCounter = 0;
  private timers = new Map<string, number>();

  emit(level: ToastLevel, message: string, opts: ToastOpts = {}): string {
    const id = `t${++this.idCounter}`;
    const sticky = opts.sticky ?? DEFAULT_TTL[level] === 0;
    const entry: ToastEntry = {
      id,
      level,
      message,
      sticky,
      createdAt: Date.now(),
      ...(opts.actionLabel !== undefined ? { actionLabel: opts.actionLabel } : {}),
      ...(opts.onAction !== undefined ? { onAction: opts.onAction } : {}),
    };
    this.entries = [...this.entries, entry];
    this.notify();
    if (!sticky && typeof window !== 'undefined') {
      const t = window.setTimeout(() => this.dismiss(id), DEFAULT_TTL[level]);
      this.timers.set(id, t);
    }
    if (typeof window !== 'undefined') {
      const detail: ToastEmitDetail = { id, level, message };
      window.dispatchEvent(new CustomEvent(TOAST_EMIT_EVENT, { detail }));
    }
    return id;
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer !== undefined && typeof window !== 'undefined') window.clearTimeout(timer);
    this.timers.delete(id);
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.id !== id);
    if (this.entries.length !== before) this.notify();
  }

  /** Dismiss the most-recently emitted non-sticky toast (for the Esc handler). */
  dismissTopNonSticky(): void {
    const top = [...this.entries].reverse().find((e) => !e.sticky);
    if (top) this.dismiss(top.id);
  }

  list(): readonly ToastEntry[] {
    return this.entries;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    l(this.entries);
    return () => {
      this.listeners.delete(l);
    };
  }

  /** Test-only: clear all entries, timers, and listeners. */
  _reset(): void {
    if (typeof window !== 'undefined') {
      for (const t of this.timers.values()) window.clearTimeout(t);
    }
    this.timers.clear();
    this.entries = [];
    this.idCounter = 0;
    this.listeners.clear();
  }

  private notify() {
    for (const l of this.listeners) l(this.entries);
  }
}

export const ToastBus = new ToastBusClass();

export const toast = {
  info: (message: string, opts?: ToastOpts) => ToastBus.emit('info', message, opts),
  success: (message: string, opts?: ToastOpts) => ToastBus.emit('success', message, opts),
  warn: (message: string, opts?: ToastOpts) => ToastBus.emit('warn', message, opts),
  error: (message: string, opts?: ToastOpts) => ToastBus.emit('error', message, opts),
  dismiss: (id: string) => ToastBus.dismiss(id),
};
