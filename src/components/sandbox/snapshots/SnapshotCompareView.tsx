import type { NamedSnapshot } from '../../../sandbox/snapshots/types';
import { BeforeAfterView } from '../BeforeAfterView';
import { EditChainInspector } from './EditChainInspector';

export function SnapshotCompareView({
  snapshotA,
  snapshotB,
  onExit,
}: {
  readonly snapshotA: NamedSnapshot;
  readonly snapshotB: NamedSnapshot;
  readonly onExit: () => void;
}) {
  const diverged = snapshotA.sessionIdAtCapture !== snapshotB.sessionIdAtCapture;

  return (
    <div
      data-testid="snapshot-compare-view"
      role="dialog"
      aria-label="Compare snapshots"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--netlab-bg-primary)',
      }}
    >
      <header style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8 }}>
        <h2 style={{ margin: 0, fontSize: 14, flex: 1 }}>
          {snapshotA.name} vs {snapshotB.name}
        </h2>
        <button type="button" aria-label="Close snapshot compare" onClick={onExit}>
          Close
        </button>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <BeforeAfterView snapshotPair={{ left: snapshotA, right: snapshotB }} />
      </div>
      <div style={{ padding: 8, borderTop: '1px solid var(--netlab-border)' }}>
        <EditChainInspector
          fromIndex={snapshotA.editIndex}
          toIndex={snapshotB.editIndex}
          diverged={diverged}
        />
      </div>
    </div>
  );
}
