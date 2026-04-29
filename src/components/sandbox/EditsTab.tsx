import { useState } from 'react';
import { useSandbox } from '../../sandbox/useSandbox';
import { AnnotationListPanel } from './annotations/AnnotationListPanel';
import { EditListItem } from './EditListItem';
import { buttonStyle } from './editors/editorStyles';

export function EditsTab() {
  const sandbox = useSandbox();
  const [annotationsOnly, setAnnotationsOnly] = useState(false);
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
