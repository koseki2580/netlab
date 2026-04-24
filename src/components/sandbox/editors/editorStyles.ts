import type React from 'react';

export const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--netlab-border)',
  borderRadius: 6,
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-primary)',
  padding: '5px 7px',
  fontFamily: 'monospace',
  fontSize: 11,
} satisfies React.CSSProperties;

export const buttonStyle = {
  border: '1px solid var(--netlab-border)',
  borderRadius: 6,
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-primary)',
  padding: '5px 8px',
  fontFamily: 'monospace',
  fontSize: 11,
  cursor: 'pointer',
} satisfies React.CSSProperties;

export const sectionStyle = {
  display: 'grid',
  gap: 7,
  padding: '8px 0',
  borderTop: '1px solid var(--netlab-border)',
} satisfies React.CSSProperties;
