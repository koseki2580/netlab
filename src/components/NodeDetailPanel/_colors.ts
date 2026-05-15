import { getRequired } from '../../utils';

const VLAN_PALETTE = [
  '#38bdf8',
  '#f59e0b',
  '#22c55e',
  '#f97316',
  '#eab308',
  '#ef4444',
  '#14b8a6',
  '#a78bfa',
];

/**
 * Stable VLAN-id → palette color mapping. Same vid always returns the
 * same color across renders.
 */
export function vlanColor(vid: number): string {
  return getRequired(VLAN_PALETTE, Math.abs(vid) % VLAN_PALETTE.length, { vid });
}

export function stpRoleColor(role: 'ROOT' | 'DESIGNATED' | 'BLOCKED' | 'DISABLED'): string {
  switch (role) {
    case 'ROOT':
      return '#38bdf8';
    case 'DESIGNATED':
      return '#22c55e';
    case 'BLOCKED':
      return '#ef4444';
    case 'DISABLED':
      return '#94a3b8';
    default:
      return 'var(--netlab-text-primary)';
  }
}
