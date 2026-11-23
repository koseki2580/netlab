// Theme accents only: fixed pastels tuned for the dark canvas (#4ade80,
// #facc15, #f472b6, #fb7185) all but vanished on the light one (REQ-424b).
const TRACE_COLORS = [
  'var(--netlab-accent-cyan)',
  'var(--netlab-accent-orange)',
  'var(--netlab-accent-green)',
  'var(--netlab-accent-purple)',
  'var(--netlab-accent-yellow)',
  'var(--netlab-accent-red)',
] as const;

export function getTraceColor(index: number): string {
  return TRACE_COLORS[index % TRACE_COLORS.length] ?? TRACE_COLORS[0];
}
