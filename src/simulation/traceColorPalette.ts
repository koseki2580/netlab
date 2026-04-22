const TRACE_COLORS = [
  'var(--netlab-accent-cyan)',
  'var(--netlab-accent-orange)',
  '#4ade80',
  '#a78bfa',
  '#f472b6',
  '#facc15',
  '#38bdf8',
  '#fb7185',
] as const;

export function getTraceColor(index: number): string {
  return TRACE_COLORS[index % TRACE_COLORS.length] ?? TRACE_COLORS[0];
}
