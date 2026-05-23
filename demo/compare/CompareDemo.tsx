import { useParams } from 'react-router-dom';
import { scenarioRegistry } from '../../src/scenarios';
import DemoShell from '../DemoShell';
import { CompareShell } from './CompareShell';

/**
 * M4 — `/compare/:left/:right` route. Opens two scenarios side by side under a
 * shared timeline. The route is also the shareable deep link.
 */
export default function CompareDemo() {
  const { left, right } = useParams<{ left: string; right: string }>();
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
          Unknown compare pair: {left ?? '?'} vs {right ?? '?'}
        </div>
      </DemoShell>
    );
  }

  return (
    <DemoShell
      title={`Compare: ${leftScenario.metadata.title} vs ${rightScenario.metadata.title}`}
      desc="One shared timeline drives both scenarios — space plays, ← / → step."
    >
      <CompareShell leftId={left} rightId={right} />
    </DemoShell>
  );
}
