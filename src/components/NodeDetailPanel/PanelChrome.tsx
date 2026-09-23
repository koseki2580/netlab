import { CANVAS_LAYER } from '../canvasLayers';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n/useI18n';
import './panelChrome.css';
import {
  DP_MAX_WIDTH,
  DP_MIN_WIDTH,
  DP_NARROW_BREAKPOINT,
  type DpMode,
  type DpTab,
} from './useNodeDetailDock';

/** How far one arrow-key press moves the panel edge. */
const RESIZE_KEY_STEP = 16;

export type NodeRole = 'router' | 'switch' | 'client' | 'server' | string;

export interface ResolvedTarget {
  kind: 'node' | 'edge';
  role?: NodeRole;
}

export const TAB_LABEL_KEYS: Record<DpTab, string> = {
  overview: 'simulation.nodeDetail.tab.overview',
  ifaces: 'simulation.nodeDetail.tab.interfaces',
  routes: 'simulation.nodeDetail.tab.routes',
  arp: 'simulation.nodeDetail.tab.arpServices',
  acl: 'simulation.nodeDetail.tab.acl',
  sandbox: 'simulation.nodeDetail.tab.sandbox',
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
  // No ACL tab: it only ever said it was not wired to the simulation yet, and
  // a tab that holds nothing is one more thing for a learner to open for
  // nothing. `AclTab` stays, so showing it again is this one line.
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
          // Pinned is opaque and stays put, but it is still positioned inside
          // the canvas: its host is a block, so a `relative` panel stacked
          // below a full-height canvas and left the viewport altogether — and
          // the mode is remembered, so every later device click did nothing.
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: CANVAS_LAYER.devicePanel,
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
  const { t } = useI18n();
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
          title={
            mode === 'overlay'
              ? t('simulation.nodeDetail.pinTitle')
              : t('simulation.nodeDetail.unpinTitle')
          }
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
          {mode === 'pinned' ? t('simulation.nodeDetail.pinned') : t('simulation.nodeDetail.pin')}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label={t('simulation.nodeDetail.close')}
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
  const { t } = useI18n();
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

  // The panel grows leftward, so the left arrow widens it.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') onResize(currentWidth + RESIZE_KEY_STEP);
    else if (event.key === 'ArrowRight') onResize(currentWidth - RESIZE_KEY_STEP);
    else return;
    event.preventDefault();
  };

  // A real separator that could not be seen: the grip (panelChrome.css) shows
  // on hover and on keyboard focus, which is also when it can be used.
  return (
    <div
      data-netlab-dp-resize-handle
      className="netlab-dp-resize-handle"
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={t('simulation.nodeDetail.resize')}
      aria-valuenow={currentWidth}
      aria-valuemin={DP_MIN_WIDTH}
      aria-valuemax={DP_MAX_WIDTH}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        left: -4,
        top: 0,
        bottom: 0,
        width: 8,
        cursor: 'col-resize',
        zIndex: CANVAS_LAYER.devicePanel,
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
  const { t } = useI18n();
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
            {t(TAB_LABEL_KEYS[tab])}
          </button>
        );
      })}
    </nav>
  );
}
