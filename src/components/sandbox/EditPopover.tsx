import { CANVAS_LAYER } from '../canvasLayers';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
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

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 8;

function initialPosition(anchorElement: HTMLElement | null): { left: number; top: number } {
  const rect = anchorElement?.getBoundingClientRect();
  if (!rect) return { left: 16, top: 16 };
  return {
    left: Math.max(VIEWPORT_MARGIN, rect.left + window.scrollX),
    top: Math.max(VIEWPORT_MARGIN, rect.bottom + window.scrollY + ANCHOR_GAP),
  };
}

/**
 * Where the popover goes, in its offset parent's coordinates, so that the
 * whole box lies inside the viewport.
 */
function placePopover(
  anchorElement: HTMLElement | null,
  popover: HTMLElement,
): { left: number; top: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const rect = anchorElement?.getBoundingClientRect();
  const height = Math.min(popover.offsetHeight, viewportHeight - VIEWPORT_MARGIN * 2);
  const width = popover.offsetWidth;

  let top: number;
  let left: number;
  if (!rect) {
    top = 16;
    left = 16;
  } else {
    const below = rect.bottom + ANCHOR_GAP;
    const above = rect.top - ANCHOR_GAP - height;
    if (below + height <= viewportHeight - VIEWPORT_MARGIN) top = below;
    else if (above >= VIEWPORT_MARGIN) top = above;
    else top = viewportHeight - VIEWPORT_MARGIN - height;
    left = rect.left;
  }
  top = Math.max(VIEWPORT_MARGIN, top);
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, viewportWidth - VIEWPORT_MARGIN - width));

  // `position: absolute` is measured from the offset parent, not the viewport.
  const parent = popover.offsetParent;
  if (parent instanceof HTMLElement && parent !== document.body) {
    const parentRect = parent.getBoundingClientRect();
    return {
      left: left - parentRect.left + parent.scrollLeft,
      top: top - parentRect.top + parent.scrollTop,
    };
  }
  return { left: left + window.scrollX, top: top + window.scrollY };
}

export function EditPopover({
  anchor,
  anchorElement,
  labelledBy,
  onDismiss,
  children,
}: EditPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(() => initialPosition(anchorElement));

  // The editor for a router is taller than many windows. Keep it inside the
  // viewport: open below the pointer when it fits, above when that fits
  // better, and otherwise pin it to the window with its own scroll.
  useLayoutEffect(() => {
    const popover = popoverRef.current;
    if (!popover || typeof window === 'undefined') return;
    const next = placePopover(anchorElement, popover);
    setPosition((current) =>
      current.left === next.left && current.top === next.top ? current : next,
    );
  }, [anchorElement, children]);

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
      data-testid="sandbox-edit-popover"
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        zIndex: CANVAS_LAYER.editPopover,
        minWidth: 240,
        maxWidth: 360,
        maxHeight: `calc(100vh - ${VIEWPORT_MARGIN * 2}px)`,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        boxSizing: 'border-box',
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
