import { useI18n } from '../../../i18n';
import { getSandboxEditLabel } from '../../../sandbox/plugin/registry';
import { useSandbox } from '../../../sandbox/useSandbox';
import type { PluginEdit } from '../../../sandbox/plugin/types';
import type { Edit } from '../../../sandbox/edits';

function labelFor(edit: Edit): string {
  if (edit.kind.startsWith('plugin:')) {
    return getSandboxEditLabel(edit as PluginEdit) ?? edit.kind;
  }
  return edit.kind;
}

export function EditChainInspector({
  fromIndex,
  toIndex,
  diverged = false,
}: {
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly diverged?: boolean;
}) {
  const sandbox = useSandbox();
  const { t } = useI18n();

  if (diverged) {
    return <p>{t('sandbox.snapshots.chain.diverged')}</p>;
  }

  if (fromIndex > toIndex) {
    return <p>{t('sandbox.snapshots.chain.precedes')}</p>;
  }

  const edits = sandbox.session.backing.slice(fromIndex, toIndex);

  if (edits.length === 0) {
    return <p>{t('sandbox.snapshots.chain.empty')}</p>;
  }

  return (
    <section aria-label={t('sandbox.snapshots.chain.label')}>
      <h3 style={{ margin: '0 0 6px', fontSize: 13 }}>{t('sandbox.snapshots.chain.heading')}</h3>
      <ol style={{ margin: 0, paddingLeft: 18 }}>
        {edits.map((edit, index) => (
          <li key={`${fromIndex + index}-${edit.kind}`}>{labelFor(edit)}</li>
        ))}
      </ol>
    </section>
  );
}
