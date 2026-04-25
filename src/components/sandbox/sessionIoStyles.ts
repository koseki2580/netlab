import type { CSSProperties } from 'react';

export const sessionIoButtonStyle: CSSProperties = {
  border: '1px solid var(--netlab-border)',
  borderRadius: 6,
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-primary)',
  padding: '3px 7px',
  fontFamily: 'monospace',
  fontSize: 11,
  cursor: 'pointer',
};

export const sessionIoPanelStyle: CSSProperties = {
  margin: '8px 12px 0',
  padding: 10,
  border: '1px solid var(--netlab-border)',
  borderRadius: 6,
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
  fontSize: 11,
  lineHeight: 1.5,
};
