import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Props for the Modal component. Renders a portal dialog with backdrop, focus trap,
 * ESC-to-close, and optional footer action row.
 */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Default: true. Click outside closes. */
  closeOnBackdrop?: boolean;
  /** Right-aligned footer row. */
  footer?: ReactNode;
  /** Max-width of the panel. Default: 520. */
  maxWidth?: number;
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  closeOnBackdrop = true,
  footer,
  maxWidth = 520,
  children,
}: ModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleKey);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: 'var(--netlab-bg-surface)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 12,
          padding: 20,
          maxWidth,
          width: 'calc(100% - 32px)',
          maxHeight: 'calc(100vh - 64px)',
          overflow: 'auto',
          fontFamily: 'monospace',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <span
            id={titleId}
            style={{ fontSize: 14, fontWeight: 700, color: 'var(--netlab-text-primary)' }}
          >
            {title}
          </span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="netlab-focus-ring"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--netlab-text-secondary)',
              fontSize: 16,
              borderRadius: 4,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--netlab-text-primary)', lineHeight: 1.6 }}>
          {children}
        </div>

        {footer && (
          <div
            style={{
              borderTop: '1px solid var(--netlab-border)',
              paddingTop: 16,
              marginTop: 16,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
