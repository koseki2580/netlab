import { useState } from 'react';
import type { NamedSnapshot } from '../../sandbox/snapshots/types';
import { useSandbox } from '../../sandbox/useSandbox';
import { AnnotationListPanel } from './annotations/AnnotationListPanel';
import { EditListItem } from './EditListItem';
import { buttonStyle } from './editors/editorStyles';
import { SnapshotCompareView } from './snapshots/SnapshotCompareView';
import { SnapshotListSection } from './snapshots/SnapshotListSection';

export function EditsTab() {
  const sandbox = useSandbox();
  const [annotationsOnly, setAnnotationsOnly] = useState(false);
  const [comparePair, setComparePair] = useState<{
    readonly left: NamedSnapshot;
    readonly right: NamedSnapshot;
  } | null>(null);
  const entries = annotationsOnly
    ? sandbox.session.backing.filter((edit) => edit.kind.startsWith('trace.annotate.'))
    : sandbox.session.backing;
  const activeCount = sandbox.session.head;

  const undoTo = (index: number) => {
    for (let cursor = sandbox.session.head; cursor > index; cursor -= 1) {
      sandbox.undo();
    }
  };

  const resetAll = () => {
    if (confirm(`This removes all ${activeCount} edits.`)) {
      sandbox.resetAll();
    }
  };

  return (
    <section aria-label="Sandbox edit history">
      {comparePair ? (
        <SnapshotCompareView
          snapshotA={comparePair.left}
          snapshotB={comparePair.right}
          onExit={() => setComparePair(null)}
        />
      ) : null}
      <header>
        <h3 style={{ margin: 0, fontSize: 13 }}>History</h3>
        <button
          type="button"
          aria-label="Reset all edits"
          disabled={activeCount === 0}
          onClick={resetAll}
          className="netlab-focus-ring"
          style={buttonStyle}
        >
          Reset all
        </button>
      </header>
      <label style={{ display: 'block', margin: '8px 0', fontSize: 11 }}>
        <input
          type="checkbox"
          checked={annotationsOnly}
          onChange={(event) => setAnnotationsOnly(event.currentTarget.checked)}
        />{' '}
        Show annotations only
      </label>

      {annotationsOnly ? <AnnotationListPanel /> : null}

      <SnapshotListSection onComparePair={(left, right) => setComparePair({ left, right })} />

      {entries.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--netlab-text-muted)', fontSize: 11 }}>No edits yet</p>
      ) : (
        <ol style={{ paddingLeft: 18, margin: 0 }}>
          {entries.map((edit, index) => (
            <EditListItem
              key={`${index}-${edit.kind}`}
              edit={edit}
              index={index}
              active={index < activeCount}
              onRevert={sandbox.revertAt}
              onUndoTo={undoTo}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
