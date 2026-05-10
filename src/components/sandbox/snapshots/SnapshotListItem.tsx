import { useI18n } from '../../../i18n';
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
  const { t } = useI18n();
  return (
    <li
      data-testid="snapshot-list-item"
      data-snapshot-state={orphaned ? 'orphaned' : 'active'}
      style={{ opacity: orphaned ? 0.55 : 1, marginBottom: 8 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong>{renderMarkdown(snapshot.name)}</strong>
        <span style={{ color: 'var(--netlab-text-muted)', fontSize: 10 }}>
          {t('sandbox.snapshots.item.edit')} {snapshot.editIndex}
        </span>
      </div>
      <div style={{ color: 'var(--netlab-text-muted)', fontSize: 10 }}>
        {t('sandbox.snapshots.item.createdStep')} {snapshot.createdAt}
        {orphaned ? ` · ${t('sandbox.snapshots.item.orphaned')}` : ''}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {orphaned ? null : <GoToSnapshotButton id={snapshot.id} name={snapshot.name} />}
        {orphaned ? null : (
          <button
            type="button"
            aria-pressed={compareSelected}
            aria-label={t('sandbox.snapshots.item.compare.label', { name: snapshot.name })}
            onClick={() => onCompare(snapshot)}
          >
            {t('sandbox.snapshots.item.compare.text')}
          </button>
        )}
        <button
          type="button"
          aria-label={t('sandbox.snapshots.item.rename.label', { name: snapshot.name })}
          onClick={() => onRename(snapshot)}
        >
          {t('sandbox.snapshots.item.rename.text')}
        </button>
        <button
          type="button"
          aria-label={t('sandbox.snapshots.item.delete.label', { name: snapshot.name })}
          onClick={() => onDelete(snapshot)}
        >
          {t('sandbox.snapshots.item.delete.text')}
        </button>
      </div>
    </li>
  );
}
