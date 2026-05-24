import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { NetlabAppShellStatus } from './NetlabAppShellV2';
import { STATUS_TONE_COLOR } from './shellStatusTones';

export interface CommandBarProps {
  scenarioId: string;
  scenarioLayer?: string;
  isPlaying: boolean;
  step: number;
  totalSteps?: number;
  status?: NetlabAppShellStatus;
  onPlay?: () => void;
  onPause?: () => void;
  onStep?: () => void;
  onReset?: () => void;
  onOpenPalette?: () => void;
  onExport?: () => void;
  extraActions?: React.ReactNode;
  overflowActions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function useObservedWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function iconButtonStyle(disabled?: boolean): React.CSSProperties {
  return {
    all: 'unset',
    width: 28,
    height: 28,
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    border: '1px solid var(--netlab-border)',
    color: disabled ? 'var(--netlab-text-faint)' : 'var(--netlab-text-secondary)',
    background: disabled ? 'transparent' : 'var(--netlab-bg-elevated)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'ui-monospace, monospace',
    fontSize: 13,
    lineHeight: 1,
    opacity: disabled ? 0.5 : 1,
  };
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 24,
        padding: '0 8px',
        borderRadius: 6,
        border: '1px solid var(--netlab-border)',
        color: 'var(--netlab-text-secondary)',
        background: 'var(--netlab-bg-elevated)',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function CommandBar({
  scenarioId,
  scenarioLayer,
  isPlaying,
  step,
  totalSteps,
  status,
  onPlay,
  onPause,
  onStep,
  onReset,
  onOpenPalette,
  onExport,
  extraActions,
  overflowActions,
  className,
  style,
}: CommandBarProps) {
  const { ref, width } = useObservedWidth();
  const [menuOpen, setMenuOpen] = useState(false);
  const hideSubline = width !== null && width < 1280;
  const hideTotal = width !== null && width < 1024;
  const collapseStatus = width !== null && width < 800;
  const normalizedStep = Math.max(0, step) + 1;
  const tone = status?.tone ?? 'idle';
  const toneColor = STATUS_TONE_COLOR[tone];
  const playLabel = isPlaying ? 'Pause' : 'Play';

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      data-netlab-command-bar=""
      style={{
        height: 40,
        minHeight: 40,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'nowrap',
        padding: '5px 8px',
        border: '1px solid var(--netlab-border)',
        borderRadius: 8,
        background: 'var(--netlab-bg-surface)',
        color: 'var(--netlab-text-primary)',
        fontFamily: 'ui-monospace, monospace',
        position: 'relative',
        overflow: 'visible',
        ...style,
      }}
    >
      <div
        style={{
          minWidth: 0,
          maxWidth: 280,
          display: 'flex',
          flexDirection: 'column',
          lineHeight: 1.1,
          flexShrink: 1,
        }}
      >
        <span
          style={{
            color: 'var(--netlab-text-primary)',
            fontSize: 11,
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          scenario://{scenarioId}
        </span>
        {!hideSubline && (
          <span
            data-netlab-command-bar-subline=""
            style={{
              color: 'var(--netlab-text-muted)',
              fontSize: 9,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {scenarioLayer ?? 'scenario'} controls
          </span>
        )}
      </div>

      <div
        aria-hidden="true"
        style={{ width: 1, height: 24, background: 'var(--netlab-border)' }}
      />

      <button
        type="button"
        aria-label={playLabel}
        title={playLabel}
        onClick={handlePlayPause}
        disabled={isPlaying ? !onPause : !onPlay}
        style={iconButtonStyle(isPlaying ? !onPause : !onPlay)}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button
        type="button"
        aria-label="Step"
        title="Step"
        onClick={onStep}
        disabled={!onStep}
        style={iconButtonStyle(!onStep)}
      >
        ⏭
      </button>
      <button
        type="button"
        aria-label="Reset"
        title="Reset"
        onClick={onReset}
        disabled={!onReset}
        style={iconButtonStyle(!onReset)}
      >
        ↺
      </button>

      <Chip>
        {String(normalizedStep).padStart(2, '0')}
        {totalSteps !== undefined && totalSteps > 0 && !hideTotal && (
          <span data-netlab-command-bar-total=""> / {String(totalSteps).padStart(2, '0')}</span>
        )}
      </Chip>

      <span
        data-netlab-command-bar-status=""
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 24,
          padding: collapseStatus ? '0 7px' : '0 8px',
          borderRadius: 6,
          border: `1px solid color-mix(in srgb, ${toneColor} 28%, var(--netlab-border))`,
          color: toneColor,
          background: `color-mix(in srgb, ${toneColor} 12%, transparent)`,
          fontSize: 10,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          data-netlab-command-bar-status-dot=""
          aria-hidden="true"
          style={{ width: 6, height: 6, borderRadius: '50%', background: toneColor }}
        />
        {!collapseStatus && (
          <span data-netlab-command-bar-status-label="">{status?.label ?? tone}</span>
        )}
      </span>

      {extraActions && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {extraActions}
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          aria-label="Open command palette"
          title="Open command palette"
          onClick={onOpenPalette}
          style={iconButtonStyle(false)}
        >
          ⌘K
        </button>
        <button
          type="button"
          aria-label="More actions"
          aria-expanded={menuOpen}
          title="More actions"
          onClick={() => setMenuOpen((value) => !value)}
          style={iconButtonStyle(false)}
        >
          ⋯
        </button>
        <button
          type="button"
          aria-label="Export PCAP"
          title="Export PCAP"
          onClick={onExport}
          disabled={!onExport}
          style={iconButtonStyle(!onExport)}
        >
          ⤓
        </button>
      </div>

      {menuOpen && (
        <div
          data-netlab-command-bar-menu=""
          style={{
            position: 'absolute',
            top: 38,
            right: 40,
            zIndex: 40,
            display: 'grid',
            gap: 4,
            minWidth: 150,
            padding: 8,
            borderRadius: 8,
            border: '1px solid var(--netlab-border)',
            background: 'var(--netlab-bg-panel, var(--netlab-bg-surface))',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.3)',
          }}
        >
          {overflowActions ?? (
            <>
              <Chip>Topology</Chip>
              <Chip>Inspect</Chip>
              <Chip>Sandbox</Chip>
            </>
          )}
        </div>
      )}
    </div>
  );
}
