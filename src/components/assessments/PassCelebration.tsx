export interface PassCelebrationProps {
  readonly onSubmit: () => void;
}

export function PassCelebration({ onSubmit }: PassCelebrationProps) {
  return (
    <section
      aria-label="Assessment passed"
      style={{
        marginTop: 12,
        border: '1px solid #22c55e',
        borderRadius: 8,
        background: 'rgba(34, 197, 94, 0.12)',
        padding: 10,
      }}
    >
      <div style={{ color: '#22c55e', fontSize: 12, fontWeight: 700 }}>Assessment passed</div>
      <p style={{ margin: '6px 0 0', color: 'var(--netlab-text-muted)', fontSize: 12 }}>
        Submit is available while the current sandbox state still satisfies the rubric.
      </p>
      <button
        type="button"
        onClick={onSubmit}
        className="netlab-focus-ring"
        style={{ marginTop: 8 }}
      >
        Submit
      </button>
    </section>
  );
}
