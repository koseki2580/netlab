import { createContext, useContext } from 'react';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface ToastInput {
  kind?: ToastKind;
  title: string;
  description?: string;
  /** ms; 0 = sticky. Default 4500. */
  duration?: number;
}

export interface ToastApi {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const KIND_ACCENT: Record<ToastKind, string> = {
  info: 'var(--netlab-accent-cyan)',
  success: 'var(--netlab-accent-green)',
  warning: 'var(--netlab-accent-yellow)',
  error: 'var(--netlab-accent-red)',
};

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string | undefined;
  duration: number;
}

export function ToastItemView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--netlab-bg-panel)',
        border: `1px solid ${KIND_ACCENT[item.kind]}`,
        borderRadius: 8,
        padding: '10px 12px',
        fontFamily: 'monospace',
        fontSize: 11,
        color: 'var(--netlab-text-primary)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        pointerEvents: 'all',
        minWidth: 240,
        maxWidth: 360,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: KIND_ACCENT[item.kind],
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>{item.title}</div>
        {item.description && (
          <div style={{ color: 'var(--netlab-text-secondary)', marginTop: 2 }}>
            {item.description}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--netlab-text-muted)',
          fontSize: 14,
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
