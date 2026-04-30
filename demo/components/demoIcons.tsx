import type { ReactNode } from 'react';

// Small inline SVG topology icons keyed by demo path.
// Falls back to the neutral node-cluster icon for unmapped paths.

const ICONS: Record<string, ReactNode> = {
  '/basic/minimal': (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="12" r="3" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  ),
  '/basic/three-tier': (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9.5" y="9" width="5" height="5" rx="1" />
      <rect x="17" y="9" width="5" height="5" rx="1" />
      <line x1="7" y1="11.5" x2="9.5" y2="11.5" />
      <line x1="14.5" y1="11.5" x2="17" y2="11.5" />
    </svg>
  ),
  '/basic/star': (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="20" cy="12" r="2" />
      <circle cx="12" cy="20" r="2" />
      <circle cx="4" cy="12" r="2" />
      <line x1="12" y1="6" x2="12" y2="10" />
      <line x1="14" y1="12" x2="18" y2="12" />
      <line x1="12" y1="14" x2="12" y2="18" />
      <line x1="6" y1="12" x2="10" y2="12" />
    </svg>
  ),
};

const NODE_CLUSTER_ICON: ReactNode = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <circle cx="12" cy="12" r="3" />
    <circle cx="5" cy="7" r="2" />
    <circle cx="19" cy="7" r="2" />
    <circle cx="5" cy="17" r="2" />
    <circle cx="19" cy="17" r="2" />
    <line x1="7" y1="8.5" x2="10" y2="10.5" />
    <line x1="17" y1="8.5" x2="14" y2="10.5" />
    <line x1="7" y1="15.5" x2="10" y2="13.5" />
    <line x1="17" y1="15.5" x2="14" y2="13.5" />
  </svg>
);

export function getDemoIcon(path: string): ReactNode {
  return ICONS[path] ?? NODE_CLUSTER_ICON;
}
