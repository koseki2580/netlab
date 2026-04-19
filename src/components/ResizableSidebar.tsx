import React, { useCallback, useRef, useState } from 'react';

export interface ResizableSidebarProps {
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  /** Styles applied to the outer container (e.g. background, border). Do NOT include width. */
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * A right-side panel whose width is adjustable by dragging its left edge.
 *
 * Renders a thin drag handle on the left, followed by the children content.
 * The outer container has an explicit width and flexShrink: 0 so the adjacent
 * canvas area (flex: 1) fills remaining space correctly.
 */
export function ResizableSidebar({
  defaultWidth,
  minWidth = 150,
  maxWidth = 600,
  style,
  children,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [hovered, setHovered] = useState(false);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragState.current = { startX: e.clientX, startWidth: width };
      document.body.style.userSelect = 'none';

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragState.current) return;
        const delta = ev.clientX - dragState.current.startX;
        const next = dragState.current.startWidth - delta;
        setWidth(Math.min(maxWidth, Math.max(minWidth, next)));
      };

      const onMouseUp = () => {
        dragState.current = null;
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [width, minWidth, maxWidth],
  );

  return (
    <div
      style={{
        ...style,
        width,
        display: 'flex',
        flexDirection: 'row',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 4,
          flexShrink: 0,
          cursor: 'col-resize',
          background: hovered ? '#334155' : 'transparent',
          transition: 'background 0.15s',
        }}
      />
      {/* Content */}
      <div tabIndex={0} style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
