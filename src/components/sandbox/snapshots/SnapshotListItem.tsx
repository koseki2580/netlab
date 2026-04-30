import type { NamedSnapshot } from '../../../sandbox/snapshots/types';
import { renderMarkdown } from '../../../sandbox/annotations/markdown';
import { GoToSnapshotButton } from './GoToSnapshotButton';

interface SnapshotListItemProps {
  readonly snapshot: NamedSnapshot;
  readonly orphaned?: boolean;
  readonly compareSelected?: boolean;
  readonly onCompare: (snapshot: NamedSnapshot) => void;
  readonly onRename: (snapshot: NamedSnapshot) => void;
  readonly onDelete: (snapshot: NamedSnapshot) => void;
}

export function SnapshotListItem({
  snapshot,
  orphaned = false,
  compareSelected = false,
  onCompare,
  onRename,
  onDelete,
}: SnapshotListItemProps) {
  return (
    <li
      data-testid="snapshot-list-item"
      data-snapshot-state={orphaned ? 'orphaned' : 'active'}
      style={{ opacity: orphaned ? 0.55 : 1, marginBottom: 8 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong>{renderMarkdown(snapshot.name)}</strong>
        <span style={{ color: 'var(--netlab-text-muted)', fontSize: 10 }}>
          edit {snapshot.editIndex}
        </span>
      </div>
      <div style={{ color: 'var(--netlab-text-muted)', fontSize: 10 }}>
        created step {snapshot.createdAt}
        {orphaned ? ' · orphaned' : ''}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {orphaned ? null : <GoToSnapshotButton id={snapshot.id} name={snapshot.name} />}
        {orphaned ? null : (
          <button
            type="button"
            aria-pressed={compareSelected}
            aria-label={`Compare snapshot ${snapshot.name}`}
            onClick={() => onCompare(snapshot)}
          >
            Compare
          </button>
        )}
        <button
          type="button"
          aria-label={`Rename snapshot ${snapshot.name}`}
          onClick={() => onRename(snapshot)}
        >
          Rename
        </button>
        <button
          type="button"
          aria-label={`Delete snapshot ${snapshot.name}`}
          onClick={() => onDelete(snapshot)}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
