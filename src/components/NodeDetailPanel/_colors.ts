import { getRequired } from '../../utils';

const VLAN_PALETTE = [
  'var(--netlab-accent-cyan)',
  'var(--netlab-accent-orange)',
  'var(--netlab-accent-green)',
  'var(--netlab-accent-orange)',
  '#eab308',
  '#ef4444',
  '#14b8a6',
  'var(--netlab-accent-purple)',
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
      return 'var(--netlab-accent-cyan)';
    case 'DESIGNATED':
      return 'var(--netlab-accent-green)';
    case 'BLOCKED':
      return '#ef4444';
    case 'DISABLED':
      return 'var(--netlab-text-secondary)';
    default:
      return 'var(--netlab-text-primary)';
  }
}
