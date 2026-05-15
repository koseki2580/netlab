import type React from 'react';

/**
 * Shared CSSProperties tokens used by NodeDetailPanel sections.
 *
 * The leading underscore on the filename marks this as panel-private —
 * it's not exported from the package, only consumed by sibling section
 * files within the `NodeDetailPanel/` folder.
 */

export const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  top: 12,
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: '10px 14px',
  minWidth: 260,
  maxHeight: 360,
  overflowY: 'auto',
  color: 'var(--netlab-text-primary)',
  fontSize: 11,
  fontFamily: 'monospace',
  zIndex: 200,
  pointerEvents: 'all',
};

export const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 3,
};

export const SECTION_HEADER_STYLE: React.CSSProperties = {
  color: 'var(--netlab-text-secondary)',
  fontSize: 10,
  fontWeight: 'bold',
  letterSpacing: 1,
  margin: '10px 0 6px',
};

export const BADGE_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  border: '1px solid var(--netlab-border-subtle)',
  fontSize: 10,
  fontWeight: 'bold',
  letterSpacing: 0.4,
  padding: '2px 8px',
};

export const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-surface)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 4,
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
  fontSize: 11,
  padding: '3px 6px',
  width: 88,
};

export const FIELD_STACK_STYLE: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: 4,
};

export const FIELD_ERROR_STYLE: React.CSSProperties = {
  color: 'var(--netlab-accent-red)',
  fontSize: 10,
  lineHeight: 1.3,
};

export const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  width: 120,
};
