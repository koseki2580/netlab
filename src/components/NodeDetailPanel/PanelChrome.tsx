import { CANVAS_LAYER } from '../canvasLayers';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { DP_NARROW_BREAKPOINT, type DpMode, type DpTab } from './useNodeDetailDock';

export type NodeRole = 'router' | 'switch' | 'client' | 'server' | string;

export interface ResolvedTarget {
  kind: 'node' | 'edge';
  role?: NodeRole;
}

export const TAB_LABELS: Record<DpTab, string> = {
  overview: 'Overview',
  ifaces: 'Interfaces',
  routes: 'Routes',
  arp: 'ARP / Services',
  acl: 'ACL',
  sandbox: 'Sandbox',
};

export function getVisibleTabs(target: ResolvedTarget, canEdit: boolean): DpTab[] {
  if (target.kind === 'edge') return ['overview'];
  const role = target.role;
  const tabs: DpTab[] = ['overview'];
  if (role === 'router' || role === 'switch' || role === 'client' || role === 'server') {
    if (role === 'router' || role === 'switch') tabs.push('ifaces');
  }
  if (role === 'router') tabs.push('routes');
  if (role === 'router' || role === 'switch') tabs.push('arp');
  if (role === 'router') tabs.push('acl');
  if (
    canEdit &&
    (role === 'router' || role === 'switch' || role === 'client' || role === 'server')
  ) {
    tabs.push('sandbox');
  }
  return tabs;
}

export function getDefaultTab(target: ResolvedTarget): DpTab {
  if (target.kind === 'edge') return 'overview';
  if (target.role === 'router' || target.role === 'switch') return 'ifaces';
  return 'overview';
}

export function getTabOrientation(width: number): 'row' | 'column' {
  return width < DP_NARROW_BREAKPOINT ? 'row' : 'column';
}

export function getPanelStyle(mode: DpMode, width: number, isNarrow = false): React.CSSProperties {
  // S1: on narrow viewports the panel is always a right-edge drawer, ignoring
  // the persisted dock mode — a pinned full-width panel makes no sense on a
  // phone. The drawer overlays the canvas and is dismissed via its backdrop.
  if (isNarrow) {
    return {
      width: 'min(420px, 100%)',
      height: '100%',
      background: 'var(--netlab-bg-panel)',
      color: 'var(--netlab-text-primary)',
      fontFamily: 'monospace',
      fontSize: 11,
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid var(--netlab-border-subtle)',
      pointerEvents: 'all',
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      zIndex: CANVAS_LAYER.devicePanel,
      boxShadow: '-16px 0 40px rgba(0, 0, 0, 0.35)',
    };
  }
  const isOverlay = mode === 'overlay';
  return {
    width: `${width}px`,
    height: '100%',
    background: isOverlay
      ? 'color-mix(in srgb, var(--netlab-bg-panel) 96%, transparent)'
      : 'var(--netlab-bg-panel)',
    color: 'var(--netlab-text-primary)',
    fontFamily: 'monospace',
    fontSize: 11,
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid var(--netlab-border-subtle)',
    pointerEvents: 'all',
    ...(isOverlay
      ? {
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: CANVAS_LAYER.devicePanel,
          boxShadow: '-16px 0 40px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }
      : {
          position: 'relative',
          flexShrink: 0,
        }),
  };
}

interface PanelHeaderProps {
  targetKind: ResolvedTarget['kind'];
  title: React.ReactNode;
  headerEyebrow: string;
  mode: DpMode;
  onToggleMode: () => void;
  onClose: () => void;
}

export function PanelHeader({
  targetKind,
  title,
  headerEyebrow,
  mode,
  onToggleMode,
  onClose,
}: PanelHeaderProps): JSX.Element {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderBottom: '1px solid var(--netlab-border-subtle)',
        background: 'color-mix(in srgb, var(--netlab-bg-surface) 50%, var(--netlab-bg-panel))',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 'bold',
            color: 'var(--netlab-text-secondary)',
            fontSize: 10,
            letterSpacing: 1,
          }}
        >
          {headerEyebrow}
        </div>
        <div
          style={{
            color: 'var(--netlab-text-primary)',
            fontWeight: 'bold',
            fontSize: 13,
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
      </div>
      {targetKind === 'node' && (
        <button
          type="button"
          data-netlab-dp-mode-toggle
          aria-pressed={mode === 'pinned'}
          title={mode === 'overlay' ? 'Pin panel (push canvas)' : 'Unpin (overlay canvas)'}
          onClick={onToggleMode}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 600,
            color: mode === 'pinned' ? 'var(--netlab-accent-cyan)' : 'var(--netlab-text-muted)',
            background:
              mode === 'pinned'
                ? 'color-mix(in srgb, var(--netlab-accent-cyan) 12%, transparent)'
                : 'transparent',
            border: '1px solid var(--netlab-border-subtle)',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          {mode === 'pinned' ? '⇤ Pinned' : '⇥ Pin'}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        data-testid="node-detail-close"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--netlab-text-muted)',
          cursor: 'pointer',
          fontSize: 14,
          padding: '0 4px',
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </header>
  );
}

interface LearnerExplainerCalloutProps {
  learnerKind: string | null;
  learnerCopy: string;
}

export function LearnerExplainerCallout({
  learnerKind,
  learnerCopy,
}: LearnerExplainerCalloutProps): JSX.Element {
  return (
    <div
      data-learner-explainer={learnerKind ?? ''}
      style={{
        margin: '8px 12px 0',
        padding: '8px 10px',
        borderRadius: 6,
        background: 'color-mix(in srgb, var(--netlab-accent-cyan) 10%, var(--netlab-bg-elevated))',
        border:
          '1px solid color-mix(in srgb, var(--netlab-accent-cyan) 22%, var(--netlab-border-subtle))',
        color: 'var(--netlab-text-secondary)',
        fontSize: 11,
        lineHeight: 1.5,
      }}
    >
      <span style={{ marginRight: 6 }} aria-hidden="true">
        💡
      </span>
      {learnerCopy}
    </div>
  );
}

interface ResizeHandleProps {
  currentWidth: number;
  onResize: (next: number) => void;
}

export function ResizeHandle({ currentWidth, onResize }: ResizeHandleProps): JSX.Element {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(currentWidth);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!draggingRef.current) return;
      const next = startWRef.current + (startXRef.current - event.clientX);
      onResize(next);
    };
    const up = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [onResize]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    startXRef.current = event.clientX;
    startWRef.current = currentWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      data-netlab-dp-resize-handle
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: -3,
        top: 0,
        bottom: 0,
        width: 6,
        cursor: 'col-resize',
        zIndex: CANVAS_LAYER.devicePanel,
        background: 'transparent',
      }}
    />
  );
}

interface TabNavProps {
  tabs: readonly DpTab[];
  activeTab: DpTab;
  orientation: 'row' | 'column';
  onSelect: (tab: DpTab) => void;
}

export function TabNav({ tabs, activeTab, orientation, onSelect }: TabNavProps): JSX.Element {
  const isColumn = orientation === 'column';
  return (
    <nav
      data-netlab-dp-nav
      data-dp-nav-orientation={orientation}
      style={{
        display: 'flex',
        flexDirection: isColumn ? 'column' : 'row',
        gap: 2,
        padding: isColumn ? '10px 8px' : '8px 10px',
        ...(isColumn
          ? {
              width: 140,
              borderRight: '1px solid var(--netlab-border-subtle)',
              overflowY: 'auto',
              flexShrink: 0,
            }
          : {
              width: '100%',
              borderBottom: '1px solid var(--netlab-border-subtle)',
              overflowX: 'auto',
            }),
        background: 'color-mix(in srgb, var(--netlab-bg-surface) 65%, var(--netlab-bg-panel))',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            data-netlab-dp-tab={tab}
            data-active={isActive ? 'true' : 'false'}
            aria-pressed={isActive}
            onClick={() => onSelect(tab)}
            style={{
              background: isActive ? 'var(--netlab-bg-elevated)' : 'transparent',
              color: isActive ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
              border: 'none',
              borderLeft: isColumn
                ? `2px solid ${isActive ? 'var(--netlab-accent-cyan)' : 'transparent'}`
                : 'none',
              borderBottom: isColumn
                ? 'none'
                : `2px solid ${isActive ? 'var(--netlab-accent-cyan)' : 'transparent'}`,
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 600,
              padding: isColumn ? '6px 10px' : '6px 12px',
              textAlign: 'left',
              whiteSpace: 'nowrap',
              letterSpacing: 0.3,
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </nav>
  );
}
