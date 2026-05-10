import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { hookEngine } from '../../hooks/HookEngine';
import { useI18n } from '../../i18n';
import { useSandboxIntro } from '../../sandbox/intro/useSandboxIntro';

const CARD_STYLE: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.96)',
  border: '1px solid #334155',
  borderRadius: 14,
  color: '#e2e8f0',
  fontFamily: 'monospace',
  maxWidth: 360,
  padding: 16,
  boxShadow: '0 16px 40px rgba(2, 6, 23, 0.45)',
};

const MUTED_STYLE: CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
  lineHeight: 1.5,
};

function buttonStyle(background: string): CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid transparent',
    background,
    color: '#f8fafc',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
  };
}

function introKey(introId: string, slot: 'title' | 'summary'): string {
  return `sandbox.intro.${introId.replace(/^sandbox-intro-/, '')}.${slot}`;
}

function stepKey(introId: string, stepId: string, slot: 'title' | 'description'): string {
  const normalizedIntro = introId.replace(/^sandbox-intro-/, '');
  const normalizedStep = stepId.replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase());
  return `sandbox.intro.${normalizedIntro}.step.${normalizedStep}.${slot}`;
}

export function SandboxIntroOverlay() {
  const intro = useSandboxIntro();
  const { t } = useI18n();
  const [undoBlocked, setUndoBlocked] = useState(false);

  useEffect(() => {
    return hookEngine.on('sandbox:undo-blocked', async (_payload, next) => {
      setUndoBlocked(true);
      window.setTimeout(() => setUndoBlocked(false), 1800);
      await next();
    });
  }, []);

  if (intro.status === 'passed' || intro.status === 'exited') {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="netlab-sandbox-intro-title"
      data-testid="sandbox-intro-overlay"
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 150,
        pointerEvents: 'none',
      }}
    >
      <section
        data-testid="sandbox-intro-step-panel"
        data-intro-status={intro.status}
        style={{ ...CARD_STYLE, pointerEvents: 'auto' }}
      >
        <div style={{ color: '#38bdf8', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
          {t('sandbox.intro.chrome.label')}
        </div>
        <h2 id="netlab-sandbox-intro-title" style={{ margin: '10px 0 0', fontSize: 20 }}>
          {intro.status === 'pending'
            ? t(introKey(intro.intro.id, 'title'))
            : intro.currentStep
              ? t(stepKey(intro.intro.id, intro.currentStep.id, 'title'))
              : t(introKey(intro.intro.id, 'title'))}
        </h2>
        <p style={{ ...MUTED_STYLE, margin: '8px 0 0' }}>
          {intro.status === 'pending'
            ? t(introKey(intro.intro.id, 'summary'))
            : intro.currentStep
              ? t(stepKey(intro.intro.id, intro.currentStep.id, 'description'))
              : t(introKey(intro.intro.id, 'summary'))}
        </p>
        <p style={{ ...MUTED_STYLE, margin: '12px 0 0' }}>
          {t('sandbox.intro.progress', {
            current: Math.min(intro.currentStepIndex + 1, intro.totalSteps),
            total: intro.totalSteps,
          })}
        </p>
        {undoBlocked ? (
          <p role="status" style={{ ...MUTED_STYLE, margin: '10px 0 0' }}>
            {t('sandbox.intro.undoBlocked')}
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {intro.status === 'pending' ? (
            <button type="button" onClick={intro.start} style={buttonStyle('#1d4ed8')}>
              {t('sandbox.intro.start')}
            </button>
          ) : (
            <button type="button" onClick={intro.restart} style={buttonStyle('#1d4ed8')}>
              {t('sandbox.intro.restart')}
            </button>
          )}
          <button type="button" onClick={intro.skip} style={buttonStyle('#334155')}>
            {t('sandbox.intro.skip')}
          </button>
        </div>
      </section>
    </div>
  );
}
