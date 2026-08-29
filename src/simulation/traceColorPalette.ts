const TRACE_COLORS = [
  'var(--netlab-accent-cyan)',
  'var(--netlab-accent-orange)',
  '#4ade80',
  'var(--netlab-accent-purple)',
  '#f472b6',
  '#facc15',
  'var(--netlab-accent-cyan)',
  '#fb7185',
] as const;

export function getTraceColor(index: number): string {
  return TRACE_COLORS[index % TRACE_COLORS.length] ?? TRACE_COLORS[0];
}
