import type React from 'react';
import { CommandBar, type CommandBarProps } from './CommandBar';

export type ShellStatusTone = 'idle' | 'ready' | 'running' | 'paused' | 'error';

export interface NetlabAppShellStatus {
  /** Short label such as `'running'` or `'ready'`. */
  label: string;
  tone: ShellStatusTone;
}

export interface NetlabAppShellV2Props extends CommandBarProps {
  statusLine?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Flow-v2 simulator shell: one-row command bar above a canvas-first frame.
 *
 * There is no ephemeral hint-pulse pill: the StatusLine is the durable
 * ambient-status surface (N5). Transient messages route through it rather than
 * a one-shot pulse that the learner has to catch.
 */
export function NetlabAppShellV2({
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
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>{children}</div>
        {statusLine && (
          <div data-netlab-shell-status-line="" style={{ flexShrink: 0 }}>
            {statusLine}
          </div>
        )}
      </section>
    </div>
  );
}
