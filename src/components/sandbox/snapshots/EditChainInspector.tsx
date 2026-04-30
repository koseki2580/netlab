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

  if (diverged) {
    return (
      <p>Snapshots are on different branches - revert to a common ancestor to compare linearly</p>
    );
  }

  if (fromIndex > toIndex) {
    return <p>Snapshot B precedes A</p>;
  }

  const edits = sandbox.session.backing.slice(fromIndex, toIndex);

  if (edits.length === 0) {
    return <p>No differences</p>;
  }

  return (
    <section aria-label="Edit chain between snapshots">
      <h3 style={{ margin: '0 0 6px', fontSize: 13 }}>Edit chain</h3>
      <ol style={{ margin: 0, paddingLeft: 18 }}>
        {edits.map((edit, index) => (
          <li key={`${fromIndex + index}-${edit.kind}`}>{labelFor(edit)}</li>
        ))}
      </ol>
    </section>
  );
}
