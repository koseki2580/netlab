import { useI18n } from '../../i18n';
import type { Edit } from '../../sandbox/edits';
import { getSandboxEditLabel } from '../../sandbox/plugin/registry';
import type { PluginEdit } from '../../sandbox/plugin/types';

export interface EditListItemProps {
  readonly edit: Edit;
  readonly index: number;
  readonly active: boolean;
  readonly onRevert: (index: number) => void;
  readonly onUndoTo: (index: number) => void;
}

function editSubtitle(edit: Edit): string {
  if (edit.kind.startsWith('plugin:')) {
    const pluginEdit = edit as PluginEdit;
    return getSandboxEditLabel(pluginEdit) ?? pluginEdit.kind;
  }

  switch (edit.kind) {
    case 'packet.header':
      return `${edit.fieldPath}: ${edit.before} -> ${edit.after}`;
    case 'param.set':
      return `${edit.key}: ${edit.before} -> ${edit.after}`;
    case 'interface.mtu':
      return `${edit.target.nodeId}/${edit.target.ifaceId}: ${edit.before} -> ${edit.after}`;
    case 'traffic.launch':
      return `${edit.flow.protocol} ${edit.flow.srcNodeId} -> ${edit.flow.dstNodeId}`;
    default:
      return edit.kind;
  }
}

export function EditListItem({ edit, index, active, onRevert, onUndoTo }: EditListItemProps) {
  const { t } = useI18n();
  const step = index + 1;

  return (
    <li
      data-testid="edit-list-item"
      data-history-state={active ? 'active' : 'redo'}
      style={{ opacity: active ? 1 : 0.55 }}
    >
      <div>
        <strong>{edit.kind}</strong>{' '}
        {active ? t('sandbox.edits.item.step', { step }) : t('sandbox.edits.item.redo')}
      </div>
      <div>{editSubtitle(edit)}</div>
      {active ? (
        <div>
          <button
            aria-label={t('sandbox.edits.item.revert.label', { step })}
            data-testid={`sandbox-edits-revert-${step}`}
            onClick={() => onRevert(index)}
          >
            {t('sandbox.edits.item.revert.text')}
          </button>
          <button
            aria-label={t('sandbox.edits.item.undoTo.label', { step })}
            onClick={() => onUndoTo(index)}
          >
            {t('sandbox.edits.item.undoTo.text')}
          </button>
        </div>
      ) : null}
    </li>
  );
}
