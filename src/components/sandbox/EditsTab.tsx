import { useSandbox } from '../../sandbox/useSandbox';
import { EditListItem } from './EditListItem';
import { buttonStyle } from './editors/editorStyles';

export function EditsTab() {
  const sandbox = useSandbox();
  const entries = sandbox.session.backing;
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
