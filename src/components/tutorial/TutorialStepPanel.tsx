import { useMemo, type CSSProperties } from 'react';
import { useTutorialRunner } from '../../tutorials';

const CARD_STYLE: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.96)',
  border: '1px solid var(--netlab-border)',
  borderRadius: 14,
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
  maxWidth: 360,
  padding: 16,
  boxShadow: '0 16px 40px color-mix(in srgb, var(--netlab-bg-primary) 45%, transparent)',
};

const MUTED_STYLE: CSSProperties = {
  color: 'var(--netlab-text-secondary)',
  fontSize: 12,
  lineHeight: 1.5,
};

function renderDescription(description: string) {
  return description.split('\n').map((line, index) => (
    <p key={`${line}-${index}`} style={{ margin: index === 0 ? '8px 0 0' : '6px 0 0' }}>
      {line}
    </p>
  ));
}

export function TutorialStepPanel() {
  const { tutorial, state, start, exit, restart } = useTutorialRunner();
  const currentStep = tutorial.steps[state.currentStepIndex] ?? null;
  const progressLabel = useMemo(
    () =>
      `Step ${Math.min(state.currentStepIndex + 1, tutorial.steps.length)} / ${tutorial.steps.length}`,
    [state.currentStepIndex, tutorial.steps.length],
  );

  if (state.status === 'exited') {
    return (
      <section data-testid="tutorial-step-panel" data-tutorial-status="exited" style={CARD_STYLE}>
        <div id="netlab-tutorial-title" style={{ color: '#f8fafc', fontWeight: 700 }}>
          {tutorial.title}
        </div>
        <p style={{ ...MUTED_STYLE, margin: '8px 0 0' }}>
          Tutorial dismissed. Reopen it whenever you want to continue.
        </p>
        <button type="button" onClick={restart} style={buttonStyle('#1d4ed8', '#f8fafc')}>
          Reopen Tutorial
        </button>
      </section>
    );
  }

  if (state.status === 'pending') {
    return (
      <section data-testid="tutorial-step-panel" data-tutorial-status="pending" style={CARD_STYLE}>
        <div
          style={{
            color: 'var(--netlab-accent-cyan)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
          }}
        >
          GUIDED TUTORIAL
        </div>
        <h2 id="netlab-tutorial-title" style={{ margin: '10px 0 0', fontSize: 20 }}>
          {tutorial.title}
        </h2>
        <p style={{ ...MUTED_STYLE, margin: '8px 0 0' }}>{tutorial.summary}</p>
        <p style={{ ...MUTED_STYLE, margin: '12px 0 0' }}>{progressLabel}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            type="button"
            data-testid="tutorial-start"
            onClick={start}
            style={buttonStyle('#1d4ed8', '#f8fafc')}
          >
            Start Tutorial
          </button>
          <button
            type="button"
            onClick={exit}
            style={buttonStyle('var(--netlab-border)', '#f8fafc')}
          >
            Dismiss
          </button>
        </div>
      </section>
    );
  }

  if (state.status === 'passed') {
    return (
      <section data-testid="tutorial-step-panel" data-tutorial-status="passed" style={CARD_STYLE}>
        <div
          style={{
            color: 'var(--netlab-accent-green)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
          }}
        >
          DONE
        </div>
        <h2 id="netlab-tutorial-title" style={{ margin: '10px 0 0', fontSize: 20 }}>
          {tutorial.title}
        </h2>
        <p style={{ ...MUTED_STYLE, margin: '8px 0 0' }}>
          All {tutorial.steps.length} steps passed. Restart to walk through it again.
        </p>
        {/* One action can satisfy several steps at once — the ARP tutorial's
            three predicates are all true the moment the first packet lands — so
            the later steps are never shown as anything to look for. Listing
            them here keeps what they were teaching. */}
        <ul
          data-testid="tutorial-observed"
          style={{ ...MUTED_STYLE, margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.7 }}
        >
          {tutorial.steps.map((observed) => (
            <li key={observed.id}>{observed.title}</li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={restart} style={buttonStyle('#166534', '#f8fafc')}>
            Restart
          </button>
          <button
            type="button"
            onClick={exit}
            style={buttonStyle('var(--netlab-border)', '#f8fafc')}
          >
            Close
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="tutorial-step-panel"
      data-tutorial-status={state.status}
      style={CARD_STYLE}
    >
      <div
        style={{
          color: 'var(--netlab-accent-cyan)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        {progressLabel}
      </div>
      <h2 id="netlab-tutorial-title" style={{ margin: '10px 0 0', fontSize: 18 }}>
        {currentStep?.title ?? tutorial.title}
      </h2>
      <div style={MUTED_STYLE}>
        {currentStep ? renderDescription(currentStep.description) : tutorial.summary}
      </div>
      {state.status === 'failed' && state.lastHint ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            border: '1px solid var(--netlab-accent-orange)',
            background: 'rgba(120, 53, 15, 0.25)',
            color: '#fef3c7',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          Hint: {state.lastHint}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {state.status === 'failed' ? (
          <button type="button" onClick={restart} style={buttonStyle('#92400e', '#f8fafc')}>
            Restart Step Flow
          </button>
        ) : null}
        <button type="button" onClick={exit} style={buttonStyle('var(--netlab-border)', '#f8fafc')}>
          Exit Tutorial
        </button>
      </div>
    </section>
  );
}

function buttonStyle(background: string, color: string): CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid transparent',
    background,
    color,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
  };
}
