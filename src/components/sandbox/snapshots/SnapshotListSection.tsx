import { useState } from 'react';
import { useI18n } from '../../../i18n';
import { useSandbox } from '../../../sandbox/useSandbox';
import { listActiveSnapshots, listOrphanedSnapshots } from '../../../sandbox/snapshots/registry';
import type { NamedSnapshot } from '../../../sandbox/snapshots/types';
import { SnapshotListItem } from './SnapshotListItem';

interface SnapshotListSectionProps {
  readonly onComparePair?: (left: NamedSnapshot, right: NamedSnapshot) => void;
}

export function SnapshotListSection({ onComparePair }: SnapshotListSectionProps) {
  const sandbox = useSandbox();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const [compareFrom, setCompareFrom] = useState<NamedSnapshot | null>(null);
  const currentSnapshot = sandbox.engine.snapshot;
  const active = currentSnapshot ? listActiveSnapshots(currentSnapshot) : [];
  const orphaned = currentSnapshot ? listOrphanedSnapshots(currentSnapshot) : [];

  const renameSnapshot = (snapshot: NamedSnapshot) => {
    const nextName = window.prompt(t('sandbox.snapshots.prompt.rename'), snapshot.name);
    if (!nextName || nextName === snapshot.name) return;
    sandbox.pushEdit({
      kind: 'snapshot.rename',
      id: snapshot.id,
      before: snapshot.name,
      after: nextName,
    });
  };

  const deleteSnapshot = (snapshot: NamedSnapshot) => {
    if (!window.confirm(t('sandbox.snapshots.prompt.delete', { name: snapshot.name }))) return;
    sandbox.pushEdit({ kind: 'snapshot.delete', id: snapshot.id, before: snapshot });
  };

  const compareSnapshot = (snapshot: NamedSnapshot) => {
    if (!compareFrom || compareFrom.id === snapshot.id) {
      setCompareFrom(snapshot);
      return;
    }

    onComparePair?.(compareFrom, snapshot);
    setCompareFrom(null);
  };

  return (
    <section aria-label={t('sandbox.snapshots.section.label')} style={{ marginBottom: 14 }}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        style={{
          width: '100%',
          textAlign: 'left',
          border: 0,
          background: 'transparent',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
          fontSize: 13,
          padding: '0 0 6px',
          cursor: 'pointer',
        }}
      >
        {t('sandbox.snapshots.section.heading', { count: active.length })}
      </button>

      {expanded ? (
        <>
          {active.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--netlab-text-muted)', fontSize: 11 }}>
              {t('sandbox.snapshots.section.empty')}
            </p>
          ) : (
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              {active.map((snapshot) => (
                <SnapshotListItem
                  key={snapshot.id}
                  snapshot={snapshot}
                  compareSelected={compareFrom?.id === snapshot.id}
                  onCompare={compareSnapshot}
                  onRename={renameSnapshot}
                  onDelete={deleteSnapshot}
                />
              ))}
            </ol>
          )}

          {orphaned.length > 0 ? (
            <section
              aria-label={t('sandbox.snapshots.section.orphaned.label')}
              style={{ marginTop: 8 }}
            >
              <h4 style={{ margin: '0 0 6px', fontSize: 11 }}>
                {t('sandbox.snapshots.section.orphaned.heading')}
              </h4>
              <ol style={{ paddingLeft: 18, margin: 0 }}>
                {orphaned.map((snapshot) => (
                  <SnapshotListItem
                    key={snapshot.id}
                    snapshot={snapshot}
                    orphaned
                    onCompare={compareSnapshot}
                    onRename={renameSnapshot}
                    onDelete={deleteSnapshot}
                  />
                ))}
              </ol>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
