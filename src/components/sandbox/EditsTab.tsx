import { useState } from 'react';
import { useI18n } from '../../i18n';
import type { NamedSnapshot } from '../../sandbox/snapshots/types';
import { useSandbox } from '../../sandbox/useSandbox';
import { AnnotationListPanel } from './annotations/AnnotationListPanel';
import { EditListItem } from './EditListItem';
import { buttonStyle } from './editors/editorStyles';
import { SnapshotCompareView } from './snapshots/SnapshotCompareView';
import { SnapshotListSection } from './snapshots/SnapshotListSection';

export function EditsTab() {
  const sandbox = useSandbox();
  const { t } = useI18n();
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
    if (confirm(t('sandbox.edits.resetAll.confirm', { count: activeCount }))) {
      sandbox.resetAll();
    }
  };

  return (
    <section aria-label={t('sandbox.edits.history.label')}>
      {comparePair ? (
        <SnapshotCompareView
          snapshotA={comparePair.left}
          snapshotB={comparePair.right}
          onExit={() => setComparePair(null)}
        />
      ) : null}
      <header>
        <h3 style={{ margin: 0, fontSize: 13 }}>{t('sandbox.edits.history.heading')}</h3>
        <button
          type="button"
          aria-label={t('sandbox.edits.resetAll.label')}
          disabled={activeCount === 0}
          onClick={resetAll}
          className="netlab-focus-ring"
          style={buttonStyle}
        >
          {t('sandbox.edits.resetAll.text')}
        </button>
      </header>
      <label style={{ display: 'block', margin: '8px 0', fontSize: 11 }}>
        <input
          type="checkbox"
          checked={annotationsOnly}
          onChange={(event) => setAnnotationsOnly(event.currentTarget.checked)}
        />{' '}
        {t('sandbox.edits.annotationsOnly')}
      </label>

      {annotationsOnly ? <AnnotationListPanel /> : null}

      <SnapshotListSection onComparePair={(left, right) => setComparePair({ left, right })} />

      {entries.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--netlab-text-muted)', fontSize: 11 }}>
          {t('sandbox.edits.empty')}
        </p>
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
