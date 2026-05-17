import type React from 'react';
import { CommandBar, type CommandBarProps } from './CommandBar';

export interface NetlabAppShellV2Props extends CommandBarProps {
  hint?: React.ReactNode;
  statusLine?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Flow-v2 simulator shell: one-row command bar above a canvas-first frame.
 * The legacy `NetlabAppShell` remains available for existing four-zone
 * toolbar consumers while new scenes migrate here.
 */
export function NetlabAppShellV2({
  hint,
  statusLine,
  className,
  style,
  children,
  ...commandBarProps
}: NetlabAppShellV2Props) {
  return (
    <div
      className={className}
      data-netlab-app-shell-v2=""
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 'var(--netlab-pad, 14px)',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        background: 'var(--netlab-bg-primary)',
        color: 'var(--netlab-text-primary)',
        ...style,
      }}
    >
      <CommandBar {...commandBarProps} />
      <section
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          border: '1px solid var(--netlab-border)',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--netlab-bg-primary)',
        }}
      >
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {children}
          {hint && (
            <div
              className="netlab-hint-pulse"
              data-netlab-shell-hint=""
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                padding: '6px 10px',
                borderRadius: 999,
                background:
                  'color-mix(in srgb, var(--netlab-accent-cyan) 14%, var(--netlab-bg-surface))',
                border:
                  '1px solid color-mix(in srgb, var(--netlab-accent-cyan) 30%, var(--netlab-border))',
                color: 'var(--netlab-accent-cyan)',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {hint}
            </div>
          )}
        </div>
        {statusLine && (
          <div data-netlab-shell-status-line="" style={{ flexShrink: 0 }}>
            {statusLine}
          </div>
        )}
      </section>
    </div>
  );
}
