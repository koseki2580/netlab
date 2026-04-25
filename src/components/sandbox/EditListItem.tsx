import type { Edit } from '../../sandbox/edits';

export interface EditListItemProps {
  readonly edit: Edit;
  readonly index: number;
  readonly active: boolean;
  readonly onRevert: (index: number) => void;
  readonly onUndoTo: (index: number) => void;
}

function editSubtitle(edit: Edit): string {
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
  const step = index + 1;

  return (
    <li
      data-testid="edit-list-item"
      data-history-state={active ? 'active' : 'redo'}
      style={{ opacity: active ? 1 : 0.55 }}
    >
      <div>
        <strong>{edit.kind}</strong> {active ? `Step ${step}` : 'Redo'}
      </div>
      <div>{editSubtitle(edit)}</div>
      {active ? (
        <div>
          <button aria-label={`Revert edit ${step}`} onClick={() => onRevert(index)}>
            Revert
          </button>
          <button aria-label={`Undo to edit ${step}`} onClick={() => onUndoTo(index)}>
            Undo to here
          </button>
        </div>
      ) : null}
    </li>
  );
}
