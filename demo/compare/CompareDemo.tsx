import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { scenarioRegistry } from '../../src/scenarios';
import DemoShell from '../DemoShell';
import { readLearningLocale } from '../learning/learningLocale';
import { CompareShell } from './CompareShell';

/**
 * M4 — `/compare/:left/:right` route. Opens two scenarios side by side under a
 * shared timeline. The route is also the shareable deep link.
 */
export default function CompareDemo() {
  const { left, right } = useParams<{ left: string; right: string }>();
  // This component renders <DemoShell> itself, so its words sit outside the
  // shell's language context; read the learner's choice the way the shell does.
  const [locale] = useState(readLearningLocale);
  const t = (en: string, ja: string) => (locale === 'ja' ? ja : en);
  const leftScenario = left ? scenarioRegistry.get(left) : undefined;
  const rightScenario = right ? scenarioRegistry.get(right) : undefined;

  if (!left || !right || !leftScenario || !rightScenario) {
    return (
      <DemoShell title="Compare" desc="Open two scenarios side by side.">
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            height: '100%',
            color: 'var(--netlab-text-muted)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
          }}
        >
          {t(
            `Unknown compare pair: ${left ?? '?'} vs ${right ?? '?'}`,
            `比較する組み合わせが見つかりません: ${left ?? '?'} と ${right ?? '?'}`,
          )}
        </div>
      </DemoShell>
    );
  }

  return (
    <DemoShell
      title={`Compare: ${leftScenario.metadata.title} vs ${rightScenario.metadata.title}`}
      desc={t(
        'One shared timeline drives both scenarios — space plays, ← / → step.',
        '1 つのタイムラインで両方のシナリオを動かします。space で再生、← / → で 1 歩ずつ進みます。',
      )}
    >
      <CompareShell leftId={left} rightId={right} />
    </DemoShell>
  );
}
