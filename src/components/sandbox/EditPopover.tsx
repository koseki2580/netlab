import { useEffect, useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { EdgeRef, InterfaceRef, NodeRef, PacketRef } from '../../sandbox/types';

type PopoverAnchor = PacketRef | NodeRef | InterfaceRef | EdgeRef;

export interface EditPopoverProps {
  readonly anchor: PopoverAnchor;
  readonly anchorElement: HTMLElement | null;
  readonly labelledBy: string;
  readonly onDismiss: () => void;
  readonly children: ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
  );
}

export function EditPopover({
  anchor,
  anchorElement,
  labelledBy,
  onDismiss,
  children,
}: EditPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const position = useMemo(() => {
    const rect = anchorElement?.getBoundingClientRect();
    if (!rect) {
      return { left: 16, top: 16 };
    }

    return {
      left: Math.max(8, rect.left + window.scrollX),
      top: Math.max(8, rect.bottom + window.scrollY + 8),
    };
  }, [anchorElement]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (popoverRef.current?.contains(target)) return;
      if (anchorElement?.contains(target)) return;
      onDismiss();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [anchorElement, onDismiss]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !popoverRef.current) {
      return;
    }

    const focusable = getFocusable(popoverRef.current);
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={labelledBy}
      data-anchor-kind={anchor.kind}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        zIndex: 30,
        minWidth: 240,
        maxWidth: 360,
        padding: 12,
        borderRadius: 10,
        border: '1px solid var(--netlab-border)',
        background: 'var(--netlab-bg-primary)',
        color: 'var(--netlab-text-primary)',
        boxShadow: '0 18px 48px rgba(2, 6, 23, 0.4)',
        fontFamily: 'monospace',
      }}
    >
      {children}
    </div>
  );
}
